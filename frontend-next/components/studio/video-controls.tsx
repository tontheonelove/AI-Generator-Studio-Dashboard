'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { UploadBox } from '@/components/studio/upload-box';
import { readSSE } from '@/lib/stream';
import { VIDEO_MODELS } from '@/lib/models';
import type { TabProps } from '@/lib/types';

// MiniMax / LTX 2.5 / Fast T2V Resolution Mapping
const MINIMAX_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '0.2': { width: 608, height: 352 },
  '0.3': { width: 736, height: 416 },
  '0.4': { width: 864, height: 480 },
  '0.5': { width: 960, height: 544 },
  '0.6': { width: 1056, height: 608 },
  '0.7': { width: 1152, height: 640 },
  '0.8': { width: 1216, height: 672 },
  '0.9': { width: 1280, height: 736 },
  '0.98': { width: 1344, height: 768 },
  '1.0': { width: 1376, height: 768 },
  '1.2': { width: 1504, height: 832 },
  '1.5': { width: 1664, height: 928 },
  '1.8': { width: 1824, height: 1024 },
  '2.0': { width: 1920, height: 1088 },
};

const ASPECT_RATIOS = [
  { value: '9:16 (Portrait Widescreen)', label: '📱 9:16 Portrait (TikTok/Reels)' },
  { value: '16:9 (Landscape Widescreen)', label: '🖥️ 16:9 Landscape (YouTube)' },
  { value: '1:1 (Square)', label: '⬜ 1:1 Square (Instagram)' },
  { value: '4:3 (Classic)', label: '📺 4:3 Classic' },
  { value: '3:4 (Portrait Classic)', label: '📷 3:4 Portrait Classic' },
  { value: '21:9 (Ultrawide)', label: '🎞️ 21:9 Ultrawide (Cinema)' },
];

