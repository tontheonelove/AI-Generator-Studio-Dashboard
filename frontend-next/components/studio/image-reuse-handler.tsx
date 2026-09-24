'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface ImageReuseHandlerProps {
  onReuse: (data: { model?: string; prompt?: string; seed?: string }) => void;
}

/**
 * Component ที่จัดการ reuse settings จาก URL params
 * แยกออกมาเพื่อ wrap ด้วย Suspense ได้
 */
export function ImageReuseHandler({ onReuse }: ImageReuseHandlerProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const reuseParam = searchParams.get('reuse');
    if (reuseParam) {
      try {
        const params = new URLSearchParams(reuseParam);
        const reuseData = {
          model: params.get('model') || undefined,
          prompt: params.get('prompt') || undefined,
          seed: params.get('seed') || undefined,
        };
        onReuse(reuseData);
        
        // Dispatch event ให้ image-controls.tsx รับ
        window.dispatchEvent(new CustomEvent('reuse-image', { detail: reuseData }));
      } catch (e) {
        console.error('[Reuse] Failed to parse params:', e);
      }
    }
  }, [searchParams, onReuse]);

  return null; // ไม่ render อะไร
}