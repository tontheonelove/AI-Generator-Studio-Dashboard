import { BACKEND_URL } from './api';

/**
 * Custom error สำหรับแยกกรณี user กด cancel เอง
 * (จะไม่แสดง alert error ใน UI)
 */
export class SSECancelledError extends Error {
  constructor() {
    super('Cancelled by user');
    this.name = 'SSECancelledError';
  }
}

/**
 * อ่าน SSE stream จาก backend endpoint
 * @param endpoint - path เช่น '/api/generate-stream'
 * @param body - payload ส่งไป backend
 * @param externalSignal - AbortSignal จากภายนอก (สำหรับ user กด Cancel)
 * 
 * @throws SSECancelledError เมื่อ user cancel
 * @throws Error เมื่อ timeout (>5 นาที) หรือ error อื่นๆ
 */
export async function* readSSE(
  endpoint: string,
  body: any,
  externalSignal?: AbortSignal
): AsyncGenerator<Record<string, any>> {
  const controller = new AbortController();
  let abortReason: 'timeout' | 'cancel' | null = null;

  // 1) Internal timeout 5 นาที
  const timeoutId = setTimeout(() => {
    abortReason = 'timeout';
    controller.abort();
  }, 300000);

  // 2) External cancel (user กดปุ่ม Cancel)
  const onExternalAbort = () => {
    abortReason = 'cancel';
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      abortReason = 'cancel';
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  try {
    const res = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok || !res.body) {
      let msg = 'Request failed';
      try {
        const j = await res.json();
        msg = j.detail || msg;
      } catch {}
      throw new Error(msg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const data = trimmed.slice(6).trim();
            if (data) yield JSON.parse(data);
          } catch (e) {
            console.error('SSE parse error:', e, 'Line:', trimmed);
          }
        }
      }
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }

    if (err.name === 'AbortError') {
      if (abortReason === 'cancel') {
        throw new SSECancelledError();
      }
      throw new Error('Request timeout (>5 minutes)');
    }
    throw err;
  }
}

/**
 * เรียก backend เพื่อยุติ job ใน ComfyUI (ส่ง /interrupt)
 * ควรเรียกพร้อมกันกับที่ abort externalSignal ฝั่ง frontend
 */
export async function cancelBackendJob(): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/api/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.warn('Failed to notify backend cancel:', e);
    // ไม่ throw เพราะ frontend ยัง abort stream ได้เอง
  }
}