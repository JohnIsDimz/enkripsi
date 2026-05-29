import React from 'react';
import { motion } from 'motion/react';

interface ProgressBarProps {
  progress: number;
  label: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label }) => {
  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest drop-shadow-sm">{label}</span>
        <span className="text-xs font-black text-cyan-400 drop-shadow-sm">{Math.round(progress)}%</span>
      </div>
      <div className="liquid-progress h-3 bg-black/20 border border-[var(--border-color)] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
        <motion.div 
          className="liquid-fill"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        />
      </div>
    </div>
  );
};
