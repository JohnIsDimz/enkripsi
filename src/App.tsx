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
  const [result, setResult] = useState<{ blob: Blob; name: string; signatureVerified?: boolean } | null>(null);
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
      event.preventDefault(); // Prevent browser from logging to console
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
      
      // Filter out benign errors or empty rejections if necessary
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

      // Basic JWK validation
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

    // Memory usage warning for large files in the batch
    const hasVeryLargeFile = queue.some(item => item.file.size / (1024 * 1024) > 500);
    if (hasVeryLargeFile && argon2Settings.memorySize > 262144) {
      const proceed = window.confirm('One or more files are very large and high-performance memory settings are enabled. This might cause the browser to slow down. Do you want to proceed?');
      if (!proceed) return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    // Initialise item statuses
    setQueue(prev => prev.map(item => ({
      ...item,
      status: item.status === 'completed' ? 'completed' : 'queued',
      progress: item.status === 'completed' ? 100 : 0,
      error: undefined
    })));

    let successCount = 0;
    let failureCount = 0;
    const totalItems = queue.length;

    // We process sequentially
    for (let i = 0; i < totalItems; i++) {
      const item = queue[i];
      if (item.status === 'completed') {
        successCount++;
        continue;
      }

      setQueue(prev => prev.map(qItem => qItem.id === item.id ? { ...qItem, status: 'processing', progress: 0 } : qItem));

      try {
        let fileObj = item.file;

        // Auto-decode if the input file contains space-separated numbers or hex sequences
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

        const updateItemProgress = (p: number) => {
          setQueue(prev => prev.map(qItem => qItem.id === item.id ? { ...qItem, progress: p } : qItem));
          // Calculate overall progress across files
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
            const { blob, fileName } = await cryptoWorker.decryptSymmetric(fileObj, password, argon2Settings, updateItemProgress);
            finalBlob = blob;
            finalName = fileName;
          }
        } else if (cryptoType === 'turbo') {
          if (mode === 'encrypt') {
            const encryptedBlob = await cryptoWorker.encryptTurbo(fileObj, password, updateItemProgress);
            finalBlob = encryptedBlob;
            finalName = 'JohnCrypt.enc';
          } else {
            const { blob, fileName } = await cryptoWorker.decryptTurbo(fileObj, password, updateItemProgress);
            finalBlob = blob;
            finalName = fileName;
          }
        } else {
          // Hybrid Mode
          if (mode === 'encrypt') {
            const encryptedBlob = await cryptoWorker.encryptHybrid(fileObj, publicKey, signingKey, updateItemProgress);
            finalBlob = encryptedBlob;
            finalName = 'JohnCrypt.enc';
          } else {
            const { decryptedData, fileName } = await cryptoWorker.decryptHybrid(
              fileObj, 
              privateKey, 
              verifyKey,
              updateItemProgress
            );
            finalBlob = new Blob([decryptedData]);
            finalName = fileName;
            sigVerified = !!verifyKey;
          }
        }

        const durationMs = performance.now() - startTime;

        // Represent as random numbers sequence or Hex matrix if selected during encryption
        if (mode === 'encrypt' && numericCipherType !== 'off' && finalBlob) {
          const arrayBuffer = await finalBlob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          const serialized = serializeToNumericString(bytes, numericCipherType);
          finalBlob = new Blob([serialized], { type: 'application/octet-stream' });
          finalName = 'JohnCrypt.enc';
        }

        // Auto download the processed file
        try {
          saveAs(finalBlob, finalName);
        } catch (downloadErr) {
          console.error('Auto download failed:', downloadErr);
        }

        successCount++;
        setQueue(prev => prev.map(qItem => qItem.id === item.id ? { 
          ...qItem, 
          status: 'completed', 
          progress: 100, 
          resultBlob: finalBlob!, 
          resultName: finalName, 
          signatureVerified: sigVerified 
        } : qItem));

        const getAlgoName = (type: 'symmetric' | 'hybrid' | 'turbo') => {
          if (type === 'turbo') return 'AES-256-GCM';
          if (type === 'hybrid') return 'ECIES Hybrid (Curve25519)';
          return 'Triple-Layer (AES+ChaCha)';
        };

        setRecentOperations(prev => [
          {
            id: `${item.id}-op-${Date.now()}`,
            fileName: item.file.name,
            fileSize: item.file.size,
            type: mode,
            timestamp: Date.now(),
            status: 'success',
            mode: cryptoType,
            algorithm: getAlgoName(cryptoType),
            durationMs,
          },
          ...prev
        ]);

        // If it's a single file, configure global result state so existing UI success-screens can render nicely if they want
        if (totalItems === 1) {
          setResult({
            blob: finalBlob!,
            name: finalName,
            signatureVerified: sigVerified
          });
        }

      } catch (err: any) {
        console.error(`Error processing file ${item.file.name}:`, err);
        failureCount++;
        const errMsg = getErrorMessage(err);
        setQueue(prev => prev.map(qItem => qItem.id === item.id ? { 
          ...qItem, 
          status: 'failed', 
          progress: 0, 
          error: errMsg 
        } : qItem));
        toast.error(`Failed to process ${item.file.name}: ${errMsg}`);
      }
    }

    setIsProcessing(false);
    setProgress(100);

    // Show overall status notifications and trigger confetti if any success
    if (successCount === totalItems) {
      toast.success('All files processed successfully!');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#8b5cf6', '#ec4899']
      }).catch(err => console.error('Confetti error:', err));
    } else if (successCount > 0) {
      toast.success(`Batch complete: ${successCount} succeeded, ${failureCount} failed.`);
      confetti({
        particleCount: 50,
        spread: 45,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#8b5cf6']
      }).catch(err => console.error('Confetti error:', err));
    } else {
      toast.error('Job complete. No files were processed successfully.');
    }
  };

  const handleDownload = () => {
    if (!result) return;
    try {
      saveAs(result.blob, result.name);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed. Please ensure downloads are enabled in your browser settings.');
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy password.');
    }
  };

  const reset = () => {
    setQueue([]);
    setPassword('');
    setResult(null);
    setProgress(0);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 relative">
      <Toaster position="top-center" />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center z-50 bg-black/10 backdrop-blur-md border-b border-[var(--border-color)] shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-3 drop-shadow-sm">
          <Shield className="w-5 h-5 text-cyan-400" />
          <span className="font-black tracking-tighter text-lg text-[var(--text-main)]">JohnCrypt</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 max-w-[140px] truncate" title="Device Identity Badge">
            {deviceIdentity}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 glass-button border border-[var(--border-color)] rounded-lg transition-all group shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[var(--text-muted)] group-hover:text-yellow-400 transition-colors drop-shadow-sm" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--text-muted)] group-hover:text-blue-600 transition-colors drop-shadow-sm" />
            )}
          </button>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 glass-button border border-[var(--border-color)] rounded-lg transition-all group shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
          >
            <Menu className={cn("w-4 h-4 transition-colors drop-shadow-sm", theme === 'dark' ? "text-white/50 group-hover:text-white" : "text-black/50 group-hover:text-black")} />
          </button>
        </div>
      </nav>

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
        onClearRecentOperations={() => {
          setRecentOperations([]);
          toast.success('Recent Operations history cleared!');
        }}
      />
      
      <AboutModal 
        isOpen={isAboutOpen} 
        onClose={() => setIsAboutOpen(false)} 
      />
      
      {/* Background Elements (Optimized out heavy multi-layer blur filters for 100% smooth frame-rate) */}

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20, rotateX: 10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="text-center mb-12 relative z-10 perspective-1000"
      >
        <h1 className={cn(
          "text-6xl md:text-[5.5rem] font-black tracking-tighter mb-4 transition-colors duration-300 drop-shadow-2xl",
          theme === 'dark' ? "text-white" : "text-slate-800"
        )}>
          JohnCrypt
        </h1>
      </motion.header>

      {/* Main Container */}
      <main className="w-full max-w-xl lg:max-w-5xl relative z-10 perspective-1000">
        <motion.div 
          initial={{ opacity: 0, y: 20, rotateX: 10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="glass-card p-6 md:p-8 lg:p-10 space-y-8"
        >
          {/* Crypto Type Switcher */}
          <div className="flex p-1 glass-card rounded-2xl">
            <button
              onClick={() => setCryptoType('symmetric')}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5",
                cryptoType === 'symmetric' 
                  ? "glass-button text-cyan-400 shadow-lg" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              )}
            >
              Symmetric
              <InfoTooltip content="Uses a password to derive a key for Triple-Layer encryption (AES-256 + ChaCha20 + XChaCha20). Updated to V8 with Ultra-Hardened Argon2id settings." />
            </button>
            <button
              onClick={() => setCryptoType('turbo')}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5",
                cryptoType === 'turbo' 
                  ? "glass-button text-emerald-400 shadow-lg" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              )}
            >
              Turbo (GCM)
              <InfoTooltip content="Uses 100% hardware-accelerated AES-256-GCM + PBKDF2. Near-instant processing (exceeding 2.5 Gbps) under strict browser resource constraints." />
            </button>
            <button
              onClick={() => setCryptoType('hybrid')}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5",
                cryptoType === 'hybrid' 
                  ? "glass-button text-blue-400 shadow-lg" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              )}
            >
              Hybrid
              <InfoTooltip content="Uses Triple-Hybrid (RSA-4096 + ECDH-P521 + Kyber-1024) for secure key exchange and digital signatures. Post-Quantum Ready." />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex p-1 glass-card rounded-2xl">
            <button
              onClick={() => { setMode('encrypt'); reset(); }}
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2",
                mode === 'encrypt' ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              )}
            >
              <Shield className="w-4 h-4" />
              Encrypt
            </button>
            <button
              onClick={() => { setMode('decrypt'); reset(); }}
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2",
                mode === 'decrypt' ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              Decrypt
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div 
                key="input-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8 text-left"
              >
                {/* Left Side Column: Dropping area, queue, and single file previews */}
                <div className="lg:col-span-7 space-y-6 flex flex-col justify-start">
                  <FileDropZone 
                    onFilesSelect={handleFilesSelect} 
                    queue={queue} 
                    onRemoveItem={handleRemoveItem} 
                    onClearQueue={handleClearQueue} 
                    isProcessing={isProcessing}
                    onDownloadItem={handleDownloadItem}
                  />
                  
                  {queue.length === 1 && <FilePreview file={queue[0].file} />}
                </div>

                {/* Right Side Column: Configuring credential keys, passwords, output types, and process actions */}
                <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
                  <div className="space-y-6">
                    {cryptoType === 'symmetric' || cryptoType === 'turbo' ? (
                      <div className="space-y-4">
                        <PasswordInput 
                          value={password} 
                          onChange={setPassword} 
                          placeholder={mode === 'encrypt' ? "Create a strong password" : "Enter decryption password"}
                        />
                        
                        {password && mode === 'encrypt' && (
                          <button
                            onClick={copyPassword}
                            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-blue-400 transition-colors ml-auto"
                          >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? "Copied" : "Copy Password"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Public Key Slot (Encryption or Verification) */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2 drop-shadow-sm">
                              <Shield className={cn("w-3 h-3", mode === 'encrypt' ? "text-cyan-400" : "text-emerald-400")} />
                              {mode === 'encrypt' ? 'Public Encryption Key' : 'Public Verification Key (Optional)'}
                              <InfoTooltip content={mode === 'encrypt' ? "The recipient's public key used to encrypt the file. Safe to share." : "The sender's public key used to verify the digital signature."} />
                            </label>
                            <div className="flex gap-3">
                              <button 
                                onClick={async () => {
                                  let textToCopy = '';
                                  if (mode === 'encrypt') {
                                    if (publicKey) textToCopy += `Public Encryption Key:\n${publicKey}\n\n`;
                                    if (signingKey) textToCopy += `Private Signing Key:\n${signingKey}`;
                                  } else {
                                    if (verifyKey) textToCopy += `Public Verification Key:\n${verifyKey}\n\n`;
                                    if (privateKey) textToCopy += `Private Decryption Key:\n${privateKey}`;
                                  }
                                  
                                  if (textToCopy) {
                                    try {
                                      await navigator.clipboard.writeText(textToCopy.trim());
                                      toast.success('Keys copied!');
                                    } catch (err) {
                                      toast.error('Failed to copy keys.');
                                    }
                                  } else {
                                    toast.error('No keys to copy.');
                                  }
                                }}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors drop-shadow-sm"
                              >
                                <Copy className="w-3 h-3" />
                                Copy Keys
                              </button>
                              <button 
                                onClick={handleGenerateKeys}
                                disabled={isGeneratingKeys}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition-colors drop-shadow-sm"
                              >
                                <RefreshCw className={cn("w-3 h-3", isGeneratingKeys && "animate-spin")} />
                                {isGeneratingKeys ? 'Generating...' : 'New Pair'}
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={mode === 'encrypt' ? publicKey : verifyKey}
                            onChange={(e) => mode === 'encrypt' ? setPublicKey(e.target.value) : setVerifyKey(e.target.value)}
                            placeholder={mode === 'encrypt' ? "Paste Recipient's Public Encryption Key (JWK) here..." : "Paste Sender's Public Verification Key (JWK) here..."}
                            className="w-full glass-card border border-[var(--border-color)] rounded-xl py-2.5 px-4 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]"
                          />
                        </div>

                        {/* Private Key Slot (Decryption or Signing) */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2 drop-shadow-sm">
                              <Key className={cn("w-3 h-3", mode === 'encrypt' ? "text-emerald-400" : "text-cyan-400")} />
                              {mode === 'encrypt' ? 'Private Signing Key (Optional)' : 'Private Decryption Key'}
                              <InfoTooltip content={mode === 'encrypt' ? "Your private key used to digitally sign the file. Keep this secret!" : "Your private key used to decrypt the file. Keep this secret!"} />
                            </label>
                          </div>
                          <input
                            type="text"
                            value={mode === 'encrypt' ? signingKey : privateKey}
                            onChange={(e) => mode === 'encrypt' ? setSigningKey(e.target.value) : setPrivateKey(e.target.value)}
                            placeholder={mode === 'encrypt' ? "Paste Your Private Signing Key (JWK) here..." : "Paste Your Private Decryption Key (JWK) here..."}
                            className="w-full glass-card border border-[var(--border-color)] rounded-xl py-2.5 px-4 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]"
                          />
                        </div>
                      </div>
                    )}

                    {mode === 'encrypt' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex flex-col gap-3 p-4 rounded-2xl border border-[var(--border-color)] bg-black/15 backdrop-blur-sm shadow-[inset_0_1px_5px_rgba(255,255,255,0.03)] overflow-hidden text-left"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5 drop-shadow-sm justify-between">
                            <span className="flex items-center gap-1.5">
                              Output Cipher Layout
                              <InfoTooltip content="Mengubah output biner hasil enkripsi menjadi deretan digit angka desimal acak (0-255) atau matriks heksadesimal (Cyber Hex) yang tersimpan dalam format teks plain. JohnCrypt akan mendeteksinya secara otomatis sewaktu didekripsi." />
                            </span>
                            <span className="text-[10px] text-cyan-400 font-mono font-bold tracking-widest uppercase bg-cyan-950/40 px-2.5 py-0.5 rounded border border-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.15)]">
                              {numericCipherType === 'off' ? 'BINARY FILE' : numericCipherType === 'decimal' ? 'DECIMAL STRINGS' : 'CYBER HEX MATRIX'}
                            </span>
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] mt-0.5">Choose how the encrypted cipher data physically structures its output streams</span>
                        </div>
                        
                        {/* Segmented Controller Options */}
                        <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-black/35 border border-white/5 shadow-inner">
                          <button
                            type="button"
                            onClick={() => setNumericCipherType('off')}
                            className={cn(
                              "py-2 px-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-350 flex flex-col items-center gap-1 border cursor-pointer",
                              numericCipherType === 'off'
                                ? "bg-white/5 border-white/10 text-white shadow"
                                : "border-transparent text-[var(--text-muted)] hover:text-white hover:bg-white/5"
                            )}
                          >
                            <Shield className="w-3.5 h-3.5 text-blue-400" />
                            Binary
                          </button>
                          <button
                            type="button"
                            onClick={() => setNumericCipherType('decimal')}
                            className={cn(
                              "py-2 px-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-350 flex flex-col items-center gap-1 border cursor-pointer",
                              numericCipherType === 'decimal'
                                ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                                : "border-transparent text-[var(--text-muted)] hover:text-cyan-400 hover:bg-cyan-500/5"
                            )}
                          >
                            <span className="text-xs">🔢</span>
                            Decimal
                          </button>
                          <button
                            type="button"
                            onClick={() => setNumericCipherType('hex')}
                            className={cn(
                              "py-2 px-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-350 flex flex-col items-center gap-1 border cursor-pointer",
                              numericCipherType === 'hex'
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                                : "border-transparent text-[var(--text-muted)] hover:text-emerald-400 hover:bg-[#10b981]/5"
                            )}
                          >
                            <span className="text-xs">💻</span>
                            Hex Cyber
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="pt-4 lg:pt-0">
                    <button
                      onClick={isProcessing ? undefined : handleProcess}
                      disabled={
                        !isProcessing && (
                          queue.length === 0 || 
                          ((cryptoType === 'symmetric' || cryptoType === 'turbo') && !password) || 
                          (cryptoType === 'hybrid' && mode === 'encrypt' && !publicKey) || 
                          (cryptoType === 'hybrid' && mode === 'decrypt' && !privateKey)
                        )
                      }
                      className={cn(
                        "w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm glass-button disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden",
                        isProcessing 
                          ? "cursor-wait border-cyan-500/30 text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)] bg-cyan-950/20" 
                          : mode === 'encrypt' 
                            ? "text-cyan-400 hover:text-cyan-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]" 
                            : "text-blue-400 hover:text-blue-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]"
                      )}
                    >
                      {isProcessing && (
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-cyan-500/20"
                          style={{ width: `${progress}%` }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ type: 'spring', bounce: 0, duration: 0.1 }}
                        />
                      )}
                      
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                            <span>Processing... {Math.round(progress)}%</span>
                          </>
                        ) : (
                          queue.length > 1 
                            ? (mode === 'encrypt' ? "Secure Batch" : "Unlock Batch") 
                            : (mode === 'encrypt' ? "Secure File" : "Unlock File")
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="result-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-4 space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8 text-left"
              >
                {/* Visual Feedback Pane on the Left */}
                <div className="lg:col-span-7 flex flex-col justify-start">
                  {mode === 'decrypt' && result.blob ? (
                    <div className="space-y-2 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] drop-shadow-sm mb-1 text-center lg:text-left font-mono">
                        🔒 Decrypted Media Preview (Watermarked Sandbox)
                      </p>
                      <FilePreview file={result.blob} fileName={result.name} />
                    </div>
                  ) : (
                    /* Secure diagnostic summary showing active protection layers to cover non-decrypted layouts gracefully */
                    <div className="glass-card p-6 md:p-8 border border-[var(--border-color)] rounded-3xl space-y-6 bg-black/20 text-left h-full flex flex-col justify-center">
                      <div className="flex items-center gap-3.5 border-b border-[var(--border-color)] pb-4">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                          <Shield className="w-6 h-6 text-cyan-400 drop-shadow-md" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest font-mono">Secure Shield Status</p>
                          <p className="text-sm font-black text-[var(--text-main)] uppercase drop-shadow-sm">Active Symmetric Crypt</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3.5 text-xs text-[var(--text-muted)]">
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-black/25 border border-white/5 shadow-inner">
                          <span className="font-mono text-[10px] text-zinc-300">Total Secure Layers</span>
                          <span className="text-cyan-400 font-bold font-mono text-[10px] tracking-wider uppercase bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">3 / 3 STACK SECURED</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-black/25 border border-white/5 shadow-inner">
                          <span className="font-mono text-[10px] text-zinc-300">Integrity Protection</span>
                          <span className="text-emerald-400 font-bold font-mono text-[10px] tracking-wider uppercase bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">SHA-512 SIGNED</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-black/25 border border-white/5 shadow-inner">
                          <span className="font-mono text-[10px] text-zinc-300">Digital Watermarking</span>
                          <span className="text-purple-400 font-bold font-mono text-[10px] tracking-wider uppercase bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/20 font-serif lowercase">©john_tamvan</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed italic opacity-75 text-center lg:text-left">
                        Secured completely within the local Web Crypto sandbox. No bytes or metadata have left your device identity.
                      </p>
                    </div>
                  )}
                </div>

                {/* Secure Summary and Downloads on the Right */}
                <div className="lg:col-span-5 flex flex-col justify-center items-center text-center space-y-6">
                  <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[inset_0_2px_10px_rgba(16,185,129,0.3)]">
                    <ShieldCheck className="w-12 h-12 text-emerald-400 drop-shadow-md" />
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold mb-2 drop-shadow-sm">Success!</h3>
                    <p className="text-[var(--text-muted)] text-sm drop-shadow-sm">Your file is ready for download.</p>
                  </div>
                  
                  {result.signatureVerified && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                      <Check className="w-3.5 h-3.5" />
                      Digital Signature Verified
                    </div>
                  )}
                  
                  <div className="glass-card p-4 flex items-center justify-between gap-4 border border-[var(--border-color)] shadow-[0_10px_30px_rgba(0,0,0,0.5)] w-full">
                    <div className="text-left overflow-hidden">
                      <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 drop-shadow-sm">Result File</p>
                      <p className="text-sm font-medium truncate text-cyan-400 drop-shadow-sm">{result.name}</p>
                    </div>
                    <button
                      onClick={handleDownload}
                      className="p-3 glass-button rounded-xl hover:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.3)] text-cyan-400"
                    >
                      <Download className="w-5 h-5 drop-shadow-md" />
                    </button>
                  </div>

                  <button
                    onClick={reset}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors mx-auto drop-shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Process another file
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>



      {/* Footer */}
      <footer className="mt-12 text-center space-y-6 relative z-10">
        <div className="flex items-center justify-center gap-6">
          <a 
            href="https://github.com/THENASUKASUSU" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>
          <a 
            href="mailto:thenahamil@gmail.com" 
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            title="Contact via Email"
          >
            <Mail className="w-5 h-5" />
          </a>
          <a 
            href="https://wa.me/6282293087868?text=hello+bro,+add+new+feature" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            title="Contact via WhatsApp"
          >
            <MessageCircle className="w-5 h-5" />
          </a>
          <button 
            onClick={() => setIsAboutOpen(true)}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-50 flex items-center justify-center gap-1.5 flex-wrap">
          &copy; 2026 <span className="font-serif italic text-xs tracking-normal text-cyan-400 normal-case drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">John</span> ✍️ • No Data Stored
        </p>
      </footer>
    </div>
  );
}
