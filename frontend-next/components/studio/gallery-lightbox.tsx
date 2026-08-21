'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Copy, Check, Trash2, RefreshCw, Play, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface LightboxProps {
  item: any | null;
  onClose: () => void;
  onDelete: (filename: string) => void;
}

export function GalleryLightbox({ item, onClose, onDelete }: LightboxProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // ESC key to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (item) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [item]);

  if (!item) return null;

  const getType = () => {
    if (item.filename?.endsWith('.mp4')) return 'video';
    if (item.filename?.endsWith('.mp3')) return 'audio';
    return 'image';
  };

  const type = getType();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(item.prompt || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReuse = () => {
    onClose();
    const params = new URLSearchParams({
      model: item.model || '',
      prompt: item.prompt || '',
      seed: String(item.seed || -1),
    });
    router.push(`/image?reuse=${params.toString()}`);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this item?')) {
      onDelete(item.filename);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {item && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            className="fixed inset-4 z-[201] flex items-center justify-center md:inset-10 lg:inset-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/80 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                    {item.model || 'Unknown Model'}
                  </span>
                  {item.seed && (
                    <span className="text-xs text-slate-400">
                      Seed: <span className="font-mono text-slate-300">{item.seed}</span>
                    </span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
                {/* Media Display */}
                <div className="flex flex-1 items-center justify-center overflow-hidden bg-black/50 p-4">
                  {type === 'image' && (
                    <img
                      src={`/api/outputs/${item.filename}`}
                      alt={item.prompt}
                      className="max-h-full max-w-full rounded-lg object-contain"
                    />
                  )}
                  {type === 'video' && (
                    <video
                      src={`/api/outputs/${item.filename}`}
                      controls
                      autoPlay
                      className="max-h-full max-w-full rounded-lg"
                    />
                  )}
                  {type === 'audio' && (
                    <div className="flex flex-col items-center gap-6">
                      <motion.div
                        className="flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                      >
                        <Music className="h-20 w-20 text-white" />
                      </motion.div>
                      <audio src={`/api/outputs/${item.filename}`} controls className="w-full max-w-md" />
                    </div>
                  )}
                </div>

                {/* Info Panel (right side on desktop) */}
                <div className="flex w-full flex-col border-t border-slate-700 bg-slate-800/50 p-4 lg:w-80 lg:border-l lg:border-t-0">
                  {/* Prompt */}
                  <div className="mb-4 flex-1 overflow-y-auto">
                    <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">Prompt</h4>
                    <p className="text-sm text-slate-200">
                      {item.prompt || 'No prompt'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button
                      onClick={handleReuse}
                      className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:from-emerald-400 hover:to-blue-400"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Re-use Settings
                    </Button>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleCopy}
                        className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        {copied ? (
                          <><Check className="mr-2 h-4 w-4" /> Copied!</>
                        ) : (
                          <><Copy className="mr-2 h-4 w-4" /> Copy Prompt</>
                        )}
                      </Button>

                      <a href={`/api/outputs/${item.filename}`} download={item.filename}>
                        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>

                      <Button
                        variant="outline"
                        onClick={handleDelete}
                        className="border-red-600/50 text-red-400 hover:bg-red-900/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}