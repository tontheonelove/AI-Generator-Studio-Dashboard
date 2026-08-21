'use client';

import { motion } from 'framer-motion';

interface Props {
  title?: string;
  detail?: string;
  progress?: number;
}

export function LoadingAnimation({ title, detail, progress }: Props) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md dark:bg-slate-950/90">
      {/* Outer Ring Animation */}
      <div className="relative mb-6">
        {/* Spinning outer ring */}
        <motion.div
          className="h-20 w-20 rounded-full border-4 border-transparent border-t-emerald-500 border-r-blue-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Middle pulsing ring */}
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-transparent border-t-purple-500 border-l-pink-500"
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Inner icon */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 text-xl shadow-lg">
            ✨
          </div>
        </motion.div>

        {/* Orbiting dots */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-emerald-400"
            style={{
              animationDelay: `${i * 0.5}s`,
            }}
            animate={{
              x: [0, Math.cos((i * Math.PI) / 2) * 40, 0],
              y: [0, Math.sin((i * Math.PI) / 2) * 40, 0],
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.5,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Title with shimmer effect */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 text-xl font-bold gradient-text-premium"
      >
        {title || 'Generating...'}
      </motion.h3>

      {/* Detail */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-slate-500 dark:text-slate-400"
      >
        {detail || 'Please wait'}
      </motion.p>

      {/* Progress Bar */}
      {progress !== undefined && (
        <div className="mt-6 w-64">
          <div className="mb-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Progress</span>
            <span className="font-mono font-semibold text-emerald-500">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-emerald-400/50"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, -200],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}