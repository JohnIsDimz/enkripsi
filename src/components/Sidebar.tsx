import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Lock, Cpu, Globe, Zap, Copy, RefreshCw, Settings2, Clock, Trash2, History, ExternalLink, ShieldCheck } from 'lucide-react';
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
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm glass-card border-l border-[var(--border-color)] z-[101] p-0 overflow-hidden shadow-[-20px_0_50px_rgba(0,0,0,0.5)] rounded-none rounded-l-3xl flex flex-col"
          >
            {/* Optimized Top Header Section */}
            <div className="relative p-8 pb-6 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    <ShieldCheck className="w-6 h-6 text-cyan-400 drop-shadow-md" />
                  </div>
                  <div>
                    <span className="font-black tracking-tighter text-2xl block leading-none drop-shadow-sm">JohnCrypt</span>
                    <span className="text-[10px] font-bold text-cyan-400/70 uppercase tracking-[0.2em] mt-1 block">Enterprise Security</span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full transition-all glass-button hover:rotate-90"
                >
                  <X className="w-6 h-6 text-[var(--text-muted)] hover:text-[var(--text-main)]" />
                </button>
              </div>

              {/* Status HUD Widget */}
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="p-3 rounded-2xl glass-card border border-white/5 bg-white/5">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">System Status</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-400">OPTIMIZED</span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl glass-card border border-white/5 bg-white/5">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Session ID</span>
                  <span className="text-xs font-mono text-cyan-400">JC-2026-TX</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-2 space-y-10 custom-scrollbar">
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">About JohnCrypt</h3>
                  <button 
                    onClick={onOpenAbout}
                    className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-blue-400 transition-colors flex items-center gap-1 group"
                  >
                    Explore Documentation <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                </div>
                <p className="text-[var(--text-muted)] leading-relaxed text-sm mb-4">
                  JohnCrypt is a next-generation file security utility that combines military-grade encryption with a high-fidelity user experience. 
                  Operates entirely within your browser's sandbox for maximum privacy.
                </p>
                
                {/* Visual Aesthetic Demo */}
                <div className="relative h-24 w-full rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--card-bg)] flex items-center justify-center group shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-emerald-500/10 " />
                  <div className="absolute w-40 h-40 bg-cyan-500/5 blur-2xl rounded-full animate-pulse" />
                  <div className="relative z-10 glass-card px-5 py-3 border-[var(--border-color)] backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.3)] group-hover:scale-105 transition-transform">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 drop-shadow-sm">©John_tamvan 2026</p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Symmetric Key Vault</h3>
                  <button 
                    onClick={onGenerateSymmetricKey}
                    className="text-[10px] font-bold uppercase tracking-widest text-orange-400 hover:text-orange-300 flex items-center gap-1.5 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20 transition-all hover:bg-orange-500/20"
                  >
                    <RefreshCw className="w-3 h-3" /> New Key
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                      Master Cipher Key (256-bit)
                      <InfoTooltip content="A 256-bit high-entropy key generated using browser's secure RNG. Use this as your master password." />
                    </label>
                    <div className="relative group">
                      <div className="w-full glass-card border border-[var(--border-color)] rounded-xl p-4 text-[11px] font-mono text-cyan-400/90 break-all min-h-[4rem] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] bg-black/20">
                        {symmetricKey || 'No key generated'}
                      </div>
                      {symmetricKey && (
                        <button 
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(symmetricKey);
                              toast.success('Key copied to clipboard!');
                            } catch (err) {
                              toast.error('Failed to copy key.');
                            }
                          }}
                          className="absolute top-3 right-3 p-2 glass-button rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-[0_4px_15px_rgba(0,0,0,0.3)] hover:scale-110 active:scale-90"
                        >
                          <Copy className="w-4 h-4 text-orange-400 drop-shadow-sm" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] italic opacity-60 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> Recommended for Symmetric Triple-Layer mode.
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
                      className="text-[10px] font-bold uppercase tracking-widest text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 px-2.5 py-1 rounded-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  )}
                </div>

                 {recentOperations.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-[var(--border-color)] text-center text-xs text-[var(--text-muted)] italic bg-black/10">
                    No operations in this session yet.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                    {recentOperations.map((op) => (
                      <div 
                        key={op.id}
                        className="p-3.5 rounded-2xl border border-[var(--border-color)] bg-white/5 hover:bg-white/10 transition-all flex items-center justify-between gap-3 shadow-[0_4px_15px_rgba(0,0,0,0.1)] group/item"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[var(--text-main)] truncate group-hover/item:text-cyan-400 transition-colors" title={op.fileName}>
                            {op.fileName}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 font-mono text-[9px]">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider",
                              op.type === 'encrypt' 
                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            )}>
                              {op.type === 'encrypt' ? 'Secure' : 'Unlock'}
                            </span>
                            <span className="text-[var(--text-muted)] opacity-30">•</span>
                            <span className="text-[var(--text-muted)] text-[8px] tracking-wide font-bold" title="Algorithm Used">
                              {op.algorithm}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                          <span className="text-[10px] font-black text-[var(--text-main)] font-mono leading-none">
                            {op.fileSize > 1024 * 1024 
                              ? `${(op.fileSize / (1024 * 1024)).toFixed(2)} MB` 
                              : `${(op.fileSize / 1024).toFixed(1)} KB`}
                          </span>
                          <span className="text-[9px] text-[var(--text-muted)] font-mono flex items-center gap-1 opacity-60 leading-none">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(op.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">Security Profile</h3>
                  </div>
                  <button 
                    onClick={() => setArgon2Settings(DEFAULT_ARGON2_SETTINGS)}
                    className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-purple-400 transition-colors"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'standard', label: 'STD', settings: DEFAULT_ARGON2_SETTINGS, color: 'text-blue-400' },
                      { id: 'hardened', label: 'HRD', settings: HARDENED_ARGON2_SETTINGS, color: 'text-emerald-400' },
                      { id: 'paranoid', label: 'PRN', settings: PARANOID_ARGON2_SETTINGS, color: 'text-red-400' },
                      { id: 'ultra', label: 'ULT', settings: ULTRA_ARGON2_SETTINGS, color: 'text-purple-400' },
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
                            "py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                            isActive 
                              ? profile.id === 'ultra'
                                ? "bg-purple-500/10 border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                                : profile.id === 'paranoid' 
                                  ? "bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                  : profile.id === 'hardened'
                                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                    : "bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                              : "bg-transparent border-[var(--border-color)] text-[var(--text-muted)] hover:border-white/20"
                          )}
                          title={profile.id.toUpperCase()}
                        >
                          {profile.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-5 bg-black/20 p-5 rounded-2xl border border-white/5 shadow-inner">
                    {/* Iterations */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                          Iterations
                        </label>
                        <span className="text-xs font-mono text-purple-400 font-bold">{argon2Settings.iterations}</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="32" 
                        step="1"
                        value={argon2Settings.iterations}
                        onChange={(e) => setArgon2Settings({ ...argon2Settings, iterations: parseInt(e.target.value) })}
                        className="w-full h-1.5 glass-card border border-[var(--border-color)] rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>

                    {/* Memory */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                          Memory (MB)
                        </label>
                        <span className="text-xs font-mono text-purple-400 font-bold">{(argon2Settings.memorySize / 1024).toFixed(0)}</span>
                      </div>
                      <input 
                        type="range" 
                        min="16384" 
                        max="2097152" 
                        step="16384"
                        value={argon2Settings.memorySize}
                        onChange={(e) => setArgon2Settings({ ...argon2Settings, memorySize: parseInt(e.target.value) })}
                        className="w-full h-1.5 glass-card border border-[var(--border-color)] rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="pt-8 border-t border-white/5 pb-10">
                <div className="glass-card rounded-2xl p-5 border border-[var(--border-color)] space-y-4 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] bg-black/20">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Security Verified</p>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] italic leading-relaxed opacity-70">
                      "Always use a strong, unique password. JohnCrypt does not store your password. If lost, your encrypted files are permanently inaccessible."
                    </p>
                  </div>
                  <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[9px] font-bold text-cyan-400/50 uppercase tracking-widest">©John_tamvan 2026</span>
                    <div className="flex gap-1">
                      <div className="w-1 h-1 rounded-full bg-cyan-400/30" />
                      <div className="w-1 h-1 rounded-full bg-cyan-400/50" />
                      <div className="w-1 h-1 rounded-full bg-cyan-400/70" />
                    </div>
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
