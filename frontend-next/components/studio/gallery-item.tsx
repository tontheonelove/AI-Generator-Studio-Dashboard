'use client';

import { motion } from 'framer-motion';
import { Play, Music, Image, Film } from 'lucide-react';

interface GalleryItemProps {
  item: any;
  onClick: () => void;
}

export function GalleryItem({ item, onClick }: GalleryItemProps) {
  const getType = () => {
    if (item.filename?.endsWith('.mp4')) return 'video';
    if (item.filename?.endsWith('.mp3')) return 'audio';
    return 'image';
  };

  const type = getType();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg transition-all hover:scale-105 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/40"
      onClick={onClick}
    >
      {/* Thumbnail */}
      {type === 'image' && (
        <img
          src={`/api/outputs/${item.filename}`}
          alt={item.prompt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      )}
      {type === 'video' && (
        <>
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="h-12 w-12 text-white drop-shadow-lg" />
          </div>
        </>
      )}
      {type === 'audio' && (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
          <Music className="h-16 w-16 text-white" />
        </div>
      )}

      {/* Type Badge */}
      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
        {type === 'image' && <Image className="h-3 w-3" />}
        {type === 'video' && <Film className="h-3 w-3" />}
        {type === 'audio' && <Music className="h-3 w-3" />}
        <span className="max-w-[80px] truncate">{item.model}</span>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <p className="line-clamp-2 text-xs text-white">
          {item.prompt || 'No prompt'}
        </p>
      </div>
    </motion.div>
  );
}