export function VideoControls({ onLoading, onResult }: TabProps) {
  const [model, setModel] = useState(VIDEO_MODELS[0].value);
  const [prompt, setPrompt] = useState('');
  const [imageFilename, setImageFilename] = useState('');
  const [audioFilename, setAudioFilename] = useState('');
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0].value);
  const [megapixels, setMegapixels] = useState('1.0');
  const [duration, setDuration] = useState(5);
  const [fps, setFps] = useState(24);

  const currentModel = useMemo(
    () => VIDEO_MODELS.find((m) => m.value === model),
    [model]
  );

  // ✅ Fast H3 (ทั้ง I2V และ T2V)
  const isFastH3 = model.startsWith('Fast Video H3');
  const isFastH3I2V = model === 'Fast Video H3 I2V';
  const isFastH3T2V = model === 'Fast Video H3 T2V';
  
  // MiniMax/LTX 2.5 (exclude ทั้ง Fast H3 I2V และ T2V)
  const isMiniMaxOrLTX25 = useMemo(() => {
    return (model.startsWith('MiniMax H3') || model.startsWith('LTX 2.5')) && !isFastH3;
  }, [model, isFastH3]);

  // ✅ Fast T2V ต้องการ aspect ratio + resolution เหมือน MiniMax
  const needsAspectRatio = isMiniMaxOrLTX25 || isFastH3T2V;

  const isLipsync = model === 'LTX 2.3 Lipsync';

  // คำนวณ width/height สำหรับ MiniMax / LTX 2.5 / Fast T2V
  const calculatedResolution = useMemo(() => {
    if (!needsAspectRatio) return { width: 1024, height: 1024 };
    const res = MINIMAX_RESOLUTIONS[megapixels];
    if (!res) return { width: 1024, height: 1024 };

    let { width, height } = res;
    if (aspectRatio.includes('Portrait') || aspectRatio.includes('3:4')) {
      [width, height] = [height, width];
    }
    return { width, height };
  }, [needsAspectRatio, megapixels, aspectRatio]);

  async function generate() {
    // Validation
    if (!prompt.trim() && !isLipsync) {
      alert('Please enter a prompt!');
      return;
    }
    if (currentModel?.needsImage && !imageFilename) {
      alert('⚠️ Please upload an image!');
      return;
    }
    if (isLipsync && !audioFilename) {
      alert('⚠️ Lipsync requires an audio file!');
      return;
    }

    onResult(null);
    onLoading({ 
      title: isFastH3 ? '⚡ Fast Generating Video...' : 'Generating Video...', 
      detail: isFastH3 ? '8-step turbo mode - faster than normal...' : 'This may take several minutes...' 
    });

    try {
      const payload = {
        prompt: prompt || 'default',
        model,
        image1_filename: imageFilename,
        audio_filename: audioFilename,
        // ✅ Fast I2V ใช้ 1024 placeholder (auto จาก image), Fast T2V ใช้ calculated, อื่นๆ ใช้ calculated
        width: isFastH3I2V ? 1024 : calculatedResolution.width,
        height: isFastH3I2V ? 1024 : calculatedResolution.height,
        length: duration,
        fps: (isMiniMaxOrLTX25 || isFastH3) ? 24.0 : fps,
        aspect_ratio: aspectRatio,
        megapixels: needsAspectRatio ? parseFloat(megapixels) : 1.0,
      };

      for await (const ev of readSSE('/api/generate-video-stream', payload)) {
        if (ev.type === 'progress') {
          const pct = Math.round((ev.value / ev.max) * 100);
          onLoading({ title: `${pct}%`, detail: 'Processing video...', progress: pct });
        } else if (ev.type === 'executing' && ev.node) {
          onLoading({ title: 'Generating Video...', detail: `Processing node ${ev.node}...` });
        } else if (ev.type === 'saved') {
          onResult({
            kind: 'video',
            url: ev.url,
            seed: ev.seed,
            filename: ev.filename,
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
      {/* Video Model */}
      <div className="space-y-2">
        <Label>Video Model</Label>
        <Select value={model} onValueChange={(v) => v && setModel(v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[320px] max-w-[90vw]">
            {VIDEO_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ✅ Fast Video H3 Info Box */}
      {isFastH3 && (
        <div className="rounded-lg border border-emerald-700/30 bg-emerald-900/20 p-3 text-xs text-emerald-300">
          <span className="mr-1">⚡</span>
          <strong>Fast Mode (8 Steps):</strong> เร็วกว่า MiniMax H3 ปกติ 3-4 เท่า พร้อม auto audio generation. FPS fixed ที่ 24
        </div>
      )}

      {/* Image Upload (เฉพาะ I2V models - ซ่อน T2V) */}
      {currentModel?.needsImage && (
        <UploadBox
          label="📷 Input Image"
          kind="image"
          onUploaded={setImageFilename}
          required
        />
      )}

      {/* Audio Upload (สำหรับ Lipsync เท่านั้น) */}
      {isLipsync && (
        <UploadBox
          label="🎵 Audio File"
          kind="audio"
          onUploaded={setAudioFilename}
          required
        />
      )}

      {/* Prompt */}
      <div className="space-y-2">
        <Label>📝 Prompt</Label>
        <Textarea
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            isFastH3
              ? "Describe the video motion, camera action, and scene... (8-step turbo mode)"
              : "Describe the video you want to create..."
          }
        />
      </div>

      {/* ✅ Aspect Ratio + Resolution (สำหรับ MiniMax, LTX 2.5, Fast T2V) */}
      {needsAspectRatio && (
        <>
          <div className="space-y-2">
            <Label>📐 Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={(v) => v && setAspectRatio(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[280px]">
                {ASPECT_RATIOS.map((ar) => (
                  <SelectItem key={ar.value} value={ar.value}>{ar.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>📊 Resolution</Label>
            <Select value={megapixels} onValueChange={(v) => v && setMegapixels(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[280px]">
                {Object.entries(MINIMAX_RESOLUTIONS).map(([mp, size]) => (
                  <SelectItem key={mp} value={mp}>
                    {mp} MP - {size.width} x {size.height}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-emerald-400">
              Output: {calculatedResolution.width} x {calculatedResolution.height}
            </p>
          </div>
        </>
      )}

      {/* ✅ Fast I2V Auto Info (ไม่มี aspect ratio/resolution dropdown) */}
      {isFastH3I2V && (
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5 text-[10px] text-slate-400">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500">📐 Aspect Ratio:</span>{' '}
              <span className="text-emerald-400">Auto (from image)</span>
            </div>
            <div>
              <span className="text-slate-500">📊 Resolution:</span>{' '}
              <span className="text-emerald-400">Auto (~0.7 MP)</span>
            </div>
            <div>
              <span className="text-slate-500">🎞️ FPS:</span>{' '}
              <span className="text-emerald-400">Fixed 24</span>
            </div>
            <div>
              <span className="text-slate-500">🔊 Audio:</span>{' '}
              <span className="text-emerald-400">Auto generated</span>
            </div>
          </div>
        </div>
      )}

      {/* Duration */}
      <div className="space-y-2">
        <Label>⏱️ Duration (seconds)</Label>
        <Input
          type="number"
          min={1}
          max={10}
          step={0.5}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
        {isFastH3 && (
          <p className="text-[10px] text-amber-400">
            💡 แนะนำ 5 วินาทีสำหรับ quick preview, 10 วินาทีสำหรับ full video
          </p>
        )}
      </div>

      {/* FPS (เฉพาะ LTX Video 2.3 เท่านั้น) */}
      {!isMiniMaxOrLTX25 && !isFastH3 && (
        <div className="space-y-2">
          <Label>🎞️ FPS</Label>
          <Input
            type="number"
            min={12}
            max={30}
            value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
          />
        </div>
      )}

      {/* Generate Button */}
      <Button
        onClick={generate}
        className={`w-full bg-gradient-to-r ${
          isFastH3
            ? 'from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500'
            : 'from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500'
        }`}
      >
        {isFastH3 ? '⚡ Fast Generate Video' : '🎬 Generate Video'}
      </Button>
    </div>
  );
}