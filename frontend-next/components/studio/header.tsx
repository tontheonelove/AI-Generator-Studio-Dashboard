'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/studio/theme-toggle';
import { VersionBadge } from '@/components/studio/version-badge';
import { UpdateModal } from '@/components/studio/update-modal'; 

const PAGE_TITLES: Record<string, { title: string; subtitle: string; color: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Welcome to AI-Generation Studio', color: 'from-emerald-500 to-teal-500' },
  '/image': { title: 'Image Generation', subtitle: 'Create stunning images with AI', color: 'from-blue-500 to-cyan-500' },
  '/video': { title: 'Video Generation', subtitle: 'Bring your ideas to life', color: 'from-purple-500 to-pink-500' },
  '/audio': { title: 'Audio Generation', subtitle: 'Compose music with AI', color: 'from-pink-500 to-rose-500' },
  '/edit': { title: 'Image Edit', subtitle: 'Transform your images', color: 'from-orange-500 to-red-500' },
  '/tools': { title: 'Tools', subtitle: 'Professional AI tools', color: 'from-amber-500 to-yellow-500' },
  '/gallery': { title: 'Gallery', subtitle: 'Browse your creations', color: 'from-violet-500 to-fuchsia-500' },
};

export function Header() {
  const pathname = usePathname();
  const pageInfo = PAGE_TITLES[pathname] || PAGE_TITLES['/'];

  return (
    <>
      <header className="sticky top-0 z-30 flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 md:px-6">
        {/* Page Title */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3"
        >
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${pageInfo.color} text-white shadow-lg`}>
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <motion.h1
              className="text-lg font-bold text-slate-900 dark:text-white md:text-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {pageInfo.title}
            </motion.h1>
            <motion.p
              className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {pageInfo.subtitle}
            </motion.p>
          </div>
        </motion.div>

        <div className="flex items-center gap-2 md:gap-3">
          <VersionBadge />
          <ThemeToggle />
        </div>
      </header>

      {/* Update Modal */}
      <UpdateModal />
    </>
  );
}