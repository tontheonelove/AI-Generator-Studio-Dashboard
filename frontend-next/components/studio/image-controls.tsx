'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { loadLoras } from '@/lib/api';
import { readSSE } from '@/lib/stream';
import { IMAGE_MODELS, SIZE_OPTIONS } from '@/lib/models';
import type { Lora, TabProps } from '@/lib/types';

export function ImageControls({ onLoading, onResult }: TabProps) {
  const [model, setModel] = useState(IMAGE_MODELS[0]);
  const [loras, setLoras] = useState<Lora[]>([]);
  const [loraIndex, setLoraIndex] = useState(-1);
  const [prompt, setPrompt] = useState('');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [seed, setSeed] = useState(-1);

  useEffect(() => {
    loadLoras(model).then((list) => { setLoras(list); setLoraIndex(-1); });
  }, [model]);

  useEffect(() => {
    const handleReuse = (e: Event) => {
      const { model: m, prompt: p, seed: s } = (e as CustomEvent).detail;
      if (m) {
        // เช็คก่อนว่ามีโมเดลอยู่ใน IMAGE_MODELS
        if (IMAGE_MODELS.includes(m)) {
          setModel(m);
        }
      }
      if (p) setPrompt(p);
      if (s && s !== '-1') setSeed(Number(s));
    };

    window.addEventListener('reuse-image', handleReuse);
    return () => window.removeEventListener('reuse-image', handleReuse);
  }, []);

async function generate() {
  if (!prompt.trim()) { alert('Please enter a prompt!'); return; }
  const lora = loraIndex >= 0 ? loras[loraIndex] : undefined;

  onResult(null);
  onLoading({ title: 'Generating...', detail: 'Please wait' });

  try {
    // 🆕 ใช้ readSSE แบบใหม่ (เรียกตรง Backend)
    for await (const ev of readSSE('/api/generate-stream', {
      prompt,
      model,
      seed,
      width,
      height,
      lora_filename: lora?.filename ?? '',
      lora_strength: lora?.strength ?? 0,
      mode: 'generate',
    })) {
      if (ev.type === 'progress') {
        const pct = Math.round((ev.value / ev.max) * 100);
        onLoading({ title: `${pct}%`, detail: 'Processing...', progress: pct });
      } else if (ev.type === 'executing' && ev.node) {
        onLoading({ title: 'Generating...', detail: `Processing node ${ev.node}...` });
      } else if (ev.type === 'saved') {
        onResult({ 
          kind: 'image', 
          url: ev.base64 || ev.url,  // ใช้ base64 ถ้ามี
          seed: ev.seed, 
          filename: ev.filename 
        });
      } else if (ev.type === 'error') {
        throw new Error(ev.message);
      }
    }
  } catch (e: any) {
    alert('Error: ' + e.message);
  } finally {
    onLoading(null);
  }
}

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>AI Model</Label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {IMAGE_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>🎨 LoRA Style</Label>
        <Select 
          value={loraIndex >= 0 ? loras[loraIndex].filename : "-1"}
          onValueChange={(v) => {
            if (v === "-1") {
              setLoraIndex(-1);
            } else {
              const index = loras.findIndex(l => l.filename === v);
              setLoraIndex(index);
            }
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="-1">No LoRA</SelectItem>
            {loras.map((l) => (
              <SelectItem key={l.filename} value={l.filename}>{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Prompt</Label>
        <Textarea rows={4} value={prompt}
          onChange={(e) => setPrompt(e.target.value)} placeholder="Describe..." />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Width</Label>
          <Select value={String(width)} onValueChange={(v) => setWidth(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SIZE_OPTIONS.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Height</Label>
          <Select value={String(height)} onValueChange={(v) => setHeight(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SIZE_OPTIONS.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Seed (-1 for random)</Label>
        <Input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
      </div>

      <Button onClick={generate}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500">
        ✨ Generate Masterpiece
      </Button>
    </div>
  );
}