import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ShieldCheck, Download, RefreshCw, Copy, Check, Github, Mail, MessageCircle, Info, Menu, Sun, Moon, Key, BookOpen, Cpu, FileText, Image, Video, Music, Code2, Archive, Globe } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { FileDropZone } from './components/FileDropZone';
import { PasswordInput } from './components/PasswordInput';
import { FilePreview } from './components/FilePreview';
import { Sidebar } from './components/Sidebar';
import { AboutModal } from './components/AboutModal';
import { saveAs } from 'file-saver';
import { getErrorMessage, DEFAULT_ARGON2_SETTINGS, type Argon2Settings } from './lib/crypto';
import { generateHybridKeyPair, exportKey } from './lib/hybrid-crypto';
import { cryptoWorker } from './lib/worker-client';
import { cn } from './lib/utils';
import { InfoTooltip } from './components/Tooltip';
import { BatchItem, RecentOperation } from './types';

function generateDeviceIdentity(): string {
  const adjectives = ['Quantum', 'Aero', 'Nova', 'Cyber', 'Zephyr', 'Orion', 'Vortex', 'Apex', 'Phantom', 'Nexus', 'Glyph', 'Synapse'];
  const nouns = ['Node', 'Core', 'Vortex', 'Matrix', 'Terminal', 'Sentry', 'Beacon', 'Nexus', 'Protocol', 'Vault', 'Pulse'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}-${noun}-${num}`;
}

function serializeToNumericString(bytes: Uint8Array, format: 'decimal' | 'hex'): string {
  if (format === 'hex') {
    const hexParts = new Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      hexParts[i] = bytes[i].toString(16).toUpperCase().padStart(2, '0');
    }
    return hexParts.join(' ');
  } else {
    return Array.from(bytes).join(' ');
  }
}

function parseNumericString(text: string): Uint8Array {
  const trimmed = text.trim();
  if (trimmed.length === 0) return new Uint8Array(0);
  
  const parts = trimmed.split(/[\s,]+/);
  const bytes = new Uint8Array(parts.length);
  
  const firstPart = parts[0] || '';
  const isHex = /[a-fA-F]/.test(trimmed) || (firstPart.length === 2 && /^[0-9a-fA-F]{2}$/.test(firstPart));
  
  const radix = isHex ? 16 : 10;
  for (let i = 0; i < parts.length; i++) {
    const parsed = parseInt(parts[i], radix);
    bytes[i] = isNaN(parsed) ? 0 : parsed;
  }
  return bytes;
}

export default function App() {
  const [queue, setQueue] = useState<BatchItem[]>([]);
  const [password, setPassword] = useState('');
  const [numericCipherType, setNumericCipherType] = useState<'off' | 'decimal' | 'hex'>('off');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [cryptoType, setCryptoType] = useState<'symmetric' | 'hybrid' | 'turbo'>('symmetric');
  const [result, setResult] = useState<{ blob: Blob; name: string; signatureVerified?: boolean; watermark?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const [recentOperations, setRecentOperations] = useState<RecentOperation[]>(() => {
    try {
      const stored = localStorage.getItem('johncrypt_recent_ops');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [deviceIdentity] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('johncrypt_device_id');
      if (stored) return stored;
      const generated = generateDeviceIdentity();
      localStorage.setItem('johncrypt_device_id', generated);
      return generated;
    } catch {
      return 'Quantum-Node-7777';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('johncrypt_recent_ops', JSON.stringify(recentOperations));
    } catch (err) {
      console.error('Failed to save recent operations history:', err);
    }
  }, [recentOperations]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error || event.message);
      toast.error('A system error occurred. Please refresh the page if the issue persists.');
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      const reason = event.reason;
      
      let message = 'An unexpected operation failure occurred.';
      if (reason) {
        if (typeof reason === 'string') {
          message = reason;
        } else if (reason.message) {
          message = reason.message;
        } else if (reason.name) {
          message = `${reason.name}: ${reason.message || 'No message provided'}`;
        } else {
          try {
            message = typeof reason === 'object' ? JSON.stringify(reason) : String(reason);
          } catch (e) {
            message = String(reason);
          }
        }
      }
      
      if (!message || message.trim() === '' || message === 'undefined' || message === 'null' || message === '[object Object]') {
        message = 'Unknown system error';
      }
      
      toast.error(`System Error: ${message}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('thenacrypt-theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('thenacrypt-theme', theme);
  }, [theme]);
  
  // Hybrid Keys
  const [publicKey, setPublicKey] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [signingKey, setSigningKey] = useState<string>('');
  const [verifyKey, setVerifyKey] = useState<string>('');
  const [symmetricKey, setSymmetricKey] = useState<string>('');
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [argon2Settings, setArgon2Settings] = useState<Argon2Settings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('thenacrypt-argon2-settings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return DEFAULT_ARGON2_SETTINGS;
        }
      }
    }
    return DEFAULT_ARGON2_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('thenacrypt-argon2-settings', JSON.stringify(argon2Settings));
  }, [argon2Settings]);

  const handleGenerateKeys = async () => {
    setIsGeneratingKeys(true);
    try {
      const { encryption, signing } = await generateHybridKeyPair();
      const pub = await exportKey(encryption.publicKey);
      const priv = await exportKey(encryption.privateKey);
      const sign = await exportKey(signing.privateKey);
      const verify = await exportKey(signing.publicKey);
      
      setPublicKey(pub);
      setPrivateKey(priv);
      setSigningKey(sign);
      setVerifyKey(verify);
      
      toast.success('RSA-4096 Encryption & Signing keys generated!');
    } catch (e) {
      toast.error('Failed to generate keys.');
    } finally {
      setIsGeneratingKeys(false);
    }
  };

  const handleGenerateSymmetricKey = () => {
    const bytes = window.crypto.getRandomValues(new Uint8Array(32));
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    setSymmetricKey(hex);
    toast.success('256-bit symmetric key successfully generated!');
  };

  const handleFilesSelect = (newFiles: File[]) => {
    const items: BatchItem[] = newFiles.map(f => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f,
      status: 'queued',
      progress: 0
    }));
    setQueue(prev => [...prev, ...items]);
  };

  const handleRemoveItem = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const handleClearQueue = () => {
    setQueue([]);
    setProgress(0);
    setResult(null);
  };

  const handleDownloadItem = (item: BatchItem) => {
    if (item.resultBlob && item.resultName) {
      try {
        saveAs(item.resultBlob, item.resultName);
      } catch (error) {
        console.error('Download error:', error);
        toast.error('Download failed. Please check browser settings.');
      }
    }
  };

  const handleProcess = async () => {
    if (queue.length === 0) {
      toast.error('Please select files first');
      return;
    }

    if ((cryptoType === 'symmetric' || cryptoType === 'turbo') && !password) {
      toast.error('Please enter a password');
      return;
    }

    if (cryptoType === 'hybrid') {
      if (mode === 'encrypt' && !publicKey) {
        toast.error('Public key is required for hybrid encryption');
        return;
      }
      if (mode === 'decrypt' && !privateKey) {
        toast.error('Private key is required for hybrid decryption');
        return;
      }

      try {
        if (mode === 'encrypt' && publicKey) JSON.parse(publicKey);
        if (mode === 'decrypt' && privateKey) JSON.parse(privateKey);
        if (signingKey) JSON.parse(signingKey);
        if (verifyKey) JSON.parse(verifyKey);
      } catch (e) {
        toast.error('Invalid key format. Please ensure you are using a valid JWK.');
        return;
      }
    }

    const hasVeryLargeFile = queue.some(item => item.file.size / (1024 * 1024) > 500);
    if (hasVeryLargeFile && argon2Settings.memorySize > 262144) {
      const proceed = window.confirm('One or more files are very large and high-performance memory settings are enabled. This might cause the browser to slow down. Do you want to proceed?');
      if (!proceed) return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    setQueue(prev => prev.map(item => ({
      ...item,
      status: item.status === 'completed' ? 'completed' : 'queued',
      progress: item.status === 'completed' ? 100 : 0,
      error: undefined
    })));

    let successCount = 0;
    let failureCount = 0;
    const totalItems = queue.length;

    for (let i = 0; i < totalItems; i++) {
      const item = queue[i];
      if (item.status === 'completed') {
        successCount++;
        continue;
      }

      setQueue(prev => prev.map(qItem => qItem.id === item.id ? { ...qItem, status: 'processing', progress: 0 } : qItem));

      try {
        let fileObj = item.file;

        if (mode === 'decrypt') {
          try {
            const partText = await fileObj.slice(0, Math.min(1000, fileObj.size)).text();
            const isNumericFormat = /^[0-9a-fA-F\s,]*$/.test(partText.trim());
            if (isNumericFormat && partText.trim().length > 0) {
              const fullText = await fileObj.text();
              const parsedBytes = parseNumericString(fullText);
              fileObj = new File([parsedBytes], fileObj.name, { type: 'application/octet-stream' });
            }
          } catch (autoDetectErr) {
            console.error("Auto-detect numeric format error:", autoDetectErr);
          }
        }

        let finalBlob: Blob | null = null;
        let finalName = '';
        let sigVerified = false;
        let watermark = '';

        const updateItemProgress = (p: number) => {
          setQueue(prev => prev.map(qItem => qItem.id === item.id ? { ...qItem, progress: p } : qItem));
          const completedContribution = (successCount + failureCount) * 100;
          const currentContribution = p;
          const totalProgress = Math.round((completedContribution + currentContribution) / totalItems);
          setProgress(totalProgress);
        };

        const startTime = performance.now();

        if (cryptoType === 'symmetric') {
          if (mode === 'encrypt') {
            const encryptedBlob = await cryptoWorker.encryptSymmetric(fileObj, password, argon2Settings, updateItemProgress);
            finalBlob = encryptedBlob;
            finalName = 'JohnCrypt.enc';
          } else {
            const result = await cryptoWorker.decryptSymmetric(fileObj, password, argon2Settings, updateItemProgress);
            finalBlob = result.blob;
            finalName = result.fileName;
            watermark = result.watermark || '';
          }
        } else if (cryptoType === 'turbo') {
          if (mode === 'encrypt') {
            const encryptedBlob = await cryptoWorker.encryptTurbo(fileObj, password, updateItemProgress);
            finalBlob = encryptedBlob;
            finalName = 'JohnCrypt.enc';
          } else {
            const result = await cryptoWorker.decryptTurbo(fileObj, password, updateItemProgress);
            finalBlob = result.blob;
            finalName = result.fileName;
          }
        } else {
          if (mode === 'encrypt') {
            const encryptedBlob = await cryptoWorker.encryptHybrid(fileObj, publicKey, signingKey, updateItemProgress);
            finalBlob = encryptedBlob;
            finalName = 'JohnCrypt.enc';
          } else {
            const result = await cryptoWorker.decryptHybrid(
              fileObj, 
              privateKey, 
              verifyKey,
              updateItemProgress
            );
            finalBlob = new Blob([result.decryptedData]);
            finalName = result.fileName;
            sigVerified = !!verifyKey;
            watermark = result.watermark || '';
          }
        }

        const durationMs = performance.now() - startTime;

        if (mode === 'encrypt' && numericCipherType !== 'off' && finalBlob) {
          const arrayBuffer = await finalBlob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          const serialized = serializeToNumericString(bytes, numericCipherType);
          finalBlob = new Blob([serialized], { type: 'text/plain' });
          finalName = 'JohnCrypt.txt';
        }

        if (finalBlob) {
          setQueue(prev => prev.map(qItem => qItem.id === item.id ? { 
            ...qItem, 
            status: 'completed', 
            progress: 100,
            resultBlob: finalBlob as Blob,
            resultName: finalName
          } : qItem));
          
          if (totalItems === 1) {
            setResult({ blob: finalBlob, name: finalName, signatureVerified: sigVerified, watermark });
          }

          const newOp: RecentOperation = {
            id: Math.random().toString(36).substring(7),
            fileName: item.file.name,
            fileSize: item.file.size,
            type: mode,
            algorithm: cryptoType.toUpperCase(),
            timestamp: Date.now(),
            durationMs
          };
          setRecentOperations(prev => [newOp, ...prev].slice(0, 50));
          successCount++;
        }
      } catch (err: any) {
        console.error('Processing error:', err);
        const errorMsg = getErrorMessage(err);
        setQueue(prev => prev.map(qItem => qItem.id === item.id ? { ...qItem, status: 'error', error: errorMsg } : qItem));
        failureCount++;
        toast.error(`Failed to process ${item.file.name}: ${errorMsg}`);
      }
    }

    setIsProcessing(false);
    setProgress(100);

    if (successCount === totalItems) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22d3ee', '#3b82f6', '#10b981', '#f59e0b']
      });
      toast.success(totalItems > 1 ? `Successfully processed ${totalItems} files!` : 'File processed successfully!');
    } else if (successCount > 0) {
      toast.success(`Processed ${successCount} files, but ${failureCount} failed.`);
    }
  };

  const handleCopyResult = async () => {
    if (result) {
      try {
        const text = await result.blob.text();
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Ciphertext copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy result.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-main)] selection:bg-cyan-500/30 overflow-x-hidden font-sans transition-colors duration-500">
      <Toaster position="top-right" />
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md border-b border-white/5 bg-black/5">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.location.reload()}>
          <div className="relative">
            <Shield className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 bg-cyan-400/20 blur-lg rounded-full animate-pulse" />
          </div>
          <div>
            <span className="font-black tracking-tighter text-2xl bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">JohnCrypt</span>
            <div className="h-0.5 w-0 group-hover:w-full bg-cyan-400 transition-all duration-300" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{deviceIdentity}</span>
          </div>
          
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2.5 rounded-xl hover:bg-white/10 transition-all glass-button border border-white/5"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-blue-600" />}
          </button>
          
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2.5 rounded-xl hover:bg-white/10 transition-all glass-button border border-white/5 relative"
          >
            <Menu className="w-5 h-5 text-cyan-400" />
            {recentOperations.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-500 rounded-full border-2 border-[var(--bg-color)]" />
            )}
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Controls */}
          <div className="lg:col-span-5 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest">
                <Cpu className="w-3 h-3" /> 2026 Security Standard
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Secure your data with <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">Zero-Knowledge</span> encryption.
              </h1>
              <p className="text-[var(--text-muted)] text-lg leading-relaxed max-w-md">
                Military-grade file protection that runs entirely in your browser. Your password never leaves your device.
              </p>
            </motion.div>

            <div className="space-y-6">
              {/* Mode Switcher */}
              <div className="p-1.5 bg-black/20 rounded-2xl border border-white/5 flex gap-1.5">
                <button
                  onClick={() => setMode('encrypt')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300",
                    mode === 'encrypt' ? "bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]" : "text-[var(--text-muted)] hover:bg-white/5"
                  )}
                >
                  Encrypt
                </button>
                <button
                  onClick={() => setMode('decrypt')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300",
                    mode === 'decrypt' ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]" : "text-[var(--text-muted)] hover:bg-white/5"
                  )}
                >
                  Decrypt
                </button>
              </div>

              {/* Crypto Type Selector */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'symmetric', label: 'Symmetric', icon: <Key className="w-3.5 h-3.5" /> },
                  { id: 'hybrid', label: 'Hybrid', icon: <Globe className="w-3.5 h-3.5" /> },
                  { id: 'turbo', label: 'Turbo', icon: <Zap className="w-3.5 h-3.5" /> }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setCryptoType(type.id as any)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300",
                      cryptoType === type.id 
                        ? "bg-white/5 border-cyan-500/50 text-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]" 
                        : "bg-transparent border-white/5 text-[var(--text-muted)] hover:border-white/20"
                    )}
                  >
                    {type.icon}
                    <span className="text-[10px] font-bold uppercase tracking-wider">{type.label}</span>
                  </button>
                ))}
              </div>

              {/* Input Section */}
              <div className="space-y-4">
                {cryptoType === 'hybrid' ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    {mode === 'encrypt' ? (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                          Recipient Public Key (JWK)
                          <InfoTooltip content="Paste the public key of the person who will decrypt this file." />
                        </label>
                        <textarea
                          value={publicKey}
                          onChange={(e) => setPublicKey(e.target.value)}
                          placeholder='{"kty":"RSA",...}'
                          className="w-full h-24 bg-black/20 border border-white/10 rounded-2xl p-4 text-[10px] font-mono focus:border-cyan-500/50 outline-none transition-all resize-none custom-scrollbar"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                          Your Private Key (JWK)
                          <InfoTooltip content="Your secret private key is required to decrypt hybrid-encrypted files." />
                        </label>
                        <textarea
                          value={privateKey}
                          onChange={(e) => setPrivateKey(e.target.value)}
                          placeholder='{"kty":"RSA",...}'
                          className="w-full h-24 bg-black/20 border border-white/10 rounded-2xl p-4 text-[10px] font-mono focus:border-blue-500/50 outline-none transition-all resize-none custom-scrollbar"
                        />
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handleGenerateKeys}
                        disabled={isGeneratingKeys}
                        className="flex-1 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
                      >
                        {isGeneratingKeys ? 'Generating...' : 'Generate New Keypair'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <PasswordInput 
                    password={password} 
                    setPassword={setPassword}
                    mode={mode}
                  />
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={handleProcess}
                disabled={isProcessing || queue.length === 0}
                className={cn(
                  "w-full py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-3 relative overflow-hidden group",
                  mode === 'encrypt' 
                    ? "bg-cyan-500 text-white shadow-[0_10px_30px_rgba(6,182,212,0.3)] hover:shadow-[0_15px_40px_rgba(6,182,212,0.4)]" 
                    : "bg-blue-600 text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.4)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Processing... {progress}%
                  </>
                ) : (
                  <>
                    {mode === 'encrypt' ? <Shield className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                    {mode === 'encrypt' ? 'Secure Files Now' : 'Unlock Data'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Dropzone & Results */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000" />
              <div className="relative bg-[var(--card-bg)] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                <FileDropZone 
                  onFilesSelect={handleFilesSelect} 
                  queue={queue}
                  onRemoveItem={handleRemoveItem}
                  onClearQueue={handleClearQueue}
                  isProcessing={isProcessing}
                />
              </div>
            </div>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div className="p-6 bg-black/20 rounded-3xl border border-white/5 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                          <Check className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold">Process Complete</h3>
                          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Ready for secure preview</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCopyResult}
                          className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                          title="Copy Ciphertext"
                        >
                          {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-[var(--text-muted)] group-hover:text-white" />}
                        </button>
                        <button
                          onClick={() => saveAs(result.blob, result.name)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20"
                        >
                          <Download className="w-4 h-4" /> Download
                        </button>
                      </div>
                    </div>

                    <div className="aspect-square md:aspect-video w-full max-w-full">
                      <FilePreview 
                        file={result.blob} 
                        fileName={result.name} 
                        isEncryptedSource={mode === 'encrypt'}
                      />
                    </div>
                    
                    {result.signatureVerified && (
                      <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                        <ShieldCheck className="w-4 h-4" /> Digital Signature Verified (RSA-4096-PSS)
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-white/5 bg-black/5">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <a href="#" className="text-[var(--text-muted)] hover:text-white transition-colors"><Github className="w-5 h-5" /></a>
            <a href="#" className="text-[var(--text-muted)] hover:text-white transition-colors"><Mail className="w-5 h-5" /></a>
            <a href="#" className="text-[var(--text-muted)] hover:text-white transition-colors"><MessageCircle className="w-5 h-5" /></a>
          </div>
          
          <div className="flex items-center gap-8">
            <button onClick={() => setIsAboutOpen(true)} className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-cyan-400 transition-colors">Security Architecture</button>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">© 2026 JohnCrypt</span>
          </div>
        </div>
      </footer>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        onOpenAbout={() => {
          setIsSidebarOpen(false);
          setIsAboutOpen(true);
        }}
        symmetricKey={symmetricKey}
        argon2Settings={argon2Settings}
        setArgon2Settings={setArgon2Settings}
        onGenerateSymmetricKey={handleGenerateSymmetricKey}
        recentOperations={recentOperations}
        onClearRecentOperations={() => setRecentOperations([])}
      />

      <AboutModal 
        isOpen={isAboutOpen} 
        onClose={() => setIsAboutOpen(false)} 
      />
    </div>
  );
}
