'use client';

import { motion } from 'framer-motion';
import { Sparkles, Heart, Code2, ExternalLink, Globe, Tv, GitBranch } from 'lucide-react';
import { PageTransition } from '@/components/studio/page-transition';

const DEVELOPER_INFO = {
  name: 'TonLikeIT',
  role: 'Full Stack Developer & AI Enthusiast',
  bio: 'ผู้พัฒนา AI-Generation Studio แพลตฟอร์มสร้างสรรค์ผลงานด้วย AI ที่รวมเอาเทคโนโลยีล่าสุดมาไว้ในที่เดียว มุ่งมั่นพัฒนาเครื่องมือที่ใช้งานง่าย ทรงพลัง และเปิดกว้างสำหรับทุกคน',
  socials: [
    {
      name: 'Facebook',
      handle: 'TonLikeIT',
      url: 'https://facebook.com/TonLikeIT',
      icon: Globe,     
      color: 'from-blue-600 to-blue-500',
      hoverColor: 'hover:shadow-blue-500/40',
    },
    {
      name: 'YouTube',
      handle: 'TonLikeIT',
      url: 'https://youtube.com/@TonLikeIT',
      icon: Tv, 
      color: 'from-red-600 to-red-500',
      hoverColor: 'hover:shadow-red-500/40',
    },
    {
      name: 'GitHub',
      handle: 'tontheonelove',
      url: 'https://github.com/tontheonelove',
      icon: GitBranch,   
      color: 'from-slate-700 to-slate-600 dark:from-slate-600 dark:to-slate-500',
      hoverColor: 'hover:shadow-slate-500/40',
    },
  ],
};

export default function AboutPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5, duration: 0.6 }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-500 text-white shadow-2xl"
          >
            <Sparkles className="h-10 w-10" />
          </motion.div>
          <h1 className="text-3xl font-bold gradient-text-premium md:text-4xl">
            About the Developer
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            ผู้สร้าง AI-Generation Studio
          </p>
        </div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/40"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Avatar Placeholder - เปลี่ยนเป็นรูปจริงได้ */}
            <div className="relative">
              <div className="h-28 w-28 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 p-1">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-4xl font-bold text-emerald-600 dark:bg-slate-900 dark:text-emerald-400">
                  T
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white shadow-lg ring-4 ring-white dark:ring-slate-900">
                <Code2 className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {DEVELOPER_INFO.name}
              </h2>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {DEVELOPER_INFO.role}
              </p>
            </div>

            <p className="max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {DEVELOPER_INFO.bio}
            </p>
          </div>
        </motion.div>

        {/* Social Links */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Heart className="h-5 w-5 text-red-500" />
            ติดตาม & ติดต่อ
          </h3>
          <div className="grid gap-3">
            {DEVELOPER_INFO.socials.map((social, index) => (
              <motion.a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className={`group relative flex items-center gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white/80 p-4 shadow-md transition-all hover:scale-[1.02] hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/40 ${social.hoverColor}`}
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-r ${social.color} opacity-0 transition-opacity group-hover:opacity-5`} />

                {/* Icon */}
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${social.color} text-white shadow-lg`}>
                  <social.icon className="h-6 w-6" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {social.name}
                  </p>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {social.handle}
                  </p>
                </div>

                {/* Arrow */}
                <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
              </motion.a>
            ))}
          </div>
        </div>

        {/* Tech Stack Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center dark:border-slate-800 dark:bg-slate-900/20"
        >
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Built with ❤️ using Next.js • FastAPI • ComfyUI • Tailwind CSS
          </p>
        </motion.div>
      </div>
    </PageTransition>
  );
}