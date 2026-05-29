import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Lock, Cpu, Globe, Zap, Copy, RefreshCw, Settings2, Clock, Trash2, History } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { type Argon2Settings, DEFAULT_ARGON2_SETTINGS, HARDENED_ARGON2_SETTINGS, PARANOID_ARGON2_SETTINGS, ULTRA_ARGON2_SETTINGS } from '../lib/crypto';
import { cn } from '../lib/utils';
import { InfoTooltip } from './Tooltip';
import { RecentOperation } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAbout: () => void;
  symmetricKey: string;
  argon2Settings: Argon2Settings;
  setArgon2Settings: (settings: Argon2Settings) => void;
  onGenerateSymmetricKey: () => void;
  recentOperations: RecentOperation[];
  onClearRecentOperations: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  onOpenAbout,
  symmetricKey,
  argon2Settings,
  setArgon2Settings,
  onGenerateSymmetricKey,
  recentOperations,
  onClearRecentOperations,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          
          {/* Sidebar Content */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm glass-card border-l border-[var(--border-color)] z-[101] p-8 overflow-y-auto shadow-[-20px_0_50px_rgba(0,0,0,0.5)] rounded-none rounded-l-3xl"
          >
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-cyan-400 drop-shadow-md" />
                <span className="font-black tracking-tighter text-xl drop-shadow-sm">JohnCrypt</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors glass-button"
              >
                <X className="w-6 h-6 text-[var(--text-muted)] hover:text-[var(--text-main)]" />
              </button>
            </div>

            <div className="space-y-10">
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">About JohnCrypt</h3>
                  <button 
                    onClick={onOpenAbout}
                    className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-blue-400 transition-colors flex items-center gap-1"
                  >
                    Details <Zap className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[var(--text-muted)] leading-relaxed text-sm mb-4">
                  JohnCrypt is a next-generation file security utility that combines military-grade encryption with a high-fidelity user experience. 
                  Unlike traditional tools, JohnCrypt operates entirely within your browser's sandbox.
                </p>
                
                {/* Visual Aesthetic Demo (Optimized - No heavy animations) */}
                <div className="relative h-24 w-full rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--card-bg)] flex items-center justify-center group shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-emerald-500/10 " />
                  <div className="absolute w-40 h-40 bg-cyan-500/5 blur-2xl rounded-full" />
                  <div className="relative z-10 glass-card px-4 py-2.5 border-[var(--border-color)] backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.3)]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] drop-shadow-sm">Liquid Glass UI</p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Symmetric Key Vault</h3>
                  <button 
                    onClick={onGenerateSymmetricKey}
                    className="text-[10px] font-bold uppercase tracking-widest text-orange-400 hover:text-orange-300 flex items-center gap-1"
                  >
                    Generate 256-bit Key <Zap className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                      AES-256 / ChaCha20 Key (Hex)
                      <InfoTooltip content="A 256-bit high-entropy key. Can be used as a master password for symmetric encryption." />
                    </label>
                    <div className="relative group">
                      <div className="w-full glass-card border border-[var(--border-color)] rounded-xl p-3 text-[10px] font-mono text-[var(--text-muted)] break-all min-h-[3rem] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                        {symmetricKey || 'No key generated'}
                      </div>
                      {symmetricKey && (
                        <button 
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(symmetricKey);
                              toast.success('Symmetric Key copied!');
                            } catch (err) {
                              toast.error('Failed to copy key.');
                            }
                          }}
                          className="absolute top-2 right-2 p-1.5 glass-button rounded-lg transition-colors opacity-0 group-hover:opacity-100 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
                        >
                          <Copy className="w-3 h-3 text-orange-400 drop-shadow-sm" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] italic opacity-60">
                  This key can be used as a high-entropy password for symmetric encryption.
                </p>
              </section>

              <section className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Recent Operations</h3>
                  </div>
                  {recentOperations.length > 0 && (
                    <button 
                      onClick={onClearRecentOperations}
                      className="text-[10px] font-bold uppercase tracking-widest text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 px-2 py-1 rounded-md"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  )}
                </div>

                 {recentOperations.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-[var(--border-color)] text-center text-xs text-[var(--text-muted)] italic bg-black/5">
                    No operations in this session yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
                    {recentOperations.map((op) => (
                      <div 
                        key={op.id}
                        className="p-2.5 rounded-xl border border-[var(--border-color)] bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between gap-3 shadow-[0_2px_10px_rgba(0,0,0,0.15)]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[var(--text-main)] truncate" title={op.fileName}>
                            {op.fileName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 font-mono text-[9px]">
                            <span className={cn(
                              "px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide",
                              op.type === 'encrypt' 
                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            )}>
                              {op.type === 'encrypt' ? 'Secure' : 'Unlock'}
                            </span>
                            <span className="text-[var(--text-muted)] opacity-50 font-sans">•</span>
                            <span className="text-[var(--text-muted)] text-[8px] tracking-wide" title="Algorithm Used">
                              {op.algorithm}
                            </span>
                            {op.durationMs !== undefined && (
                              <>
                                <span className="text-[var(--text-muted)] opacity-50 font-sans">•</span>
                                <span className="text-emerald-400 font-bold font-mono text-[8px]" title="Elapsed Processing Time">
                                  {op.durationMs < 1000 
                                    ? `${op.durationMs.toFixed(0)} ms` 
                                    : `${(op.durationMs / 1000).toFixed(2)} s`}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <span className="text-[10px] font-semibold text-[var(--text-main)] font-mono leading-none">
                            {op.fileSize > 1024 * 1024 
                              ? `${(op.fileSize / (1024 * 1024)).toFixed(2)} MB` 
                              : `${(op.fileSize / 1024).toFixed(1)} KB`}
                          </span>
                          <span className="text-[9px] text-[var(--text-muted)] font-mono flex items-center gap-1 opacity-75 leading-none">
                            <Clock className="w-2.5 h-2.5 text-[var(--text-muted)] opacity-50" />
                            {new Date(op.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">Advanced Settings</h3>
                  </div>
                  <button 
                    onClick={() => setArgon2Settings(DEFAULT_ARGON2_SETTINGS)}
                    className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-purple-400 transition-colors"
                  >
                    Reset to Default
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Security Profile Selector */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                      Security Profile
                      <InfoTooltip content="Quickly set Argon2id parameters. 'Ultra' offers maximum protection against specialized hardware attacks." />
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'standard', label: 'Standard', settings: DEFAULT_ARGON2_SETTINGS, color: 'text-blue-400' },
                        { id: 'hardened', label: 'Hardened', settings: HARDENED_ARGON2_SETTINGS, color: 'text-emerald-400' },
                        { id: 'paranoid', label: 'Paranoid', settings: PARANOID_ARGON2_SETTINGS, color: 'text-red-400' },
                        { id: 'ultra', label: 'Ultra', settings: ULTRA_ARGON2_SETTINGS, color: 'text-purple-400' },
                      ].map((profile) => {
                        const isActive = JSON.stringify(argon2Settings) === JSON.stringify(profile.settings);
                        return (
                          <button
                            key={profile.id}
                            onClick={() => {
                              setArgon2Settings(profile.settings);
                              toast.success(`${profile.label} profile applied`);
                            }}
                            className={cn(
                              "py-2 rounded-xl border text-[8px] font-bold uppercase tracking-wider transition-all",
                              isActive 
                                ? profile.id === 'ultra'
                                  ? "bg-[var(--card-bg)] border-purple-500/50 text-purple-400"
                                  : profile.id === 'paranoid' 
                                    ? "bg-[var(--card-bg)] border-red-500/50 text-red-400"
                                    : profile.id === 'hardened'
                                      ? "bg-[var(--card-bg)] border-emerald-500/50 text-emerald-400"
                                      : "bg-[var(--card-bg)] border-blue-500/50 text-blue-400"
                                : "bg-transparent border-[var(--border-color)] text-[var(--text-muted)] hover:border-white/20"
                            )}
                          >
                            {profile.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Iterations */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                        Argon2id Iterations
                        <InfoTooltip content="Number of passes over the memory. More iterations increase the time required for brute-force attacks." />
                      </label>
                      <span className="text-xs font-mono text-purple-400">{argon2Settings.iterations}</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="32" 
                      step="1"
                      value={argon2Settings.iterations}
                      onChange={(e) => setArgon2Settings({ ...argon2Settings, iterations: parseInt(e.target.value) })}
                      className="w-full h-1.5 glass-card border border-[var(--border-color)] rounded-lg appearance-none cursor-pointer accent-purple-500 shadow-[inset_0_1px_5px_rgba(0,0,0,0.5)]"
                    />
                    <p className="text-[9px] text-[var(--text-muted)] opacity-60 drop-shadow-sm">Higher iterations increase protection but take more time.</p>
                  </div>

                  {/* Memory */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2 drop-shadow-sm">
                        Memory Size (KB)
                        <InfoTooltip content="Amount of RAM used during key derivation. High memory usage makes GPU/ASIC cracking extremely expensive." />
                      </label>
                      <span className="text-xs font-mono text-purple-400 drop-shadow-sm">{(argon2Settings.memorySize / 1024).toFixed(0)} MB</span>
                    </div>
                    <input 
                      type="range" 
                      min="16384" 
                      max="2097152" 
                      step="16384"
                      value={argon2Settings.memorySize}
                      onChange={(e) => setArgon2Settings({ ...argon2Settings, memorySize: parseInt(e.target.value) })}
                      className="w-full h-1.5 glass-card border border-[var(--border-color)] rounded-lg appearance-none cursor-pointer accent-purple-500 shadow-[inset_0_1px_5px_rgba(0,0,0,0.5)]"
                    />
                    <p className="text-[9px] text-[var(--text-muted)] opacity-60 drop-shadow-sm">More memory makes brute-force attacks harder. Capped at 2GB for maximum browser stability.</p>
                  </div>

                  {/* Parallelism */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2 drop-shadow-sm">
                        Parallelism (Threads)
                        <InfoTooltip content="Number of CPU threads used. Increasing this speeds up derivation on multi-core systems." />
                      </label>
                      <span className="text-xs font-mono text-purple-400 drop-shadow-sm">{argon2Settings.parallelism}</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="32" 
                      step="1"
                      value={argon2Settings.parallelism}
                      onChange={(e) => setArgon2Settings({ ...argon2Settings, parallelism: parseInt(e.target.value) })}
                      className="w-full h-1.5 glass-card border border-[var(--border-color)] rounded-lg appearance-none cursor-pointer accent-purple-500 shadow-[inset_0_1px_5px_rgba(0,0,0,0.5)]"
                    />
                    <p className="text-[9px] text-[var(--text-muted)] opacity-60 drop-shadow-sm">Number of threads to use. Usually matches CPU cores.</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-4">Complete Usage Guide</h3>
                <div className="space-y-6">
                  {[
                    { 
                      step: "01", 
                      title: "File Selection", 
                      desc: "Click the dropzone or drag any file (PNG, JPG, PDF, ZIP, etc.). Files are processed locally in chunks to handle large data without crashing your browser." 
                    },
                    { 
                      step: "02", 
                      title: "Secure Password", 
                      desc: "Enter a unique password. We use Argon2id, which is computationally expensive, to protect against brute-force attacks. Wait a few seconds for key derivation." 
                    },
                    { 
                      step: "03", 
                      title: "2026 Security Standards", 
                      desc: "Choose between Symmetric (Triple Layer) or Hybrid (RSA-4096 + AES-GCM) mode. Both include SHA-512 integrity and are Post-Quantum ready." 
                    },
                    { 
                      step: "04", 
                      title: "Safe Download", 
                      desc: "Download the resulting .enc file. Store it safely. To decrypt, simply switch to 'Decrypt' mode and use the same password." 
                    }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] font-black text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-[inset_0_2px_5px_rgba(6,182,212,0.3)]">
                          {item.step}
                        </div>
                        {i !== 3 && <div className="w-px h-full bg-white/5 my-1" />}
                      </div>
                      <div className="pb-2">
                        <h4 className="text-xs font-bold mb-1 text-[var(--text-main)] drop-shadow-sm">{item.title}</h4>
                        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed drop-shadow-sm">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-4 drop-shadow-sm">Key Features</h3>
                
                <div className="grid gap-4">
                  {[
                    { icon: <Shield className="w-5 h-5 text-blue-400 drop-shadow-sm" />, title: "Triple Layer Security", desc: "Sequential encryption: AES-256-GCM, ChaCha20, and XChaCha20." },
                    { icon: <Lock className="w-5 h-5 text-purple-400 drop-shadow-sm" />, title: "Hybrid RSA-4096", desc: "Secure key exchange using RSA-4096-OAEP with SHA-512 integrity." },
                    { icon: <Globe className="w-5 h-5 text-emerald-400 drop-shadow-sm" />, title: "100% Client-Side", desc: "Your files never leave your browser. Zero server-side storage." },
                    { icon: <Zap className="w-5 h-5 text-orange-400 drop-shadow-sm" />, title: "Post-Quantum Ready", desc: "Designed for 2026 standards with Kyber-1024 KEM compatibility." }
                  ].map((feature, i) => (
                    <div key={i} className="flex gap-4 p-3 rounded-2xl glass-card transition-colors border border-transparent hover:border-[var(--border-color)] shadow-[0_4px_15px_rgba(0,0,0,0.1)]">
                      <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center shrink-0 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
                        {feature.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold mb-1 text-[var(--text-main)] drop-shadow-sm">{feature.title}</h4>
                        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed drop-shadow-sm">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-4 drop-shadow-sm">Technology Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {['React 19', 'TypeScript', 'Tailwind CSS 4', 'Framer Motion', 'Web Crypto API', 'Vite', 'Express'].map((tech) => (
                    <span key={tech} className="px-3 py-1 rounded-full glass-card border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-muted)] drop-shadow-sm shadow-[0_2px_10px_rgba(0,0,0,0.1)]">
                      {tech}
                    </span>
                  ))}
                </div>
              </section>

              <section className="pt-8 border-t border-white/5">
                <div className="glass-card rounded-2xl p-4 border border-[var(--border-color)] space-y-4 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 drop-shadow-sm">Security Note</p>
                    <p className="text-xs text-[var(--text-muted)] italic leading-relaxed opacity-70 drop-shadow-sm">
                      "Always use a strong, unique password. JohnCrypt does not store your password. If lost, your encrypted files are permanently inaccessible."
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
