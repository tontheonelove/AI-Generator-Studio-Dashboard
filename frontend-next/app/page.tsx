'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Image, Film, Music, Sparkles, Wrench } from 'lucide-react';
import { loadGallery } from '@/lib/api';

export default function HomePage() {
  const [recentItems, setRecentItems] = useState<any[]>([]);

  useEffect(() => {
    loadGallery().then((data) => {
      // Get only 6 most recent items
      const sorted = [...data].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setRecentItems(sorted.slice(0, 6));
    });
  }, []);

  const getType = (filename: string) => {
    if (filename.endsWith('.mp4')) return 'video';
    if (filename.endsWith('.mp3')) return 'audio';
    return 'image';
  };

  return (
    <div className="container mx-auto space-y-8 p-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-500/10 via-blue-500/10 to-purple-500/10 p-8 shadow-xl backdrop-blur-xl dark:border-slate-800">
        <h1 className="mb-2 text-4xl font-bold gradient-text-premium">
          Welcome to AI Generation Studio
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Create stunning images, videos, and audio with AI
        </p>
      </div>

      {/* Quick Access */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Quick Access</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { href: '/image', icon: Image, label: 'Image', color: 'from-blue-500 to-cyan-500' },
            { href: '/video', icon: Film, label: 'Video', color: 'from-purple-500 to-pink-500' },
            { href: '/audio', icon: Music, label: 'Audio', color: 'from-emerald-500 to-teal-500' },
            { href: '/edit', icon: Sparkles, label: 'Edit', color: 'from-orange-500 to-red-500' },
            { href: '/tools', icon: Wrench, label: 'Tools', color: 'from-indigo-500 to-purple-500' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-lg transition-all hover:scale-105 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/40"
            >
              <div className={`mb-3 inline-flex rounded-lg bg-gradient-to-br ${item.color} p-3`}>
                <item.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold">{item.label}</h3>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Creations */}
      {recentItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Recent Creations</h2>
            <Link
              href="/gallery"
              className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {recentItems.map((item) => {
              const type = getType(item.filename);
              return (
                <div
                  key={item.filename}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900/40"
                >
                  {type === 'image' && (
                    <img
                      src={`/api/outputs/${item.filename}`}
                      alt={item.prompt}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  )}
                  {type === 'video' && (
                    <video
                      src={`/api/outputs/${item.filename}`}
                      className="h-full w-full object-cover"
                      muted
                      loop
                      onMouseOver={(e) => e.currentTarget.play()}
                      onMouseOut={(e) => {
                        e.currentTarget.pause();
                        e.currentTarget.currentTime = 0;
                      }}
                    />
                  )}
                  {type === 'audio' && (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                      <Music className="h-12 w-12 text-white" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="line-clamp-2 text-xs text-white">
                      {item.prompt || 'No prompt'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}