import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-flex items-center group"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 5 : -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: position === 'top' ? 5 : -5 }}
            className={`absolute z-[200] w-48 p-2 glass-card border border-[var(--border-color)] rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] pointer-events-none ${positions[position]}`}
          >
            <p className="text-[10px] leading-relaxed text-[var(--text-main)] font-medium drop-shadow-sm">
              {content}
            </p>
            {/* Arrow */}
            <div className={`absolute w-2 h-2 bg-black/40 backdrop-blur-md border-r border-b border-[var(--border-color)] rotate-45 ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2' :
              'right-full top-1/2 -translate-y-1/2 translate-x-1/2'
            }`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const InfoTooltip: React.FC<{ content: string; position?: 'top' | 'bottom' | 'left' | 'right' }> = ({ content, position }) => (
  <Tooltip content={content} position={position}>
    <Info className="w-3 h-3 text-[var(--text-muted)] hover:text-cyan-400 transition-colors cursor-help drop-shadow-sm" />
  </Tooltip>
);
