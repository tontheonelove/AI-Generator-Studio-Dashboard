'use client';

import { useState } from 'react';
import { ResultPanel } from '@/components/studio/result-panel';
import { EditControls } from '@/components/studio/edit-controls';
import { PageTransition } from '@/components/studio/page-transition';
import type { LoadingState, ResultState } from '@/lib/types';

export default function EditPage() {
  const [loading, setLoading] = useState<LoadingState | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);

  return (
    <PageTransition>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <div className="w-full rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/40 lg:w-1/3">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg">
              ✨
            </span>
            <span className="gradient-text-premium">Image Edit</span>
          </h2>
          <EditControls onLoading={setLoading} onResult={setResult} />
        </div>

        <div className="w-full lg:w-2/3">
          <ResultPanel result={result} loading={loading} />
        </div>
      </div>
    </PageTransition>
  );
}