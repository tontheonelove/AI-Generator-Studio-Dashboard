'use client';

import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { UploadBox } from '@/components/studio/upload-box';
import { readSSE, cancelBackendJob, SSECancelledError } from '@/lib/stream';
import { TOOLS_MODELS } from '@/lib/models';
import type { TabProps } from '@/lib/types';

const SCALE_OPTIONS = [
  { value: '2', label: '2x' },
  { value: '4', label: '4x (Recommended)' },
];

const QUALITY_OPTIONS = [
  { value: 'PERFORMANCE', label: '⚡ Performance (Fast)' },
  { value: 'QUALITY', label: '✨ Quality' },
  { value: 'ULTRA', label: '💎 Ultra (Best)' },
];

const LLM_PROMPT_PRESETS = [
  { label: '📝 Describe Image', value: 'Describe this image in detail.' },
  { label: '🎨 Analyze Composition', value: 'Analyze the composition, colors, and visual elements of this image.' },
  { label: '👤 Describe Person', value: 'Describe the person in this image in detail: appearance, clothing, expression, pose.' },
  { label: '📖 Generate Caption', value: 'Generate a detailed caption for this image suitable for social media.' },
  { label: '🔍 OCR Text Extraction', value: 'Extract and list all visible text in this image.' },
  { label: '💡 Suggest Improvements', value: 'Suggest improvements that could be made to this image.' },
];

