'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { loadLoras } from '@/lib/api';
import { readSSE, cancelBackendJob, SSECancelledError } from '@/lib/stream';
import { IMAGE_MODELS, SIZE_OPTIONS } from '@/lib/models';
import type { Lora, TabProps } from '@/lib/types';


// ✅ รายชื่อโมเดลที่ไม่รองรับ LoRA
const NO_LORA_MODELS = [
  'Qwen Image 2.1',
  'Qwen Image 2.1 (NSFW)',
  'Qwen Image 2.1 Turbo 8 Step',
  'Flux3 Image Base (50Step)',
  'Flux3 Klein Image Distilled (16Step)',
  'Moss Image SFT',
  'Minimax H3 Image',
  'P-H3-Image',   // ✅ เพิ่ม
  'Ideogram 4',
];

const UPSAMPLER_MODELS = [
  'Flux3 Image Base (50Step)',
  'Flux3 Klein Image Distilled (16Step)',
  'Moss Image SFT',
  'P-H3-Image',   // ✅ เพิ่ม
];

// ✅ โมเดลที่มี Turbo Mode (สลับ Base/Turbo LoRA)
const TURBO_MODELS = ['Minimax H3 Image'];

// ✅ Prompt template สำหรับ Qwen 2.1 (structured format)
const QWEN_21_PROMPT_TEMPLATE = `主題：
[Main subject/theme]

主体：
[Main subject description, position in frame]

人物・表情：
[Character details: face, eyes, expression, hair]

服装・ポーズ：
[Clothing, pose, gestures]

背景・光：
[Background, lighting, atmosphere]

構図・カメラ：
[Aspect ratio, camera angle, focus]

質感・スタイル：
[Style: photorealistic, anime, etc.]

ネガティブ：
[Things to avoid]`;

