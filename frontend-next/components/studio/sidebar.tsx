'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, Image as ImageIcon, Video, Music, Wand2, Wrench,
  Menu, Sparkles, LayoutGrid, UserCircle,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, color: 'from-emerald-500 to-teal-500' },
  { href: '/gallery', label: 'Gallery', icon: LayoutGrid, color: 'from-violet-500 to-fuchsia-500' },
  { href: '/image', label: 'Image Generation', icon: ImageIcon, color: 'from-blue-500 to-cyan-500' },
  { href: '/video', label: 'Video Generation', icon: Video, color: 'from-purple-500 to-pink-500' },
  { href: '/audio', label: 'Audio Generation', icon: Music, color: 'from-pink-500 to-rose-500' },
  { href: '/edit', label: 'Edit', icon: Wand2, color: 'from-orange-500 to-red-500' },
  { href: '/tools', label: 'Tools', icon: Wrench, color: 'from-amber-500 to-yellow-500' },
  { href: '/about', label: 'About', icon: UserCircle, color: 'from-rose-500 to-orange-500' },
];

function NavItems({ pathname, onItemClick }: { 
  pathname: string; 
  onItemClick?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-2 lg:p-3">
      {ITEMS.map((item, index) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        
        return (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <Link
              href={item.href}
              title={item.label}
              onClick={onItemClick}
              className={cn(
                'group relative flex items-center justify-center gap-3 rounded-xl border px-2 py-3 text-sm font-medium transition-all duration-300 lg:justify-start lg:px-3',
                active
                  ? 'border-transparent text-white shadow-lg'
                  : 'border-transparent text-slate-500 hover:border-slate-200/50 hover:bg-slate-100/50 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700/50 dark:hover:bg-slate-800/50 dark:hover:text-white'
              )}
            >
              {active && (
                <motion.div
                  layoutId="activeNavBg"
                  className={cn('absolute inset-0 rounded-xl bg-gradient-to-r opacity-90', item.color)}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              <div className="relative z-10">
                <Icon className={cn('h-5 w-5 shrink-0 transition-transform', active && 'scale-110')} />
              </div>
              
              <span className={cn('relative z-10 hidden lg:inline', active && 'font-semibold')}>
                {item.label}
              </span>

              {active && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white lg:hidden"
                />
              )}
            </Link>
          </motion.div>
        );
      })}
    </nav>
  );
}

function StatusBadge() {
  return (
    <div className="border-t border-slate-200/50 p-2 dark:border-slate-800 lg:p-4">
      <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500 pulse-ring" />
        <span className="hidden lg:inline font-medium">System Ready</span>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 h-10 w-10 rounded-full bg-white shadow-lg dark:bg-slate-900 lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800">
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 text-white shadow-lg">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-lg font-bold gradient-text-premium">Studio</span>
              </div>
            </div>

            <NavItems pathname={pathname} onItemClick={() => setMobileOpen(false)} />
            <StatusBadge />
          </div>
        </SheetContent>
      </Sheet>

      <aside className="sticky top-0 z-40 hidden h-screen w-16 shrink-0 flex-col border-r border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 lg:flex lg:w-64">
        <div className="flex h-16 items-center justify-center gap-3 border-b border-slate-200 px-2 dark:border-slate-800 lg:justify-start lg:px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-500 text-white shadow-lg">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="hidden lg:block">
            <div className="text-sm text-slate-500 dark:text-slate-400">AI-Generation</div>
            <div className="text-base font-bold gradient-text-premium">Studio</div>
          </div>
        </div>

        <NavItems pathname={pathname} />
        <StatusBadge />
      </aside>
    </>
  );
}