export function ToolsControls({ onLoading, onResult }: TabProps) {
  const [model, setModel] = useState(TOOLS_MODELS[0].value);
  const [imageFilename, setImageFilename] = useState('');
  const [videoFilename, setVideoFilename] = useState('');
  const [scale, setScale] = useState('4');
  const [quality, setQuality] = useState('ULTRA');
  const [llmPrompt, setLlmPrompt] = useState('Describe this image in detail.');

  // ✅ Cancel feature
  const abortRef = useRef<AbortController | null>(null);
  const cancelledByUserRef = useRef(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const currentModel = useMemo(
    () => TOOLS_MODELS.find((m) => m.value === model),
    [model]
  );

  const isLLM = currentModel?.type === 'llm';
  const isRelayVSR = model.startsWith('RelayVsr-Video');

  // Reset state เมื่อเปลี่ยนโมเดล
  function handleModelChange(newModel: string) {
    setModel(newModel);
    setImageFilename('');
    setVideoFilename('');
  }

  // ✅ ฟังก์ชันยกเลิกรวม
  async function handleCancel() {
    if (!abortRef.current) return;

    cancelledByUserRef.current = true;

    // 1) บอก backend ให้ interrupt ComfyUI
    await cancelBackendJob();

    // 2) abort stream ฝั่ง frontend
    abortRef.current.abort();
  }

  async function generate() {
    if (!currentModel) return;
    if (isGenerating) return;

    // Validation
    if (currentModel.needsImage && !imageFilename) {
      alert('⚠️ Please upload an image!');
      return;
    }
    if (currentModel.needsVideo && !videoFilename) {
      alert('⚠️ Please upload a video!');
      return;
    }
    if (isLLM && !llmPrompt.trim()) {
      alert('⚠️ Please enter a prompt!');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    cancelledByUserRef.current = false;
    setIsGenerating(true);

    let wasCancelled = false;

    onResult(null);

    const endpoint = isLLM ? '/api/llm-stream' : '/api/tools-stream';
    const payload = isLLM
      ? { model, filename: imageFilename, prompt: llmPrompt.trim() }
      : {
          model,
          filename: currentModel.needsVideo ? videoFilename : imageFilename,
          scale: parseInt(scale),
          quality,
        };

    onLoading({
      title: isLLM ? 'Analyzing Image...' : 'Upscaling...',
      detail: isLLM
        ? 'This may take 10-30 seconds...'
        : 'This may take several minutes for videos...',
    });

    try {
      for await (const ev of readSSE(endpoint, payload, controller.signal)) {
        if (ev.type === 'progress') {
          const pct = Math.round((ev.value / ev.max) * 100);
          onLoading({
            title: `${pct}%`,
            detail: isLLM
              ? `Step ${ev.value}/${ev.max}`
              : `Frame/Step ${ev.value}/${ev.max}`,
            progress: pct,
          });
        } else if (ev.type === 'executing' && ev.node) {
          onLoading({
            title: isLLM ? 'Analyzing Image...' : 'Upscaling...',
            detail: `Processing node ${ev.node}...`,
          });
        } else if (ev.type === 'saved') {
          if (ev.is_text) {
            onResult({ kind: 'text', text: ev.text });
          } else if (ev.is_video) {
            onResult({
              kind: 'video',
              url: ev.url,
              seed: '-',
              filename: ev.filename,
            });
          } else {
            onResult({
              kind: 'image',
              url: ev.base64 || ev.url,
              seed: '-',
              filename: ev.filename,
            });
          }
        } else if (ev.type === 'error') {
          throw new Error(ev.message);
        }
      }
    } catch (e: any) {
      const message = String(e?.message || '');

      const isUserCancelled =
        cancelledByUserRef.current ||
        e instanceof SSECancelledError ||
        /No (images|video|audio|output|text) generated|Processing failed/i.test(
          message
        );

      wasCancelled = isUserCancelled;

      if (isUserCancelled) {
        console.log('[Cancel] Tools generation cancelled by user');
        onLoading({
          title: '⏹ Cancelled',
          detail: 'Generation was cancelled',
        });
        setTimeout(() => onLoading(null), 1500);
      } else {
        alert('Error: ' + message);
      }
    } finally {
      abortRef.current = null;
      setIsGenerating(false);
      cancelledByUserRef.current = false;

      if (!wasCancelled) {
        onLoading(null);
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Model Selector */}
      <div className="space-y-2">
        <Label>Tool Model</Label>
        <Select value={model} onValueChange={(v) => v && handleModelChange(v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[320px]">
            {TOOLS_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Image Upload */}
      {currentModel?.needsImage && (
        <UploadBox
          label="📷 Input Image"
          kind="image"
          onUploaded={setImageFilename}
          required
        />
      )}

      {/* Video Upload */}
      {currentModel?.needsVideo && (
        <UploadBox
          label="🎬 Input Video"
          kind="video"
          onUploaded={setVideoFilename}
          required
        />
      )}

      {/* Scale + Quality (เฉพาะ Upscale tools) */}
      {currentModel?.hasScaleQuality && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Scale Factor</Label>
            <Select value={scale} onValueChange={(v) => v && setScale(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCALE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quality</Label>
            <Select value={quality} onValueChange={(v) => v && setQuality(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUALITY_OPTIONS.map((q) => (
                  <SelectItem key={q.value} value={q.value}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* LLM Prompt (เฉพาะ LLM tools) */}
      {isLLM && (
        <div className="space-y-2">
          <Label>📝 Prompt (Instruction)</Label>
          <Textarea
            rows={3}
            value={llmPrompt}
            onChange={(e) => setLlmPrompt(e.target.value)}
            placeholder="Describe what you want to analyze..."
            className="resize-y"
          />

          {/* LLM Prompt Presets */}
          <div className="flex flex-wrap gap-1.5">
            {LLM_PROMPT_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setLlmPrompt(p.value)}
                className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-300 transition hover:bg-blue-600 hover:text-white"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Info Banner */}
      {!isLLM && currentModel?.hasScaleQuality && (
        <div className="rounded-lg border border-blue-700/30 bg-blue-900/20 p-3 text-xs text-blue-300">
          <span className="mr-1">ℹ️</span>
          <strong>{model}</strong> ใช้ NVIDIA RTX GPU สำหรับ AI-powered upscaling
          {model === 'NvidiaPID Upscale 4K' &&
            ' — NvidiaPID เป็นวิธี upscale แบบใหม่'}
        </div>
      )}

      {/* ✅ RelayVSR Info Banner */}
      {isRelayVSR && (
        <div className="rounded-lg border border-violet-700/30 bg-violet-900/20 p-3 text-xs text-violet-300">
          <span className="mr-1">🎬</span>
          <strong>{model.includes('x4') ? 'RelayVSR x4' : 'RelayVSR x2'}:</strong>{' '}
          AI Video Super-Resolution ({model.includes('x4') ? 'ขยาย 4 เท่า' : 'ขยาย 2 เท่า'}) — 1 step เร็วมาก
          คง FPS + เสียงต้นฉบับอัตโนมัติ (ไม่ต้องตั้ง Scale/Quality)
        </div>
      )}

      {/* Generate Button */}
      <Button
        onClick={generate}
        disabled={isGenerating}
        className={`w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 ${
          isGenerating ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        {isGenerating
          ? '⏳ Processing...'
          : isLLM
            ? '🔍 Analyze Image'
            : '⚡ Upscale'}
      </Button>

      {/* ✅ Cancel Button - แสดงเฉพาะตอนกำลังรัน */}
      {isGenerating && (
        <Button
          onClick={handleCancel}
          variant="outline"
          className="w-full border-red-500/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
        >
          ⏹ Cancel Tool Operation
        </Button>
      )}
    </div>
  );
}