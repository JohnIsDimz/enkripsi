import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Lock, Cpu, Globe, Zap, Github, Mail, MessageCircle, ExternalLink, Code2, Binary, Fingerprint, HelpCircle, Info, Key, Layers, CheckCircle2, BookOpen, Image, Music, Archive, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [docTab, setDocTab] = useState<'intro' | 'algo' | 'preview' | 'watermark'>('intro');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200]"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: 20, rotateX: -10 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-3xl md:max-h-[85vh] glass-card border border-[var(--border-color)] rounded-[2rem] z-[201] overflow-hidden flex flex-col perspective-1000"
          >
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-black/10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center shadow-[inset_0_2px_10px_rgba(6,182,212,0.3)] border border-cyan-500/30">
                  <Shield className="w-6 h-6 text-cyan-400 drop-shadow-md" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-[var(--text-main)] drop-shadow-sm">About JohnCrypt</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Version 1.5.1 • 2026 Hardened Standard</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors glass-button cursor-pointer"
              >
                <X className="w-6 h-6 text-[var(--text-muted)] hover:text-[var(--text-main)]" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-16 custom-scrollbar bg-black/5">
              {/* Introduction */}
              <section className="space-y-6 text-left">
                <div className="flex items-center gap-2 text-cyan-400 drop-shadow-sm">
                  <Info className="w-5 h-5" />
                  <h3 className="text-sm font-black uppercase tracking-widest">About JohnCrypt</h3>
                </div>
                <div className="space-y-4 text-[var(--text-muted)] leading-relaxed text-xs">
                  <p>
                    <strong className="text-[var(--text-main)] drop-shadow-sm">JohnCrypt</strong> is a next-generation file security application designed to provide absolute privacy. It utilizes 2026 cryptographic standards, combining layered symmetric algorithms and asymmetric hybrid encryption to protect any file type (Images, Documents, Archives, etc.) from current and future threats.
                  </p>
                  <p>
                    Our core philosophy is <strong className="text-[var(--text-main)] drop-shadow-sm">"Zero Knowledge, Zero Server"</strong>. The entire encryption and decryption process is performed 100% within your browser (client-side). Your files are never uploaded to any server, and your passwords never leave your device.
                  </p>
                </div>
              </section>

              {/* JohnCrypt Advanced Technical Wiki & Interactive Documentation Hub */}
              <section className="space-y-6 text-left" id="johncrypt-wiki-card">
                <div className="flex items-center gap-2 text-cyan-400 drop-shadow-sm">
                  <BookOpen className="w-5 h-5" />
                  <h3 className="text-sm font-black uppercase tracking-widest font-sans">JohnCrypt Wiki & Panduan Technical</h3>
                </div>
                
                <div className="glass-card p-5 border border-[var(--border-color)] rounded-2xl space-y-5 bg-black/25">
                  {/* Tab Selection */}
                  <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5">
                    {[
                      { id: 'intro', label: 'Overview', icon: Globe },
                      { id: 'algo', label: 'Crypto', icon: Shield },
                      { id: 'preview', label: 'Sandbox', icon: Code2 },
                      { id: 'watermark', label: 'Protection', icon: ShieldCheck }
                    ].map((tab) => {
                      const IconComp = tab.icon;
                      const isActive = docTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setDocTab(tab.id as any)}
                          className={cn(
                            "py-2 px-0.5 rounded-lg text-[8px] md:text-[9px] font-mono font-bold uppercase tracking-wider transition-all duration-300 flex flex-col items-center gap-1 border cursor-pointer",
                            isActive
                              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                              : "border-transparent text-[var(--text-muted)] hover:text-white hover:bg-white/5"
                          )}
                        >
                          <IconComp className={cn("w-3.5 h-3.5", isActive ? "text-cyan-400" : "text-[var(--text-muted)]")} />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Tab Panel */}
                  <div className="min-h-[220px]">
                    <AnimatePresence mode="wait">
                      {docTab === 'intro' && (
                        <motion.div
                          key="intro"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-4 text-xs text-[var(--text-muted)] leading-relaxed"
                        >
                          <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase font-mono tracking-widest text-[9px]">
                            <span className="w-1 h-1 rounded-full bg-cyan-400" />
                            Ikhtisar Platform (Platform Overview)
                          </div>
                          <p>
                            <b className="text-[var(--text-main)]">JohnCrypt</b> adalah ekosistem perlindungan data berfilosofi <strong className="text-cyan-400 font-semibold text-[11px]">Zero-Knowledge, Zero-Server</strong> yang berjalan sepenuhnya di sisi klien (client-side) di dalam sandbox peramban Anda. Hak privasi digital dilindungi mutlak karena tidak ada byte data atau kata sandi yang dikirimkan ke server eksternal mana pun.
                          </p>
                          <div className="p-3 rounded-xl bg-black/25 border border-white/5 space-y-1.5">
                            <p className="font-bold text-[9px] uppercase text-zinc-300 font-mono tracking-wider">⚡ Alur Kerja Mandiri JohnCrypt:</p>
                            <ul className="space-y-1 text-[10px] list-disc list-inside pl-1 text-zinc-400">
                              <li><b>Seleksi Lokal:</b> File dibaca dalam pecahan biner di memori internal client.</li>
                              <li><b>Harkat Sandi:</b> Kata sandi diolah menggunakan sirkuit memori Argon2id adaptif.</li>
                              <li><b>Watermarking:</b> Media terenkripsi yang dibuka tetap terproteksi hak cipta.</li>
                            </ul>
                          </div>
                        </motion.div>
                      )}

                      {docTab === 'algo' && (
                        <motion.div
                          key="algo"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-4 text-xs text-[var(--text-muted)] leading-relaxed"
                        >
                          <div className="flex items-center gap-1.5 text-blue-400 font-bold uppercase font-mono tracking-widest text-[9px]">
                            <span className="w-1 h-1 rounded-full bg-blue-400" />
                            Metode Kriptografi Terpasang (Cryptographic Flows)
                          </div>
                          <div className="space-y-2.5">
                            <div className="p-2.5 rounded-xl border border-white/5 bg-black/25 text-left">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-zinc-200 text-[10px] uppercase font-mono">1. Triple-Layer Symmetric Cipher</span>
                                <span className="text-[8px] font-mono text-cyan-400 bg-cyan-950/40 px-1 py-0.5 rounded border border-cyan-500/20">MILITARY TYPE</span>
                              </div>
                              <p className="text-[10px] text-zinc-400">
                                Mengenkripsi data 3 kali beruntun dengan cipher <b className="text-zinc-200 text-[10px]">AES-256-GCM</b>, <b className="text-zinc-200 text-[10px]">ChaCha20-Poly1305</b>, dan <b className="text-zinc-200 text-[10px]">XChaCha20-Poly1305</b>. Derivasi kunci diperkeras lewat sirkuit memori canggih <b className="text-[10px] text-purple-400">Argon2id</b>.
                              </p>
                            </div>

                            <div className="p-2.5 rounded-xl border border-white/5 bg-black/25 text-left">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-zinc-200 text-[10px] uppercase font-mono">2. Turbo GCM Core Engine</span>
                                <span className="text-[8px] font-mono text-emerald-400 bg-emerald-950/40 px-1 py-0.5 rounded border border-emerald-500/20">ULTRAPORT STREAM</span>
                              </div>
                              <p className="text-[10px] text-zinc-400">
                                Mengandalkan instruksi hardware-accelerated AES-GCM 256-bit tunggal yang terikat PBKDF2. Memiliki kecepatan streaming throughput berkapasitas sangat tinggi (melebihi 2.5 Gbps) untuk pemrosesan file raksasa di atas 1 GB.
                              </p>
                            </div>

                            <div className="p-2.5 rounded-xl border border-white/5 bg-black/25 text-left">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-zinc-200 text-[10px] uppercase font-mono">3. RSA-4096 Hybrid Key Signing</span>
                                <span className="text-[8px] font-mono text-blue-400 bg-blue-950/40 px-1 py-0.5 rounded border border-blue-500/20">POST-QUANTUM READY</span>
                              </div>
                              <p className="text-[10px] text-zinc-400">
                                Skema asimetris RSA-4096-OAEP (SHA-512) yang digabungkan dengan digital signature terotentikasi. Memungkinkan transmisi data terenkripsi antar piranti secara asimetris bebas tanpa proses pertukaran password konvensional yang berisiko.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {docTab === 'preview' && (
                        <motion.div
                          key="preview"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-4 text-xs text-[var(--text-muted)] leading-relaxed"
                        >
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase font-mono tracking-widest text-[9px]">
                            <span className="w-1 h-1 rounded-full bg-emerald-400" />
                            Dukungan Jenis File & Sandbox Interaktif
                          </div>
                          <p>
                            JohnCrypt dirancang untuk memproses dan menayangkan hasil dekripsi segala macam ekstensi file di dalam <strong className="text-zinc-300">Safe Sandbox</strong> secara seketika tanpa perantara eksternal:
                          </p>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-2 rounded-xl border border-white/5 bg-black/15 text-left">
                              <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[9px] uppercase font-mono mb-1">
                                <Image className="w-3 h-3" /> Image & PDF
                              </div>
                              <p className="text-[9px] text-zinc-400">Ulasan jepretan foto & dokumen PDF inline aman didampingi cap digital merah pelindung.</p>
                            </div>

                            <div className="p-2 rounded-xl border border-white/5 bg-black/15 text-left">
                              <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[9px] uppercase font-mono mb-1">
                                <Music className="w-3 h-3" /> Audio & Video
                              </div>
                              <p className="text-[9px] text-zinc-400">Simulasi alat vinyl piringan hitam interaktif diikuti bar Equalizer Canvas audio pendar.</p>
                            </div>

                            <div className="p-2 rounded-xl border border-white/5 bg-black/15 text-left">
                              <div className="flex items-center gap-1.5 text-orange-400 font-bold text-[9px] uppercase font-mono mb-1">
                                <Archive className="w-3 h-3" /> Zip Diagnostik
                              </div>
                              <p className="text-[9px] text-zinc-400">Menelusuri isi file yang berada di dalam kompresi ZIP instan berikut ukuran CRC.</p>
                            </div>

                            <div className="p-2 rounded-xl border border-white/5 bg-black/15 text-left">
                              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[9px] uppercase font-mono mb-1">
                                <Code2 className="w-3 h-3" /> Code Sandboxing
                              </div>
                              <p className="text-[9px] text-zinc-400">Menjalankan langsung file <b>HTML, CSS, JS, dan TS / TypeScript</b> fungsional di runtime client!</p>
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl border border-cyan-500/20 bg-cyan-950/25 text-cyan-400 text-[10px] leading-relaxed">
                            <b>💡 TypeScript Engine Optimization:</b> Khusus file .ts/.tsx, peninjau kode JohnCrypt dilengkapi dengan parser bertingkat yang menyaring dan membersihkan anotasi static-type dalam hitungan milidetik sehingga script kode bersangkutan bisa dieksekusi normal di peramban.
                          </div>
                        </motion.div>
                      )}

                      {docTab === 'watermark' && (
                        <motion.div
                          key="watermark"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-4 text-xs text-[var(--text-muted)] leading-relaxed"
                        >
                          <div className="flex items-center gap-1.5 text-purple-400 font-bold uppercase font-mono tracking-widest text-[9px]">
                            <span className="w-1 h-1 rounded-full bg-purple-400" />
                            Teknologi Watermark, Integritas, & Output Plain
                          </div>
                          <p>
                            Keamanan data visual JohnCrypt dilindungi oleh <strong className="text-zinc-200">Teknologi Watermark Terintegrasi</strong> yang ditayangkan diagonal secara dinamis melintasi seluruh penayangan file rahasia:
                          </p>
                          <ul className="space-y-1.5 text-[10px] text-zinc-400 pl-1">
                            <li className="flex gap-2 text-left">
                              <span className="text-purple-400 shrink-0 select-none"><b>•</b></span>
                              <span><b>Anotasi Hak Cipta:</b> Watermark miring bertuliskan <code className="text-[9px] bg-white/5 text-purple-300 px-1 py-0.5 rounded border border-white/5">©John_tamvan</code> disematkan melintasi preview gambar, video, pdf, dan tabulator sandbox perakit kode.</span>
                            </li>
                            <li className="flex gap-2 text-left">
                              <span className="text-purple-400 shrink-0 select-none"><b>•</b></span>
                              <span><b>Output Plain-text Cipher:</b> Apabila Anda mengaktifkan skema "Output Cipher Layout" kustom (Decimal atau Cyber Hex) saat proses enkripsi, biner file rahasia diubah menjadi untaian digit desimal acak padat atau matriks heksadesimal rapi. JohnCrypt akan membacanya secara otomatis saat data didekripsi kembali.</span>
                            </li>
                            <li className="flex gap-2 text-left">
                              <span className="text-purple-400 shrink-0 select-none"><b>•</b></span>
                              <span><b>Keaslian Bergaransi:</b> Setiap output dibubuhkan serialisasi checksum algoritma hashing biner terenkripsi kelas berat demi menghindari tampering jahat oleh peretas.</span>
                            </li>
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </section>

              {/* Usage Guide */}
              <section className="space-y-8 text-left">
                <div className="flex items-center gap-2 text-emerald-400 drop-shadow-sm">
                  <HelpCircle className="w-5 h-5" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Usage Guide</h3>
                </div>
                
                <div className="space-y-10">
                  {/* Symmetric Mode */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-black text-emerald-400 border border-emerald-500/30 shadow-[inset_0_2px_10px_rgba(16,185,129,0.3)]">A</div>
                      <h4 className="text-xs font-bold uppercase text-[var(--text-main)] drop-shadow-sm">Symmetric Mode (Password)</h4>
                    </div>
                    <ul className="space-y-3 ml-8 text-[11px] text-[var(--text-muted)]">
                      {[
                        "Select the file you want to secure.",
                        "Enter a strong password. We use Argon2id to protect your password from brute-force attacks.",
                        "Click 'Secure File' to start Triple Layer encryption (AES + ChaCha + XChaCha).",
                        "Download the generated .enc file and store it safely."
                      ].map((step, i) => (
                        <li key={i} className="flex gap-3">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5 drop-shadow-sm" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Hybrid Mode */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] font-black text-cyan-400 border border-cyan-500/30 shadow-[inset_0_2px_10px_rgba(6,182,212,0.3)]">B</div>
                      <h4 className="text-xs font-bold uppercase text-[var(--text-main)] drop-shadow-sm">Hybrid Mode (RSA-4096)</h4>
                    </div>
                    <ul className="space-y-3 ml-8 text-[11px] text-[var(--text-muted)]">
                      {[
                        "Use the 'New Pair' button in Hybrid mode to generate a new RSA-4096 key pair.",
                        "For Encryption: Enter the recipient's 'Public Key'.",
                        "For Decryption: Enter your own 'Private Key'.",
                        "This mode is highly secure for sharing files without having to share passwords directly."
                      ].map((step, i) => (
                        <li key={i} className="flex gap-3">
                          <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5 drop-shadow-sm" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* Security Architecture Deep Dive */}
              <section className="space-y-8 text-left">
                <div className="flex items-center gap-2 text-purple-400 drop-shadow-sm">
                  <Layers className="w-5 h-5" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Security Architecture</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl glass-card border border-[var(--border-color)] space-y-4 hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex items-center gap-2 text-[var(--text-main)] drop-shadow-sm">
                      <Binary className="w-5 h-5 text-cyan-400" />
                      <h4 className="text-xs font-bold uppercase">Triple Layer Encryption</h4>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      Your data is encrypted three times sequentially using <strong className="text-[var(--text-main)]">AES-256-GCM</strong>, <strong className="text-[var(--text-main)]">ChaCha20-Poly1305</strong>, and <strong className="text-[var(--text-main)]">XChaCha20-Poly1305</strong>. Each layer has a unique key derived via HKDF, ensuring that if one algorithm is found to have a flaw, your data remains protected by the other layers.
                    </p>
                  </div>
                  <div className="p-6 rounded-2xl glass-card border border-[var(--border-color)] space-y-4 hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex items-center gap-2 text-[var(--text-main)] drop-shadow-sm">
                      <Fingerprint className="w-5 h-5 text-purple-400" />
                      <h4 className="text-xs font-bold uppercase">Argon2id Hardening</h4>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      We use <strong className="text-[var(--text-main)]">Argon2id</strong> to transform your password into an encryption key. Our <strong className="text-[var(--text-main)]">"Standard"</strong> (512MB RAM) is already significantly stronger than typical industry defaults. For absolute protection, the <strong className="text-[var(--text-main)]">"Ultra"</strong> profile (2GB RAM) can be enabled in settings, though it requires a powerful device to avoid browser crashes.
                    </p>
                  </div>
                  <div className="p-6 rounded-2xl glass-card border border-[var(--border-color)] space-y-4 hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex items-center gap-2 text-[var(--text-main)] drop-shadow-sm">
                      <Key className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-xs font-bold uppercase">RSA-4096 & SHA-512</h4>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      For hybrid mode, we use highly robust <strong className="text-[var(--text-main)]">RSA-4096-OAEP (SHA-512)</strong>. Additionally, every encrypted file includes a <strong className="text-[var(--text-main)]">SHA-512</strong> hash to verify data integrity, ensuring the file has not been modified by a third party.
                    </p>
                  </div>
                  <div className="p-6 rounded-2xl glass-card border border-[var(--border-color)] space-y-4 hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex items-center gap-2 text-[var(--text-main)] drop-shadow-sm">
                      <Zap className="w-5 h-5 text-orange-400" />
                      <h4 className="text-xs font-bold uppercase">Post-Quantum Ready</h4>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      Our data packet structure is designed for future compatibility with <strong className="text-[var(--text-main)]">Post-Quantum (Kyber-1024)</strong> algorithms, ensuring your data remains secure even in the era of quantum computing.
                    </p>
                  </div>
                </div>
              </section>

              {/* Developer */}
              <section className="p-8 rounded-[2rem] glass-card border border-[var(--border-color)] relative overflow-hidden text-left">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Cpu className="w-32 h-32 text-[var(--text-main)]" />
                </div>
                <div className="relative z-10 space-y-6">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-cyan-400 mb-2 drop-shadow-sm">Developer Information</h3>
                    <p className="text-[var(--text-muted)] text-sm font-medium">Developed by <strong className="text-[var(--text-main)] drop-shadow-sm">John</strong>. Crafted with full dedication to digital privacy and security.</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <a 
                      href="https://github.com/THENASUKASUSU" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl glass-button border border-[var(--border-color)] transition-all group cursor-pointer"
                    >
                      <Github className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
                      <span className="text-xs font-bold text-[var(--text-main)]">GitHub</span>
                    </a>
                    <a 
                      href="mailto:thenahamil@gmail.com" 
                      className="flex items-center gap-2 px-4 py-2 rounded-xl glass-button border border-[var(--border-color)] transition-all group cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-[var(--text-muted)] group-hover:text-cyan-400" />
                      <span className="text-xs font-bold text-[var(--text-main)]">Email Contact</span>
                    </a>
                    <a 
                      href="https://wa.me/6282293087868?text=hello+bro,+add+new+feature" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl glass-button border border-[var(--border-color)] transition-all group cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-[var(--text-muted)] group-hover:text-emerald-400" />
                      <span className="text-xs font-bold text-[var(--text-main)]">WhatsApp</span>
                    </a>
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[var(--border-color)] bg-black/10 backdrop-blur-md text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--text-muted)] opacity-50 drop-shadow-sm">
                John • 2026 • Secure by Design
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
