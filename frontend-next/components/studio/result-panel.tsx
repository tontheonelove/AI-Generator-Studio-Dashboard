'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Download, Sparkles, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingAnimation } from '@/components/studio/loading-animation';
import type { LoadingState, ResultState } from '@/lib/types';

interface Props {
  result: ResultState | null;
  loading: LoadingState | null;
}

export function ResultPanel({ result, loading }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (result?.kind === 'text') {
      navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="relative flex min-h-[500px] flex-col overflow-hidden border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900/40 dark:backdrop-blur-xl">
      <div className="relative m-1 flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950/50 dark:to-slate-900/50">
        {/* Empty State */}
        <AnimatePresence mode="wait">
          {!result && !loading && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500/10 via-blue-500/10 to-purple-500/10 shadow-inner dark:from-emerald-500/20 dark:via-blue-500/20 dark:to-purple-500/20"
                animate={{
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Sparkles className="h-12 w-12 text-emerald-500" />
              </motion.div>
              <h3 className="mb-2 text-2xl font-bold gradient-text-premium">
                Ready to Create
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Select options and start generating amazing content
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result Content */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={JSON.stringify(result)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="flex h-full w-full items-center justify-center p-4"
            >
              {result.kind === 'image' && (
                <motion.img
                  src={result.url}
                  alt="result"
                  className="max-h-[700px] max-w-full rounded-xl object-contain shadow-2xl"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                />
              )}
              {result.kind === 'video' && (
                <motion.video
                  src={result.url}
                  controls
                  className="max-h-[700px] max-w-full rounded-xl shadow-2xl"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                />
              )}
              {result.kind === 'audio' && (
                <motion.div
                  className="flex w-full max-w-[500px] flex-col items-center gap-6 p-8"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                >
                  <motion.div
                    className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl"
                    animate={{
                      scale: [1, 1.05, 1],
                      rotate: [0, 360],
                    }}
                    transition={{
                      scale: { duration: 2, repeat: Infinity },
                      rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
                    }}
                  >
                    <Music className="h-16 w-16 text-white" />
                  </motion.div>
                  <audio src={result.url} controls className="w-full" />
                </motion.div>
              )}
              {result.kind === 'text' && (
                <div className="flex h-full w-full max-w-2xl flex-col gap-3 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold gradient-text-premium">
                      📄 Generated Text
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopy}
                      className="gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <textarea
                    readOnly
                    value={result.text}
                    className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        <AnimatePresence>
          {loading && <LoadingAnimation {...loading} />}
        </AnimatePresence>
      </div>

      {/* Action Bar */}
      <AnimatePresence>
        {result && result.kind !== 'text' && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/50"
          >
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Seed:{' '}
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {'seed' in result ? result.seed : '-'}
              </span>
            </div>
            <a href={result.url} download={result.filename}>
              <Button
                size="sm"
                className="gap-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg hover:from-emerald-400 hover:to-blue-400"
              >
                <Download className="h-4 w-4" /> Download
              </Button>
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}