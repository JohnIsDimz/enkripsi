import React, { useCallback, useState } from 'react';
import { Upload, File as FileIcon, X, Trash2, Download, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { BatchItem } from '../types';

interface FileDropZoneProps {
  onFilesSelect: (newFiles: File[]) => void;
  queue: BatchItem[];
  onRemoveItem: (id: string) => void;
  onClearQueue: () => void;
  isProcessing: boolean;
  onDownloadItem: (item: BatchItem) => void;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesSelect,
  queue,
  onRemoveItem,
  onClearQueue,
  isProcessing,
  onDownloadItem
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsDragging(true);
  }, [isProcessing]);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      onFilesSelect(files);
    }
  }, [onFilesSelect, isProcessing]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelect(files);
    }
  };

  const triggerFileInput = () => {
    if (isProcessing) return;
    document.getElementById('fileInput')?.click();
  };

  return (
    <div className="w-full">
      <input
        id="fileInput"
        type="file"
        className="hidden"
        onChange={handleFileChange}
        multiple
        disabled={isProcessing}
      />
      <AnimatePresence mode="wait">
        {queue.length === 0 ? (
          <motion.div
            key="dropzone-empty"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={triggerFileInput}
            className={cn(
              "relative group cursor-pointer border-2 border-dashed rounded-2xl p-10 transition-all duration-300 flex flex-col items-center justify-center gap-4 glass-card",
              isDragging 
                ? "border-cyan-500 bg-cyan-500/10 scale-[1.02] shadow-[0_0_30px_rgba(6,182,212,0.25)]" 
                : "border-[var(--border-color)] hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]"
            )}
          >
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-[inset_0_2px_10px_rgba(6,182,212,0.3)] border border-cyan-500/30">
              <Upload className="w-8 h-8 text-cyan-400 drop-shadow-md" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-[var(--text-main)] drop-shadow-sm">Drag & drop files here</p>
              <p className="text-sm text-[var(--text-muted)]">or click to browse multiple files</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="queue-active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card border border-[var(--border-color)] rounded-2xl p-5 md:p-6 space-y-4 shadow-[0_15px_40px_rgba(0,0,0,0.4)] relative overflow-hidden"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {/* Header of Queue */}
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-color)]">
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)] drop-shadow-sm">
                  Batch Queue ({queue.length})
                </h4>
                <p className="text-[10px] text-[var(--text-muted)] font-medium">
                  {queue.filter(q => q.status === 'completed').length} / {queue.length} processed
                </p>
              </div>
              <button
                type="button"
                onClick={onClearQueue}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Queue
              </button>
            </div>

            {/* Queue List */}
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1.5 custom-scrollbar">
              {queue.map((item) => {
                const isItemProcessing = item.status === 'processing';
                const isItemCompleted = item.status === 'completed';
                const isItemFailed = item.status === 'failed';

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group/row relative p-3 rounded-xl border transition-all duration-300 flex flex-col justify-between overflow-hidden",
                      isItemProcessing 
                        ? "bg-cyan-500/5 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
                        : isItemCompleted 
                          ? "bg-emerald-500/5 border-emerald-500/20" 
                          : isItemFailed 
                            ? "bg-rose-500/5 border-rose-500/20" 
                            : "bg-white/5 hover:bg-white/10 border-[var(--border-color)] hover:border-cyan-500/20"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border",
                          isItemProcessing 
                            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" 
                            : isItemCompleted 
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                              : isItemFailed 
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-400" 
                                : "bg-white/5 border-[var(--border-color)] text-[var(--text-muted)] group-hover/row:text-[var(--text-main)]"
                        )}>
                          {isItemProcessing ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <FileIcon className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[var(--text-main)] truncate drop-shadow-sm">
                            {item.file.name}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] font-mono">
                            {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      {/* Status / Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isItemCompleted && item.resultBlob && (
                          <button
                            type="button"
                            onClick={() => onDownloadItem(item)}
                            className="p-1.5 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-400 rounded-lg transition-colors cursor-pointer"
                            title="Download processed file"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}

                        {!isProcessing && (
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="p-1.5 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-rose-400/70 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}

                        {/* Quiet Badge Indicator */}
                        {item.status === 'queued' && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] border border-[var(--border-color)] px-1.5 py-0.5 rounded-md opacity-60">
                            Queued
                          </span>
                        )}
                        {isItemFailed && (
                          <div className="text-rose-400" title={item.error || 'Failed'}>
                            <AlertCircle className="w-5 h-5" />
                          </div>
                        )}
                        {isItemCompleted && !item.resultBlob && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-1.5 py-0.5 rounded-md">
                            Done
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Indicator inside Row */}
                    {isItemProcessing && (
                      <div className="mt-2.5 w-full space-y-1">
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[8px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                          <span>Processing...</span>
                          <span>{item.progress}%</span>
                        </div>
                      </div>
                    )}

                    {/* Error subtitle */}
                    {isItemFailed && item.error && (
                      <p className="mt-1 text-[9px] text-rose-400 font-mono truncate leading-normal" title={item.error}>
                        Error: {item.error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick interactive zone bottom to drag more files */}
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={isProcessing}
              className={cn(
                "w-full border border-dashed rounded-xl py-3 px-4 flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 bg-transparent text-cyan-400",
                isDragging 
                  ? "border-cyan-500 bg-cyan-500/5" 
                  : isProcessing 
                    ? "opacity-45 cursor-not-allowed" 
                    : "border-[var(--border-color)] hover:border-cyan-500/40 hover:bg-white/5"
              )}
            >
              <Plus className={cn("w-4 h-4", isProcessing && "opacity-50")} />
              <span className="text-xs font-bold uppercase tracking-widest drop-shadow-sm">
                Add More Files
              </span>
            </button>
            {isDragging && !isProcessing && (
              <div className="absolute inset-0 bg-cyan-500/5 backdrop-blur-[2px] rounded-2xl flex items-center justify-center border-2 border-cyan-500 border-dashed pointer-events-none">
                <p className="text-sm font-black uppercase tracking-widest text-cyan-400 drop-shadow-md">
                  Drop to add file(s)
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
