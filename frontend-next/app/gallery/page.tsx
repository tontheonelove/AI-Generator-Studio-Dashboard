'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadGallery, deleteHistoryItem } from '@/lib/api';
import { GalleryItem } from '@/components/studio/gallery-item';
import { GalleryFilters } from '@/components/studio/gallery-filters';
import { GalleryLightbox } from '@/components/studio/gallery-lightbox';
import { PageTransition } from '@/components/studio/page-transition';
import { Image } from 'lucide-react';

export default function GalleryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxItem, setLightboxItem] = useState<any | null>(null);

  useEffect(() => {
    loadGallery()
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (filename: string) => {
    const success = await deleteHistoryItem(filename);
    if (success) {
      setItems(items.filter((item) => item.filename !== filename));
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (activeFilter !== 'all') {
      const type = item.filename?.endsWith('.mp4')
        ? 'video'
        : item.filename?.endsWith('.mp3')
        ? 'audio'
        : 'image';
      if (type !== activeFilter) return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesPrompt = item.prompt?.toLowerCase().includes(query);
      const matchesModel = item.model?.toLowerCase().includes(query);
      if (!matchesPrompt && !matchesModel) return false;
    }

    return true;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'newest') return (b.timestamp || 0) - (a.timestamp || 0);
    if (sortBy === 'oldest') return (a.timestamp || 0) - (b.timestamp || 0);
    if (sortBy === 'model') return (a.model || '').localeCompare(b.model || '');
    return 0;
  });

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
              🖼️
            </span>
            <span className="gradient-text-premium">Gallery</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Browse and manage your creations ({sortedItems.length} items)
          </p>
        </div>

        {/* Filters */}
        <GalleryFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Gallery Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white/80 py-20 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <Image className="mb-4 h-24 w-24 text-slate-300 dark:text-slate-600" />
            <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400">
              No creations yet
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Start generating to see your work here!
            </p>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
          >
            <AnimatePresence>
              {sortedItems.map((item) => (
                <GalleryItem
                  key={item.filename}
                  item={item}
                  onClick={() => setLightboxItem(item)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Lightbox Popup */}
      <GalleryLightbox
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
        onDelete={handleDelete}
      />
    </PageTransition>
  );
}