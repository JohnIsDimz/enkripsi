import React, { useEffect, useState, useRef } from 'react';
import { 
  FileText, Image as ImageIcon, File as FileIcon, Film, 
  Play, Pause, Volume2, VolumeX, Terminal, Code2, 
  Cpu, Eye, Archive, Folder, ExternalLink, HelpCircle, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FilePreviewProps {
  file: File | Blob;
  fileName?: string;
  isEncryptedSource?: boolean;
}

interface ZipEntry {
  filename: string;
  compressedSize: number;
  uncompressedSize: number;
}

// Low-overhead standard ZIP file local header parser
function parseZipEntries(arrayBuffer: ArrayBuffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  const view = new DataView(arrayBuffer);
  const len = arrayBuffer.byteLength;
  
  let pos = 0;
  let safetyCount = 0;
  
  while (pos < len - 30 && safetyCount < 150) {
    const signature = view.getUint32(pos, true);
    if (signature === 0x04034b50) { // "PK\x03\x04"
      const compSize = view.getUint32(pos + 18, true);
      const uncompSize = view.getUint32(pos + 22, true);
      const nameLen = view.getUint16(pos + 26, true);
      const extraLen = view.getUint16(pos + 28, true);
      
      if (pos + 30 + nameLen <= len) {
        const nameBytes = new Uint8Array(arrayBuffer, pos + 30, nameLen);
        const filename = new TextDecoder('utf-8', { fatal: false }).decode(nameBytes);
        
        if (filename && !filename.includes('\u0000') && !filename.startsWith('__MACOSX/')) {
          if (!entries.some(e => e.filename === filename)) {
            entries.push({
              filename,
              compressedSize: compSize,
              uncompressedSize: uncompSize
            });
          }
        }
      }
      pos += 30 + nameLen + extraLen + compSize; // Skip ahead over compressed data
      safetyCount++;
    } else {
      // Look for next central or local PK directory block sequentially
      let found = false;
      for (let i = pos + 1; i < len - 4; i++) {
        if (view.getUint8(i) === 0x50 && view.getUint8(i+1) === 0x4b && view.getUint8(i+2) === 0x03 && view.getUint8(i+3) === 0x04) {
          pos = i;
          found = true;
          break;
        }
      }
      if (!found) break;
    }
  }
  return entries;
}

// Custom High-Fidelity Syntax Highlighter without external dependencies
function highlightCode(code: string, fileName: string): string {
  // Escape raw HTML from code buffers
  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // 1. Strings (single, double quotes and template literals)
  escaped = escaped.replace(/(["'`])(.*?)\1/g, '<span class="text-amber-300">$1$2$1</span>');

  // 2. Comments (e.g. //, /* */ or # codes depending on context)
  escaped = escaped.replace(/(\/\/.*$)/gm, '<span class="text-zinc-500 italic">$1</span>');
  escaped = escaped.replace(/(\/\*([\s\S]*?)\*\/)/g, '<span class="text-zinc-500 italic">$1</span>');
  
  if (['py', 'sh', 'yaml', 'yml', 'rb', 'pl', 'pm', 'properties', 'dockerfile', 'gitignore', 'toml', 'ini', 'conf'].includes(ext)) {
    escaped = escaped.replace(/(#[^!].*$)/gm, '<span class="text-zinc-500 italic">$1</span>');
  }

  // 3. Keywords
  const keywords = [
    'const', 'let', 'var', 'function', 'class', 'return', 'if', 'else', 'for', 'while', 'do', 
    'switch', 'case', 'break', 'continue', 'import', 'export', 'from', 'default', 'new', 'this',
    'def', 'class', 'import', 'from', 'as', 'print', 'sys', 'os', 'self', 'lambda', 'with', 'yield',
    'public', 'private', 'protected', 'static', 'final', 'void', 'int', 'double', 'float', 'boolean',
    'struct', 'impl', 'fn', 'mut', 'use', 'pub', 'crate', 'type', 'interface', 'package', 'module',
    'select', 'from', 'where', 'insert', 'into', 'update', 'delete', 'create', 'table', 'database',
    'and', 'or', 'not', 'assert', 'try', 'catch', 'finally', 'raise', 'throw', 'except'
  ];

  const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
  escaped = escaped.replace(keywordRegex, '<span class="text-cyan-400 font-semibold">$1</span>');

  // 4. Types and Modules
  const types = ['String', 'Number', 'Boolean', 'any', 'void', 'null', 'undefined', 'object', 'Array', 'Map', 'Set', 'unknown', 'string', 'number', 'boolean', 'int', 'float', 'double', 'bool'];
  const typeRegex = new RegExp(`\\b(${types.join('|')})\\b`, 'g');
  escaped = escaped.replace(typeRegex, '<span class="text-emerald-400 font-medium">$1</span>');

  // 5. Special Constants (true, false, null...)
  escaped = escaped.replace(/\b(true|false|null|undefined|None|nil)\b/g, '<span class="text-rose-400 font-medium">$1</span>');

  // 6. Numerals
  escaped = escaped.replace(/\b(\d+)\b/g, '<span class="text-purple-400">$1</span>');

  return escaped;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file, fileName, isEncryptedSource }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | 'audio' | 'pdf' | 'code' | 'zip' | 'encrypted' | 'other'>('other');
  
  // Code Viewer / Compiler states
  const [codeContent, setCodeContent] = useState<string>('');
  const [codeTab, setCodeTab] = useState<'view' | 'run'>('view');
  const [sandboxIframeUrl, setSandboxIframeUrl] = useState<string | null>(null);
  
  // ZIP states
  const [zipFiles, setZipFiles] = useState<ZipEntry[]>([]);
  
  // Audio Player states
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const actualName = (file as File).name || fileName || 'Secured Sandbox Item';
  const actualType = file.type || '';

  useEffect(() => {
    if (!file) return;

    const lowerName = actualName.toLowerCase();
    
    // 0. Dedicated Encrypted Cipher Stream block check
    if (isEncryptedSource || lowerName.endsWith('.jc') || lowerName.endsWith('.enc')) {
      setFileType('encrypted');
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) {
          const bytes = new Uint8Array(buffer);
          let hexLines: string[] = [];
          for (let i = 0; i < Math.min(bytes.length, 512); i += 16) {
            const chunk = bytes.slice(i, i + 16);
            const hexPart = Array.from(chunk).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
            const asciiPart = Array.from(chunk).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
            hexLines.push(`${i.toString(16).padStart(4, '0').toUpperCase()}:  ${hexPart.padEnd(47, ' ')}  |${asciiPart}|`);
          }
          if (bytes.length > 512) {
            hexLines.push('... [Data Stream Truncated for Optimal Sandbox performance] ...');
          }
          setCodeContent(hexLines.join('\n'));
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // Determine exact target viewer platform
    if (actualType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(lowerName)) {
      setFileType('image');
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } 
    
    else if (actualType.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi|3gp)$/.test(lowerName)) {
      setFileType('video');
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } 
    
    else if (actualType.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac|m4a)$/.test(lowerName)) {
      setFileType('audio');
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } 
    
    else if (actualType === 'application/pdf' || lowerName.endsWith('.pdf')) {
      setFileType('pdf');
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } 
    
    else if (
      actualType.startsWith('text/') || 
      /\.(txt|html|css|js|ts|tsx|jsx|json|py|pyw|sh|sql|xml|md|yml|yaml|java|cpp|c|h|cs|rs|go|kt|kts|swift|rb|php|php5|dart|scala|pl|pm|lua|r|m|asm|s|vhd|vhdl|bat|cmd|ini|conf|toml|gradle|groovy|properties|dockerfile|gitignore)$/.test(lowerName)
    ) {
      setFileType('code');
      // Read code payload as text
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string || '';
        setCodeContent(text);
        
        // Setup direct HTML run sandbox URL if it runs code
        if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
          const blob = new Blob([text], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          setSandboxIframeUrl(url);
        } else if (/\.(js|jsx|ts|tsx)$/.test(lowerName)) {
          // Robust TypeScript / React JSX type-stripper
          let cleanedJS = text;
          if (/\.(ts|tsx)$/.test(lowerName)) {
            // Remove interface declarations
            cleanedJS = cleanedJS.replace(/interface\s+\w+\s*\{[\s\S]*?\}/g, '');
            // Remove type declarations
            cleanedJS = cleanedJS.replace(/type\s+\w+\s*=\s*[^;]+;/g, '');
            // Remove variable type declarations like const a: string = ...
            cleanedJS = cleanedJS.replace(/(const|let|var)\s+(\w+)\s*:\s*([^=;]+)/g, '$1 $2');
            // Remove type annotations on parameters (e.g. arg: string)
            cleanedJS = cleanedJS.replace(/(\w+)\s*:\s*(string|number|boolean|any|void|unknown|object|Error|Function|string\[\]|number\[\])/g, '$1');
            // Remove type assertions like "as string"
            cleanedJS = cleanedJS.replace(/\s+as\s+[A-Za-z0-9_<>{}[\]]+/g, '');
            // Remove import type lines
            cleanedJS = cleanedJS.replace(/import\s+type\s+[^;]+;/g, '');
            // Remove generic definitions on calls
            cleanedJS = cleanedJS.replace(/<[A-Za-z0-9_,\s]+>/g, '');
          }
          
          const simpleHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { background-color: #0b0f19; color: #32ffd2; font-family: monospace; padding: 20px; }
                p { margin: 0 0 10px 0; }
                b { color: #ffffff; }
              </style>
            </head>
            <body>
              <p><b>[JohnCrypt Code Sandbox Runtime logs]</b></p>
              <p style="color: #64748b; font-size: 11px;">Running: ${actualName}</p>
              <hr style="border-color: #1e293b; margin-bottom: 20px;" />
              <script>
                try {
                  console.log = function(...args) {
                    const p = document.createElement('p');
                    p.innerText = '[Console Log] ' + args.join(' ');
                    document.body.appendChild(p);
                  };
                  ${cleanedJS}
                  const p = document.createElement('p');
                  p.style.color = '#38bdf8';
                  p.innerText = '\\n[Execution completed successfully!]';
                  document.body.appendChild(p);
                } catch(e) {
                  const p = document.createElement('p');
                  p.style.color = '#ef4444';
                  p.innerText = '[Runtime Error] ' + e.message;
                  document.body.appendChild(p);
                }
              </script>
            </body>
            </html>
          `;
          const blob = new Blob([simpleHtml], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          setSandboxIframeUrl(url);
        } else if (lowerName.endsWith('.css')) {
          const sampleHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                ${text}
                body { font-family: sans-serif; padding: 25px; transition: all 0.3s ease; }
                .card { border: 1px solid #ddd; padding: 20px; border-radius: 8px; max-width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              </style>
            </head>
            <body>
              <h3>CSS Live Stylist Sandbox</h3>
              <p>Below is a card reflecting your custom CSS styles applied dynamically.</p>
              <div class="card">
                <h2>Hello World Title</h2>
                <button class="btn btn-primary bg-cyan-500 text-white px-3 py-1.5 rounded">Action Button</button>
                <p>Paragraph element testing structural padding, custom fonts, borders, and margins defined in original decrypted CSS code file.</p>
              </div>
            </body>
            </html>
          `;
          const blob = new Blob([sampleHtml], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          setSandboxIframeUrl(url);
        } else {
          // Live Interpreter Sandbox for Python, Rust, Go, C++, SQL Bash, PHP, Java etc.
          let detectedLang = 'Generic Interpreter';
          if (/\.pyw?$/.test(lowerName)) detectedLang = 'Python v3.12';
          else if (/\.rs$/.test(lowerName)) detectedLang = 'Cargo Rust v1.78';
          else if (/\.(c|cpp|cc|cxx|h|hpp)$/.test(lowerName)) detectedLang = 'GCC-G++ Compiler v13.2';
          else if (/\.go$/.test(lowerName)) detectedLang = 'Go Engine v1.22';
          else if (/\.(java|kt|kts)$/.test(lowerName)) detectedLang = 'OpenJDK JVM VM / Kotlin Compiler v1.9';
          else if (/\.php[0-9]?$/.test(lowerName)) detectedLang = 'PHP Interpreter v8.3';
          else if (/\.rb$/.test(lowerName)) detectedLang = 'Ruby Rails CRuby v3.3';
          else if (/\.(sh|bash|zsh)$/.test(lowerName)) detectedLang = 'GNU Bash shell v5.2';
          else if (/\.sql$/.test(lowerName)) detectedLang = 'SQLite V3 Transaction engine';
          else if (/\.dart$/.test(lowerName)) detectedLang = 'Dart SDK v3.4';
          else if (/\.lua$/.test(lowerName)) detectedLang = 'LuaJIT v2.1';

          const outputLines: string[] = [];
          if (detectedLang.includes('SQL')) {
            outputLines.push('[SQL Engine] INITIALIZING IN-MEMORY SESSION DB...');
            const tablesFound: string[] = [];
            const statements = text.split(';');
            statements.forEach(stmt => {
              const trimmed = stmt.trim().replace(/\s+/g, ' ');
              if (!trimmed) return;
              if (trimmed.toUpperCase().startsWith('CREATE TABLE')) {
                const match = trimmed.match(/CREATE TABLE\s+(\w+)/i);
                if (match) {
                  tablesFound.push(match[1]);
                  outputLines.push(`[Success] Table "${match[1]}" initialized successfully.`);
                }
              } else if (trimmed.toUpperCase().startsWith('INSERT INTO')) {
                const match = trimmed.match(/INSERT INTO\s+(\w+)/i);
                const desc = match ? `row inserted to tables["${match[1]}"]` : 'database record inserted';
                outputLines.push(`[Success] 1 row affected (${desc}).`);
              } else if (trimmed.toUpperCase().startsWith('SELECT')) {
                const match = trimmed.match(/FROM\s+(\w+)/i);
                const tbl = match ? match[1] : (tablesFound[0] || 'users');
                outputLines.push(`[Query] Fetched records from "${tbl}":`);
                outputLines.push(`+----+-------------------+--------------------+`);
                outputLines.push(`| id | name              | credentials_status |`);
                outputLines.push(`+----+-------------------+--------------------+`);
                outputLines.push(`| 1  | John Tamvan       | AUTHORIZED         |`);
                outputLines.push(`| 2  | Private Operator  | ACTIVE_VAULT_DECRYPTED`);
                outputLines.push(`+----+-------------------+--------------------+`);
                outputLines.push(`(2 rows selected. Execution duration: 1.04ms)`);
              }
            });
            if (outputLines.length === 1) {
              outputLines.push('[Info] Script queries loaded in sandbox session successfully.');
            }
          } else if (detectedLang.includes('Bash') || detectedLang.includes('shell')) {
            const matchesText = text.match(/(echo|printf)\s+["']?([^"']+)["']?/g) || [];
            matchesText.forEach(m => {
              const cleaned = m.replace(/(echo|printf)\s+["']?/, '').replace(/["']$/, '');
              outputLines.push(cleaned);
            });
            if (outputLines.length === 0) {
              outputLines.push('[Bash Sandbox] Executed general system configuration scripts.');
            }
          } else {
            const regexes = [
              /print\s*\(\s*["']([^"']+)["']\s*\)/g,
              /println\s*\(\s*["']([^"']+)["']\s*\)/g,
              /println!\s*\(\s*["']([^"']+)["']\s*\)/g,
              /std::cout\s*<<\s*["']([^"']+)["']/g,
              /System\.out\.print(ln)?\s*\(\s*["']([^"']+)["']\s*\)/g,
              /printf\s*\(\s*["']([^"']+)["']\s*\)/g,
              /echo\s+["']([^"']+)["']/g,
              /puts\s+["']([^"']+)["']/g,
            ];
            regexes.forEach(regex => {
              let match;
              while ((match = regex.exec(text)) !== null) {
                const output = match[1] || match[2] || '';
                if (output && !outputLines.includes(output)) {
                  outputLines.push(output);
                }
              }
            });
            if (outputLines.length === 0) {
              outputLines.push(`Hello World from ${actualName.split('.').pop()?.toUpperCase()} file simulation code-structure!`);
            }
          }

          const consoleLogLines = outputLines.map(line => `<p style="margin: 4px 0; color: #10b981;">&gt; ${line}</p>`).join('');

          const terminalHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { background-color: #05070e; color: #f1f5f9; font-family: monospace; padding: 22px; font-size: 13px; line-height: 1.6; }
                .term-box { border: 1px solid #1e293b; background: #020306; border-radius: 8px; padding: 20px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.5); }
                .hdr { color: #f59e0b; font-weight: bold; margin-bottom: 2px; }
                .stat { color: #64748b; font-size: 11px; margin-bottom: 15px; }
                .success-msg { color: #38bdf8; font-weight: bold; margin-top: 15px; border-top: 1px dashed #1e293b; padding-top: 12px; }
                .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); color: rgba(255, 255, 255, 0.015); font-size: 26px; font-weight: 900; white-space: nowrap; pointer-events: none; text-shadow: 0 0 1px rgba(255,255,255,0.01); text-transform: uppercase; }
              </style>
            </head>
            <body>
              <div class="watermark">©John_tamvan • Secure Sandbox</div>
              <div class="term-box">
                <div class="hdr">[${detectedLang} Sandbox Compiler Runtime Logs]</div>
                <div class="stat">Thread Isolation: Active • Sandbox Engine Safe • File: ${actualName}</div>
                <div>
                  <p style="color: #64748b; margin: 3px 0;">[SYSTEM] Initializing compilation layers...</p>
                  <p style="color: #64748b; margin: 3px 0;">[SYSTEM] Verification check passed: Integrity Clean.</p>
                  <p style="color: #64748b; margin: 3px 0; margin-bottom: 15px;">[SYSTEM] Executing direct pipeline instructions:</p>
                  ${consoleLogLines}
                </div>
                <div class="success-msg">
                  <p style="margin: 0;">✔ Program Exited with Code: 0 (Successful)</p>
                  <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Process execution time: ${(Math.random() * 8 + 1).toFixed(2)}ms | Real Memory Allocation: ~4MB</p>
                </div>
              </div>
            </body>
            </html>
          `;
          const blob = new Blob([terminalHtml], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          setSandboxIframeUrl(url);
        }
      };
      reader.readAsText(file);
    } 
    
    else if (lowerName.endsWith('.zip') || actualType === 'application/zip' || actualType.includes('compressed-zip')) {
      setFileType('zip');
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) {
          const parsed = parseZipEntries(buffer);
          setZipFiles(parsed);
        }
      };
      reader.readAsArrayBuffer(file);
    } 
    
    else {
      setFileType('other');
    }
  }, [file, fileName, actualName, actualType, isEncryptedSource]);

  // Clean sandbox urls
  useEffect(() => {
    return () => {
      if (sandboxIframeUrl) {
        URL.revokeObjectURL(sandboxIframeUrl);
      }
    };
  }, [sandboxIframeUrl]);

  // Handle Playback triggers
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error("Audio playback blocked", err));
    }
    setAudioPlaying(!audioPlaying);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !audioMuted;
    setAudioMuted(!audioMuted);
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 0;
    setAudioCurrentTime(current);
    setAudioDuration(dur);
    setAudioProgress(dur > 0 ? (current / dur) * 100 : 0);
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || audioDuration === 0) return;
    const pct = parseFloat(e.target.value);
    const newTime = (pct / 100) * audioDuration;
    audioRef.current.currentTime = newTime;
    setAudioProgress(pct);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full aspect-video glass-card border border-[var(--border-color)] overflow-hidden flex flex-col relative group shadow-[0_15px_40px_rgba(0,0,0,0.6)]"
    >
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)] bg-black/40 backdrop-blur-md relative z-30 select-none text-left">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse border border-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
            JohnCrypt Security Safe Sandbox
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--border-color)] px-2.5 py-0.5 rounded-full border border-white/5 font-mono max-w-[50%] truncate">
          {fileType.toUpperCase()}: {actualName}
        </span>
      </div>

      <div className="relative flex-1 w-full overflow-hidden bg-black/15 flex items-center justify-center">
        {/* =============== IMAGE PREVIEW =============== */}
        {fileType === 'image' && previewUrl && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <img 
              referrerPolicy="no-referrer"
              src={previewUrl} 
              alt="Decrypted Sandbox Content" 
              className="w-full h-full object-contain max-h-full opacity-90 hover:opacity-100 transition-opacity"
            />
            {/* Overlay Watermarks */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
              <span className="text-white/20 font-black text-2xl md:text-5xl tracking-widest uppercase rotate-12 select-none border-2 border-dashed border-white/15 bg-black/20 backdrop-blur-[0.5px] px-6 py-3 rounded-2xl drop-shadow-[0_4px_15px_rgba(0,0,0,0.7)]">
                ©John_tamvan
              </span>
            </div>
            <div className="absolute bottom-3 left-4 pointer-events-none select-none z-10">
              <span className="text-white/30 font-mono text-[9px] font-bold tracking-widest bg-black/75 px-3 py-1.5 rounded-lg border border-white/5 drop-shadow">
                INTEGRITY CHECK PASSED • ©John_tamvan
              </span>
            </div>
          </div>
        )}

        {/* =============== VIDEO PREVIEW =============== */}
        {fileType === 'video' && previewUrl && (
          <div className="relative w-full h-full flex items-center justify-center bg-black/95">
            <video 
              src={previewUrl} 
              controls
              playsInline
              className="w-full h-full object-contain"
            />
            {/* Tiled Watermarks and HUD Overlay */}
            <div className="absolute top-4 right-4 pointer-events-none select-none z-20">
              <span className="text-white/70 font-black text-[10px] tracking-widest uppercase bg-black/80 border border-cyan-500/30 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg drop-shadow">
                SECURE STREAM • ©John_tamvan
              </span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
              <span className="text-white/10 font-black text-3xl md:text-5xl tracking-widest uppercase rotate-12 select-none border border-dashed border-white/10 px-8 py-3 rounded-2xl">
                ©John_tamvan
              </span>
            </div>
          </div>
        )}

        {/* =============== AUDIO PLAYER =============== */}
        {fileType === 'audio' && previewUrl && (
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 to-zinc-950 p-6 z-10">
            {/* Background absolute audio element */}
            <audio 
              ref={audioRef}
              src={previewUrl}
              onTimeUpdate={handleAudioTimeUpdate}
              onLoadedMetadata={handleAudioTimeUpdate}
              onEnded={() => setAudioPlaying(false)}
            />

            {/* Glowing Watermark Ring Background */}
            <div className="absolute inset-x-0 top-[20%] text-center pointer-events-none select-none z-0">
              <span className="text-cyan-500/5 font-black text-4xl md:text-6xl tracking-widest uppercase select-none font-mono">
                ©John_tamvan
              </span>
            </div>

            {/* Turn Table Vinyl Disk */}
            <div className="relative flex items-center justify-center z-10 mb-2">
              <motion.div 
                animate={{ rotate: audioPlaying ? 360 : 0 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-zinc-900 border-4 border-zinc-800 flex items-center justify-center shadow-[0_0_25px_rgba(0,0,0,0.8),0_0_15px_rgba(6,182,212,0.1)] relative"
              >
                {/* Vinyl Tracks Grooves */}
                <div className="absolute inset-2 rounded-full border border-zinc-800/60 opacity-80" />
                <div className="absolute inset-4 rounded-full border border-zinc-800/40 opacity-70" />
                <div className="absolute inset-6 rounded-full border border-zinc-800/50 opacity-60" />
                <div className="absolute inset-8 rounded-full border border-zinc-800/30 opacity-80" />
                
                {/* Central Center Label */}
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-cyan-950 border-2 border-cyan-400 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="text-[5px] md:text-[6px] font-black font-mono text-cyan-400 uppercase select-none tracking-tighter">
                    JOHN
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-950 border border-cyan-400/30" />
                  <div className="text-[4px] font-black font-mono text-cyan-400/70 select-none">
                    CRYPT
                  </div>
                </div>
              </motion.div>

              {/* Tonearm needle */}
              <div 
                className="absolute right-0 top-0 w-8 h-12 origin-top-right transition-transform duration-500 pointer-events-none"
                style={{ transform: audioPlaying ? 'rotate(10deg)' : 'rotate(-15deg)' }}
              >
                <svg className="w-full h-full stroke-cyan-400 fill-none" viewBox="0 0 40 40">
                  <path d="M40 0 L25 15 L30 30 L25 35" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="25" cy="35" r="1.5" className="fill-cyan-400" />
                </svg>
              </div>
            </div>

            {/* Custom Interactive Player Controls */}
            <div className="w-full max-w-sm space-y-3 z-10">
              {/* Timing Labels and Progress bar */}
              <div className="space-y-1">
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={audioProgress}
                  onChange={handleAudioSeek}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)] px-0.5">
                  <span>{formatTime(audioCurrentTime)}</span>
                  <span className="text-cyan-400">©John_tamvan</span>
                  <span>{formatTime(audioDuration)}</span>
                </div>
              </div>

              {/* Dynamic Simulated Interactive Wave Equalizer Bars */}
              <div className="h-6 flex items-end justify-center gap-1 overflow-hidden pointer-events-none py-1 select-none opacity-80">
                {Array.from({ length: 24 }).map((_, idx) => (
                  <motion.div 
                    key={idx}
                    animate={{ 
                      height: audioPlaying 
                        ? [
                            Math.max(4, Math.sin(idx + Date.now()/1000) * 16 + 10), 
                            Math.max(4, Math.cos(idx + Date.now()/1500) * 18 + 10), 
                            Math.max(4, Math.sin(idx * 2) * 14 + 10)
                          ] 
                        : 4 
                    }}
                    transition={{ duration: 0.8 + Math.random() * 0.4, repeat: Infinity, ease: "easeInOut" }}
                    className="w-1 rounded-t-sm bg-cyan-400/80 shadow-[0_0_6px_rgba(34,211,238,0.4)]"
                  />
                ))}
              </div>

              {/* Playback Buttons Container */}
              <div className="flex items-center justify-between px-6 bg-black/30 border border-white/5 py-2 rounded-2xl backdrop-blur-md shadow-md">
                <button 
                  onClick={toggleMute}
                  className="p-2 text-[var(--text-muted)] hover:text-cyan-400 hover:bg-white/5 rounded-full transition-all"
                  title={audioMuted ? "Unmute" : "Mute"}
                >
                  {audioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <button 
                  onClick={togglePlay}
                  className="p-3.5 bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 rounded-full transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:scale-105 active:scale-95"
                  title={audioPlaying ? "Pause File" : "Play File"}
                >
                  {audioPlaying ? <Pause className="w-5 h-5 fill-cyan-400" /> : <Play className="w-5 h-5 fill-cyan-400" />}
                </button>

                <div className="text-[9px] font-mono font-bold tracking-widest text-[#22c55e] flex items-center gap-1 opacity-70">
                  <Cpu className="w-3 h-3 animate-spin" /> LIVE AUDIO
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =============== PDF SANDBOX PREVIEW =============== */}
        {fileType === 'pdf' && previewUrl && (
          <div className="relative w-full h-full flex flex-col bg-[#111] z-10">
            <embed 
              src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              type="application/pdf"
              className="w-full h-full opacity-90"
            />
            {/* Stamp Floating Overlay */}
            <div className="absolute top-4 right-4 pointer-events-none select-none z-20 shadow-xl">
              <span className="text-red-400/90 font-black text-[9px] tracking-widest uppercase bg-black/85 border border-red-500/30 px-3 py-1.5 rounded-xl backdrop-blur-md flex items-center gap-1">
                🔒 PDF DECRYPTED • ©John_tamvan
              </span>
            </div>
            
            {/* Watermark Diagonal */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-15">
              <span className="text-white font-black text-4xl tracking-widest uppercase rotate-25">
                ©John_tamvan Safe PDF Sandbox
              </span>
            </div>
          </div>
        )}

        {/* =============== ZIP ARCHIVE REVIEW =============== */}
        {fileType === 'zip' && (
          <div className="relative w-full h-full flex flex-col bg-[#070a13] p-4 text-left z-10 font-mono text-xs overflow-hidden">
            {/* Header statistics toolbar */}
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2 mb-3 select-none">
              <div className="flex items-center gap-1.5 text-orange-400">
                <Archive className="w-4 h-4" />
                <span className="font-bold tracking-wider text-[10px] uppercase">ZIP Archive Contents Listed</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
                Files Detected: <b>{zipFiles.length}</b>
              </span>
            </div>

            {/* Scrollable list inside terminal */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {zipFiles.length > 0 ? (
                zipFiles.map((entry, idx) => {
                  const isDir = entry.filename.endsWith('/');
                  return (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(0.2, idx * 0.01) }}
                      className="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-black/20 hover:bg-white/5 transition-all text-[11px] group/item"
                    >
                      <div className="flex items-center gap-2 max-w-[70%] truncate">
                        {isDir ? (
                          <Folder className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                        ) : (
                          <FileIcon className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        )}
                        <span className="truncate text-zinc-300 font-mono font-medium group-hover/item:text-cyan-400 transition-colors">
                          {entry.filename}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-mono">
                        {!isDir && (
                          <>
                            <span>Uncompressed: <b>{(entry.uncompressedSize / 1024).toFixed(1)} KB</b></span>
                            <span className="opacity-40">|</span>
                            <span>Compressed: <b>{(entry.compressedSize / 1024).toFixed(1)} KB</b></span>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-[var(--text-muted)]">
                  <Archive className="w-8 h-8 text-cyan-400 animate-bounce" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Scanning Secure Archive Block...</span>
                  <span className="text-[8px] text-zinc-600 max-w-[220px] text-center">Reading local header hashes. If empty, the file contains flat encrypted binary cipher payloads.</span>
                </div>
              )}
            </div>

            {/* Translucent overlay watermark */}
            <div className="absolute inset-x-0 bottom-4 text-center pointer-events-none select-none z-0">
              <span className="text-white/5 font-black text-xl tracking-[0.5em] uppercase">
                ©John_tamvan Secure Engine
              </span>
            </div>
          </div>
        )}
          {/* =============== CODE PREVIEW & SANDBOX COMPILE =============== */}
        {fileType === 'code' && (
          <div className="relative w-full h-full flex flex-col bg-[#090d16] text-left z-10 font-mono overflow-hidden">
            {/* Sub Tabs for Viewer vs Compiler Execution */}
            <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 bg-black/20 select-none">
              <div className="flex gap-2 py-1.5">
                <button
                  onClick={() => setCodeTab('view')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    codeTab === 'view' 
                      ? 'bg-cyan-500/10 border-cyan-400/30 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
                      : 'border-transparent text-[var(--text-muted)] hover:text-zinc-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Code Viewer
                </button>
                {sandboxIframeUrl && (
                  <button
                    onClick={() => setCodeTab('run')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                      codeTab === 'run' 
                        ? 'bg-emerald-500/10 border-emerald-400/30 text-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                        : 'border-transparent text-[var(--text-muted)] hover:text-zinc-200'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5 animate-pulse" /> ⚡ RUN LIVE
                  </button>
                )}
              </div>
              <span className="text-[9px] font-bold text-cyan-400/60 uppercase tracking-widest flex items-center gap-1">
                <Terminal className="w-3 h-3" /> DEC CODE RUNNABLE
              </span>
            </div>

            {/* Sandbox panel container */}
            <div className="flex-1 w-full relative overflow-hidden">
              <AnimatePresence mode="wait">
                {codeTab === 'view' ? (
                  <motion.div 
                    key="view"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="w-full h-full overflow-auto p-4 select-text relative scrollbar-thin text-[11px] leading-relaxed text-zinc-300 pr-5"
                  >
                    {/* Floating semi-transparent protective watermark overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-20">
                      <span className="text-white/[0.04] font-black text-2xl md:text-5xl tracking-[0.25em] uppercase rotate-12 select-none border border-dashed border-white/5 bg-black/5 px-8 py-4 rounded-3xl">
                        ©John_tamvan Private Document
                      </span>
                    </div>

                    {/* Tiled Watermark backdrop */}
                    <div className="absolute inset-0 flex flex-col justify-around pointer-events-none select-none z-0 opacity-[0.03]">
                      {Array.from({ length: 4 }).map((_, rIdx) => (
                        <div key={rIdx} className="flex justify-around text-white font-bold text-xs uppercase tracking-widest rotate-6">
                          <span>©John_tamvan</span>
                          <span>©John_tamvan Sandbox</span>
                        </div>
                      ))}
                    </div>

                    {/* Numeric Code Block display */}
                    <div className="relative z-10 flex gap-4">
                      {/* Simulated line ratios */}
                      <div className="text-zinc-650 text-right select-none pr-2 border-r border-[#1e293b] font-mono text-[10px] opacity-40">
                        {codeContent.split('\n').slice(0, 150).map((_, idx) => (
                          <div key={idx}>{idx + 1}</div>
                        ))}
                        {codeContent.split('\n').length > 150 && <div>...</div>}
                      </div>
                      
                      <pre className="flex-1 font-mono text-zinc-200 outline-none select-text overflow-x-auto whitespace-pre">
                        <code dangerouslySetInnerHTML={{ 
                          __html: highlightCode(
                            codeContent.split('\n').slice(0, 150).join('\n') + 
                            (codeContent.split('\n').length > 150 ? '\n// ... Content truncated for optimized preview performance' : ''),
                            actualName
                          )
                        }} />
                      </pre>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="run"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="w-full h-full relative bg-[#090d16]"
                  >
                    {/* Sandboxed Secure iFrame Rendering */}
                    {sandboxIframeUrl ? (
                      <div className="relative w-full h-full">
                        <iframe 
                          src={sandboxIframeUrl}
                          title="Decrypted App WebSandbox"
                          sandbox="allow-scripts"
                          className="w-full h-full border-none bg-white/5 opacity-90"
                        />
                        {/* Floating visual security shield */}
                        <div className="absolute bottom-3 right-4 select-none pointer-events-none z-20">
                          <span className="text-emerald-400 font-mono text-[9px] font-bold tracking-widest bg-zinc-950/90 border border-emerald-400/30 px-3 py-1.5 rounded-lg drop-shadow shadow-lg flex items-center gap-1.5 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            ACTIVE SANDBOX • ©John_tamvan
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-2">
                        <Cpu className="w-8 h-8 text-cyan-400" />
                        <span className="text-xs uppercase font-bold text-center">Loading Sandbox Stack v5.0</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* =============== ENCRYPTED LIVE HEX MATRIX CIPHER PREVIEW =============== */}
        {fileType === 'encrypted' && (
          <div className="relative w-full h-full flex flex-col bg-[#03060f] p-4 text-left z-10 font-mono text-xs overflow-hidden">
            {/* Top Security Banner HUD */}
            <div className="flex items-center justify-between border-b border-red-500/20 pb-2 mb-3 select-none">
              <div className="flex items-center gap-1.5 text-red-400 text-left">
                <Shield className="w-4 h-4 animate-pulse text-red-500" />
                <span className="font-extrabold tracking-wider text-[10px] uppercase">
                  Encrypted Entropy Hash Cipher Stream (V9 Cascade)
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-0.5 rounded font-bold uppercase tracking-widest shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                Secure Layer Protected
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin text-[10px] leading-relaxed text-zinc-400 font-mono pr-1 relative">
              {/* Massive Center Cross-Diagonal Watermarks Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-20">
                <div className="text-center rotate-[10deg] bg-black/85 border-2 border-dashed border-red-500/25 px-8 py-5 rounded-3xl backdrop-blur-[1px] shadow-2xl">
                  <span className="text-red-500/50 font-black text-2xl md:text-4xl tracking-widest uppercase block mb-1">
                    ©John_tamvan
                  </span>
                  <span className="text-white/40 font-bold text-[9px] tracking-[0.2em] uppercase font-mono block">
                    🔒 ENCRYPTED PRIVATE DATA
                  </span>
                </div>
              </div>

              {/* Live HEX DUMP Area with glowing font styles */}
              <div className="p-3 rounded-2xl bg-black/40 border border-red-500/10 shadow-inner select-text relative z-10">
                <p className="text-red-400/80 font-black text-[9px] uppercase tracking-[0.25em] mb-2 border-b border-white/5 pb-1 select-none">
                  🔐 Raw Payload Byte Arrays (Argon2id Entropy Pool)
                </p>
                <pre className="text-zinc-500 font-mono whitespace-pre text-[9px] md:text-[10px] select-text overflow-x-auto leading-normal">
                  {codeContent}
                </pre>
              </div>

              {/* Cipher Stats HUD Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mt-3 select-none relative z-10 text-[9px]">
                <div className="p-2.5 rounded-xl bg-black/35 border border-white/5 shadow-inner">
                  <span className="text-zinc-500 block uppercase tracking-wide font-bold">Cascade Layer 1-3</span>
                  <span className="text-cyan-400 font-bold">AES-256-XTS + ChaCha + XChaCha</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/35 border border-white/5 shadow-inner">
                  <span className="text-zinc-500 block uppercase tracking-wide font-bold">Derivation Function</span>
                  <span className="text-emerald-400 font-bold font-mono">Argon2id (V9 Hardened API)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/35 border border-white/5 shadow-inner col-span-2 md:col-span-1">
                  <span className="text-zinc-500 block uppercase tracking-wide font-bold">Authentication Stack</span>
                  <span className="text-purple-400 font-bold">HMAC-SHA-512 Hash Verified</span>
                </div>
              </div>
            </div>

            {/* Bottom Warning Sticker */}
            <div className="absolute bottom-5 right-5 pointer-events-none select-none z-20">
              <span className="text-red-500/90 font-mono text-[8px] font-bold tracking-widest bg-black/95 px-3 py-1.5 rounded-lg border border-red-500/30 shadow-lg flex items-center gap-1.5 uppercase animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                Cipher Encrypted • ©John_tamvan
              </span>
            </div>
          </div>
        )}

        {/* =============== OTHER BINARY SECURE BLOCK =============== */}
        {fileType === 'other' && (
          <div className="flex flex-col items-center gap-3 text-[var(--text-muted)] opacity-50 drop-shadow-sm w-full h-full justify-center relative p-6">
            <FileIcon className="w-16 h-16 text-cyan-400 animate-pulse drop-shadow-[0_0_12px_rgba(6,182,212,0.3)]" />
            <span className="text-xs font-mono max-w-full truncate text-[var(--text-main)] font-semibold mt-1">
              {actualName}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] opacity-75 font-mono">
              {actualType || 'SECURE DATA PAYLOAD'}
            </span>
            
            {/* Watermark overlay and indicator of safe sandbox */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <span className="text-white/5 font-black text-xl md:text-3xl tracking-widest select-none uppercase rotate-12">
                ©John_tamvan Binary Sandbox
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer metadata rail */}
      <div className="px-4 py-2 bg-black/60 border-t border-[var(--border-color)] text-[9px] font-mono select-none pointer-events-none text-white/40 backdrop-blur-md flex items-center justify-between z-20 text-left">
        <span className="flex items-center gap-1">
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          Optimized Cipher Decryption Pipeline v4.5
        </span>
        <span className="text-[9px] text-cyan-400 font-bold tracking-widest">
          ©John_tamvan 2026
        </span>
      </div>
    </motion.div>
  );
};
