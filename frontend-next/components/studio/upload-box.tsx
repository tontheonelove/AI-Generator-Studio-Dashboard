'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { uploadFile } from '@/lib/api';

interface Props {
  label: string;
  kind: 'image' | 'video' | 'audio';
  onUploaded: (filename: string) => void;
  required?: boolean;
}

export function UploadBox({ label, kind, onUploaded, required }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const accept = kind === 'image' ? 'image/*' : kind === 'video' ? 'video/*' : 'audio/*';

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const name = await uploadFile(kind, file);
      setFilename(name);
      onUploaded(name);
      setPreview(URL.createObjectURL(file));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm text-slate-300">
        {label} {required && <span className="text-red-400">(Required)</span>}
      </p>
      <div
        className="cursor-pointer rounded-lg border-2 border-dashed border-slate-600 p-4 text-center transition hover:border-emerald-500"
        onClick={() => ref.current?.click()}
      >
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={onFile} />
        {preview ? (
          kind === 'image' ? (
            <img src={preview} className="mx-auto mb-2 max-h-40 rounded-lg" alt="preview" />
          ) : kind === 'video' ? (
            <video src={preview} className="mx-auto mb-2 max-h-40 rounded-lg" controls muted />
          ) : (
            <audio src={preview} className="mb-2 w-full" controls />
          )
        ) : (
          <p className="text-sm text-slate-400">
            <Upload className="mr-1 inline h-4 w-4" /> Click to upload {kind}
          </p>
        )}
        {filename && <p className="mt-1 truncate text-xs text-emerald-400">{filename}</p>}
        {busy && <p className="text-xs text-slate-400">Uploading...</p>}
      </div>
    </div>
  );
}