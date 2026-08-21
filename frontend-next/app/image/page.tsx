'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ResultPanel } from '@/components/studio/result-panel';
import { ImageControls } from '@/components/studio/image-controls';
import { PageTransition } from '@/components/studio/page-transition';
import type { LoadingState, ResultState } from '@/lib/types';

export default function ImagePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState<LoadingState | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);

  // 🎯 Reuse logic: dispatch custom event เมื่อมี reuse param
  useEffect(() => {
    const reuseData = searchParams.get('reuse');
    if (reuseData) {
      try {
        const params = new URLSearchParams(reuseData);
        const detail = {
          model: params.get('model'),
          prompt: params.get('prompt'),
          seed: params.get('seed'),
        };
        
        // Dispatch event เพื่อให้ ImageControls รับไป auto-fill
        window.dispatchEvent(new CustomEvent('reuse-image', { detail }));
        
        // ลบ reuse param ออกจาก URL เพื่อไม่ให้ trigger ซ้ำ
        router.replace('/image', { scroll: false });
      } catch (e) {
        console.error('Failed to parse reuse data:', e);
      }
    }
  }, [searchParams, router]);

  return (
    <PageTransition>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <div className="w-full rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/40 lg:w-1/3">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
              🎨
            </span>
            <span className="gradient-text-premium">Image Generation</span>
          </h2>
          <ImageControls onLoading={setLoading} onResult={setResult} />
        </div>

        <div className="w-full lg:w-2/3">
          <ResultPanel result={result} loading={loading} />
        </div>
      </div>
    </PageTransition>
  );
}