export function ImageControls({ onLoading, onResult }: TabProps) {
  const [model, setModel] = useState(IMAGE_MODELS[0]);
  const [loras, setLoras] = useState<Lora[]>([]);
  const [loraIndex, setLoraIndex] = useState(-1);
  const [prompt, setPrompt] = useState('');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [seed, setSeed] = useState(-1);
  const [useUpsampler, setUseUpsampler] = useState(false);
  const [useTurbo, setUseTurbo] = useState(false);

  // ✅ Cancel feature
  const abortRef = useRef<AbortController | null>(null);
  const cancelledByUserRef = useRef(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // ✅ Flags
  const supportsLora = !NO_LORA_MODELS.includes(model);
  const isQwen21 = model === 'Qwen Image 2.1' || model === 'Qwen Image 2.1 (NSFW)';
  const isNSFW = model === 'Qwen Image 2.1 (NSFW)';
  const isTurbo8 = model === 'Qwen Image 2.1 Turbo 8 Step';
  const isFlux3Base = model === 'Flux3 Image Base (50Step)';
  const isFlux3Distilled = model === 'Flux3 Klein Image Distilled (16Step)';
  const isFlux3 = isFlux3Base || isFlux3Distilled;
  const isMossSFT = model === 'Moss Image SFT';
  const isMinimaxH3Image = model === 'Minimax H3 Image';
  const isPH3Image = model === 'P-H3-Image';   // ✅ เพิ่ม
  const isUpsamplerModel = UPSAMPLER_MODELS.includes(model);

  useEffect(() => {
    if (supportsLora) {
      loadLoras(model).then((list) => { setLoras(list); setLoraIndex(-1); });
    } else {
      setLoras([]);
      setLoraIndex(-1);
    }
  }, [model, supportsLora]);

  // ✅ ตั้ง Upsampler / Turbo default เมื่อเปลี่ยนโมเดล
  useEffect(() => {
    // P-H3-Image: workflow default switch=true → เปิด Upsampler เป็น default
    if (model === 'Flux3 Klein Image Distilled (16Step)' || model === 'P-H3-Image') {
      setUseUpsampler(true);
    } else {
      setUseUpsampler(false);
    }
    setUseTurbo(false);
  }, [model]);

  useEffect(() => {
    const handleReuse = (e: Event) => {
      const { model: m, prompt: p, seed: s } = (e as CustomEvent).detail;
      if (m) {
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

  function loadQwenTemplate() {
    if (!prompt.trim() || confirm('Replace current prompt with Qwen 2.1 template?')) {
      setPrompt(QWEN_21_PROMPT_TEMPLATE);
    }
  }

  async function handleCancel() {
    if (!abortRef.current) return;
    cancelledByUserRef.current = true;
    await cancelBackendJob();
    abortRef.current.abort();
  }

  async function generate() {
    if (!prompt.trim()) { alert('Please enter a prompt!'); return; }
    if (isGenerating) return;

    const lora = supportsLora && loraIndex >= 0 ? loras[loraIndex] : undefined;

    const controller = new AbortController();
    abortRef.current = controller;
    cancelledByUserRef.current = false;
    setIsGenerating(true);

    let wasCancelled = false;

    onResult(null);
    onLoading({
      title: isFlux3Base ? 'Generating (50 Steps - High Quality)...' :
             isFlux3Distilled ? 'Generating (16 Steps - Balanced)...' :
             isMossSFT ? 'Generating Moss (25 Steps)...' :
             isPH3Image ? 'Generating P-H3 (8 Steps)...' :
             isMinimaxH3Image ? (useTurbo ? 'Generating (8 Steps - Turbo)...' : 'Generating (30 Steps - High Quality)...') :
             'Generating...',
      detail: isFlux3Base ? 'This may take 2-4 minutes...' :
              isFlux3Distilled ? 'This may take 1-2 minutes...' :
              isMossSFT ? 'This may take 1-2 minutes...' :
              isPH3Image ? '8-step manual sigmas - fast...' :
              isMinimaxH3Image ? (useTurbo ? 'Turbo mode - very fast...' : 'This may take 2-3 minutes...') :
              'Please wait'
    });

    try {
      for await (const ev of readSSE('/api/generate-stream', {
        prompt,
        model,
        seed,
        width,
        height,
        lora_filename: lora?.filename ?? '',
        lora_strength: lora?.strength ?? 0,
        use_upsampler: isUpsamplerModel ? useUpsampler : false,
        turbo_mode: TURBO_MODELS.includes(model) ? useTurbo : false,
        mode: 'generate',
      }, controller.signal)) {

        if (ev.type === 'progress') {
          const pct = Math.round((ev.value / ev.max) * 100);
          onLoading({
            title: `${pct}%`,
            detail: `Step ${ev.value}/${ev.max}`,
            progress: pct
          });
        } else if (ev.type === 'executing' && ev.node) {
          onLoading({ title: 'Generating...', detail: `Processing node ${ev.node}...` });
        } else if (ev.type === 'saved') {
          onResult({
            kind: 'image',
            url: ev.base64 || ev.url,
            seed: ev.seed,
            filename: ev.filename
          });
        } else if (ev.type === 'error') {
          throw new Error(ev.message);
        }
      }
    } catch (e: any) {
      const message = String(e?.message || '');

      const isUserCancelled =
        cancelledByUserRef.current ||
        e instanceof SSECancelledError ||
        /No (images|video|audio|output|text) generated/i.test(message);

      wasCancelled = isUserCancelled;

      if (isUserCancelled) {
        console.log('[Cancel] Generation cancelled by user');
        onLoading({ title: '⏹ Cancelled', detail: 'Generation was cancelled' });
        setTimeout(() => onLoading(null), 1500);
      } else {
        alert('Error: ' + message);
        onLoading(null);
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
      {/* Model Selection */}
      <div className="space-y-2">
        <Label>AI Model</Label>
        <Select value={model} onValueChange={(v) => v && setModel(v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[320px] max-w-[90vw]">
            {IMAGE_MODELS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* NSFW Warning Banner */}
      {isNSFW && (
        <div className="rounded-lg border border-red-700/30 bg-red-900/20 p-2.5 text-xs text-red-300">
          <span className="mr-1">⚠️</span>
          <strong>NSFW Mode:</strong> Unlocked content filter. สำหรับผู้ใหญ่เท่านั้น
        </div>
      )}

      {/* Qwen 2.1 Info Banner */}
      {isQwen21 && (
        <div className="rounded-lg border border-emerald-700/30 bg-emerald-900/20 p-2.5 text-xs text-emerald-300">
          <span className="mr-1">💡</span>
          <strong>Qwen 2.1:</strong> แนะนำให้ใช้ structured prompt (主題, 主体, 人物...) เพื่อผลลัพธ์ที่ดีที่สุด
        </div>
      )}

      {/* Turbo 8-Step Info Banner */}
      {isTurbo8 && (
        <div className="rounded-lg border border-amber-700/30 bg-amber-900/20 p-2.5 text-xs text-amber-300">
          <span className="mr-1">⚡</span>
          <strong>Turbo 8-Step:</strong> เร็วกว่า Qwen 2.1 ปกติ 3 เท่า ใช้ prompt แบบอิสระได้ ไม่ต้อง structured format
        </div>
      )}

      {/* Flux3 Base 50-Step Info Banner */}
      {isFlux3Base && (
        <div className="rounded-lg border border-blue-700/30 bg-blue-900/20 p-2.5 text-xs text-blue-300">
          <span className="mr-1">💎</span>
          <strong>Base 50-Step:</strong> คุณภาพสูงสุดแต่ช้า (~2-4 นาที) ถ้าพิมพ์ prompt สั้นๆ แนะนำเปิด AI Prompt Upsampler
        </div>
      )}

      {/* Flux3 Distilled 16-Step Info Banner */}
      {isFlux3Distilled && (
        <div className="rounded-lg border border-teal-700/30 bg-teal-900/20 p-2.5 text-xs text-teal-300">
          <span className="mr-1">⚡</span>
          <strong>Distilled 16-Step:</strong> จุดสมดุลที่ดีที่สุด คุณภาพใกล้เคียง 50-Step แต่เร็วกว่า 3 เท่า Upsampler เปิดเป็น default
        </div>
      )}

      {/* Moss Image SFT Info Banner */}
      {isMossSFT && (
        <div className="rounded-lg border border-lime-700/30 bg-lime-900/20 p-2.5 text-xs text-lime-300">
          <span className="mr-1">🌿</span>
          <strong>Moss Image SFT:</strong> โมเดล 25-step คุณภาพสูง รองรับ prompt แบบโครงสร้างญี่ปุ่น/อังกฤษ สามารถเปิด AI Prompt Upsampler เพื่อขยาย prompt สั้น ๆ ได้
        </div>
      )}

      {/* Minimax H3 Image Info Banner */}
      {isMinimaxH3Image && (
        <div className="rounded-lg border border-sky-700/30 bg-sky-900/20 p-2.5 text-xs text-sky-300">
          <span className="mr-1">🎬</span>
          <strong>Minimax H3 Image:</strong> โมเดลภาพนิ่งจากตระกูล MiniMax H3 — ปิด Turbo = คุณภาพสูงสุด (30 steps), เปิด Turbo = เร็วมาก (8 steps)
        </div>
      )}

      {/* ✅ P-H3-Image Info Banner */}
      {isPH3Image && (
        <div className="rounded-lg border border-fuchsia-700/30 bg-fuchsia-900/20 p-2.5 text-xs text-fuchsia-300">
          <span className="mr-1">🌸</span>
          <strong>P-H3-Image:</strong> 8-step (Manual Sigmas) บนฐาน MiniMax H3 + LoRA เฉพาะ — Upsampler เปิดเป็น default แนะนำพิมพ์ prompt สั้นๆ แล้วให้ AI ขยายรายละเอียด
        </div>
      )}

      {/* LoRA Style */}
      {supportsLora && (
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
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[280px] max-w-[90vw]">
              <SelectItem value="-1">No LoRA</SelectItem>
              {loras.map((l) => (
                <SelectItem key={l.filename} value={l.filename}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Prompt</Label>
          {isQwen21 && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadQwenTemplate}
              className="h-7 px-2 text-xs"
            >
              📝 Load Template
            </Button>
          )}
        </div>
        <Textarea
          rows={isQwen21 ? 12 : 4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            isQwen21
              ? "Use structured format or click 'Load Template'..."
              : isUpsamplerModel
                ? "Describe your image (short prompts will be auto-expanded if Upsampler is ON)..."
                : "Describe..."
          }
          className={isQwen21 ? "font-mono text-xs" : ""}
        />
        {isQwen21 && (
          <p className="text-[10px] text-slate-500">
            💡 Qwen 2.1 works best with structured prompts (主題, 主体, 人物, etc.)
          </p>
        )}
      </div>

      {/* AI Prompt Upsampler Toggle */}
      {isUpsamplerModel && (
        <button
          type="button"
          onClick={() => setUseUpsampler((v) => !v)}
          className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-xs transition ${
            useUpsampler
              ? 'border-purple-500/50 bg-purple-900/20 text-purple-300'
              : 'border-slate-700 bg-slate-800/50 text-slate-400'
          }`}
        >
          <span>
            🪄 <strong>AI Prompt Upsampler</strong>
            <br />
            <span className="text-[10px] opacity-80">
              ให้ AI ขยาย prompt สั้นๆ ของคุณเป็น caption รายละเอียดสูงอัตโนมัติ
            </span>
          </span>
          <span className={`ml-2 shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${useUpsampler ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
            {useUpsampler ? 'ON' : 'OFF'}
          </span>
        </button>
      )}

      {/* Turbo Mode Toggle (Minimax H3 Image) */}
      {isMinimaxH3Image && (
        <button
          type="button"
          onClick={() => setUseTurbo((v) => !v)}
          className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-xs transition ${
            useTurbo
              ? 'border-amber-500/50 bg-amber-900/20 text-amber-300'
              : 'border-slate-700 bg-slate-800/50 text-slate-400'
          }`}
        >
          <span>
            ⚡ <strong>Turbo 8-Step Mode</strong>
            <br />
            <span className="text-[10px] opacity-80">
              เปิด = ใช้ Turbo LoRA (เร็วมาก ~8 steps) | ปิด = Base model (คุณภาพสูงสุด 30 steps)
            </span>
          </span>
          <span className={`ml-2 shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${useTurbo ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
            {useTurbo ? 'ON' : 'OFF'}
          </span>
        </button>
      )}

      {/* Width / Height */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Width</Label>
          <Select value={String(width)} onValueChange={(v) => setWidth(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[140px]">
              {SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={String(s)}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Height</Label>
          <Select value={String(height)} onValueChange={(v) => setHeight(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[140px]">
              {SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={String(s)}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Seed */}
      <div className="space-y-2">
        <Label>Seed (-1 for random)</Label>
        <Input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
      </div>

      {/* Generate Button */}
      <Button
        onClick={generate}
        disabled={isGenerating}
        className={`w-full bg-gradient-to-r ${
          isNSFW
            ? 'from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500'
            : isFlux3Base
              ? 'from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500'
              : isFlux3Distilled
                ? 'from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500'
                : isMossSFT
                  ? 'from-lime-500 to-green-600 hover:from-lime-400 hover:to-green-500'
                  : isPH3Image
                    ? 'from-fuchsia-500 to-purple-600 hover:from-fuchsia-400 hover:to-purple-500'
                    : isMinimaxH3Image
                      ? 'from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500'
                      : isTurbo8
                        ? 'from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500'
                        : 'from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500'
        } ${isGenerating ? 'opacity-60 cursor-not-allowed' : ''}`}>
        {isGenerating ? '⏳ Generating...' :
         isFlux3Base ? '✨ Generate Masterpiece (High Quality)' :
         isFlux3Distilled ? '✨ Generate Masterpiece (Balanced)' :
         isMossSFT ? '🌿 Generate Moss Image' :
         isPH3Image ? '🌸 Generate P-H3 Image' :
         isMinimaxH3Image ? '🎬 Generate with MiniMax H3' :
         '✨ Generate Masterpiece'}
      </Button>

      {/* Cancel Button */}
      {isGenerating && (
        <Button
          onClick={handleCancel}
          variant="outline"
          className="w-full border-red-500/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
        >
          ⏹ Cancel Generation
        </Button>
      )}
    </div>
  );
}