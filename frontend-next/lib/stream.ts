import { BACKEND_URL } from './api';

export async function* readSSE(
  endpoint: string, 
  body: any
): AsyncGenerator<Record<string, any>> {
  // 🆕 เรียกตรงไปที่ Backend ด้วย timeout ที่ยาวมาก
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes
  
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
      try { const j = await res.json(); msg = j.detail || msg; } catch {}
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
    if (err.name === 'AbortError') {
      throw new Error('Request timeout (>5 minutes)');
    }
    throw err;
  }
}