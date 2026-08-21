'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket } from 'lucide-react';

interface VersionInfo {
  version: string;
  release_date?: string;
  features?: string[];
}

export function VersionBadge() {
  const [version, setVersion] = useState<VersionInfo | null>(null);

  useEffect(() => {
    async function fetchVersion() {
      try {
        const res = await fetch('/api/version');
        if (!res.ok) return;
        const data = await res.json();
        setVersion(data);
      } catch (e) {
        console.warn('Failed to fetch version:', e);
      }
    }
    fetchVersion();
  }, []);

  if (!version || version.version === 'unknown') return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5, duration: 0.3 }}
      className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono text-emerald-600 backdrop-blur-sm dark:text-emerald-400"
      title={`Released: ${version.release_date || 'N/A'}`}
    >
      <Rocket className="h-3 w-3" />
      <span className="font-semibold">v{version.version}</span>
    </motion.div>
  );
}