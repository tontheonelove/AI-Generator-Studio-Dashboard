'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VersionInfo {
  version: string;
  release_date?: string;
  features?: string[];
}

export function UpdateModal() {
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function checkUpdate() {
      try {
        const res = await fetch('/api/version');
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.version && data.version !== 'unknown') {
          const seenVersion = localStorage.getItem('seenVersion');
          
          if (data.version !== seenVersion) {
            setVersion(data);
            // delay เล็กน้อยให้หน้าโหลดเสร็จก่อน
            setTimeout(() => setIsOpen(true), 800);
          }
        }
      } catch (e) {
        console.warn('Failed to check version:', e);
      }
    }
    
    checkUpdate();
  }, []);

  function handleClose() {
    setIsOpen(false);
    if (version) {
      localStorage.setItem('seenVersion', version.version);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && version && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
            className="fixed left-1/2 top-1/2 z-[101] w-full max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              {/* Header */}
              <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 p-6">
                {/* Decorative circles */}
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        มีอัปเดตใหม่!
                      </h3>
                      <p className="text-sm text-white/80">
                        What's new in v{version.version}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Version badge */}
                <div className="relative mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-mono text-white backdrop-blur-sm">
                  <Rocket className="h-3 w-3" />
                  v{version.version}
                  {version.release_date && (
                    <span className="ml-1 text-white/70">
                      • {version.release_date}
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                  ฟีเจอร์ใหม่ในเวอร์ชันนี้:
                </p>
                
                <ul className="space-y-3">
                  {version.features?.map((feature, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 text-white">
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {feature}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <Button
                  onClick={handleClose}
                  className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:from-emerald-400 hover:to-blue-400"
                >
                  <span>รับทราบและเริ่มใช้งาน</span>
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}