import type { Lora } from './types';

// 🆕 Backend URL ตรง (ไม่ผ่าน Next.js rewrites)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function uploadFile(kind: 'image' | 'video' | 'audio', file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BACKEND_URL}/api/upload-${kind}`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const data = await res.json();
  return data.filename as string;
}

export async function loadLoras(model: string): Promise<Lora[]> {
  const res = await fetch(`${BACKEND_URL}/api/loras/${encodeURIComponent(model)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.loras ?? [];
}

export async function loadHistory(): Promise<any[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/history`);
    if (!res.ok) return [];
    return (await res.json()) || [];
  } catch {
    return [];
  }
}

export async function loadGallery(): Promise<any[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/history`);
    if (!res.ok) return [];
    return (await res.json()) || [];
  } catch {
    return [];
  }
}

export async function deleteHistoryItem(filename: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/history/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export { BACKEND_URL };