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

// MiniMax / LTX 2.5 Resolution Mapping (16:9 base)
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

  // คำนวณคุณสมบัติตามโมเดลที่เลือก
  const currentModel = useMemo(
    () => VIDEO_MODELS.find((m) => m.value === model),
    [model]
  );

  const isMiniMaxOrLTX25 = useMemo(() => {
    return model.startsWith('MiniMax H3') || model.startsWith('LTX 2.5');
  }, [model]);

  const isLipsync = model === 'LTX 2.3 Lipsync';

  // คำนวณ width/height สำหรับ MiniMax / LTX 2.5
  const calculatedResolution = useMemo(() => {
    if (!isMiniMaxOrLTX25) return { width: 480, height: 860 };
    const res = MINIMAX_RESOLUTIONS[megapixels];
    if (!res) return { width: 480, height: 860 };

    let { width, height } = res;
    // สลับ width/height สำหรับ Portrait
    if (aspectRatio.includes('Portrait') || aspectRatio.includes('3:4')) {
      [width, height] = [height, width];
    }
    return { width, height };
  }, [isMiniMaxOrLTX25, megapixels, aspectRatio]);

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
    onLoading({ title: 'Generating Video...', detail: 'This may take several minutes...' });

    try {
      const payload = {
        prompt: prompt || 'default',
        model,
        image1_filename: imageFilename,
        audio_filename: audioFilename,
        width: calculatedResolution.width,
        height: calculatedResolution.height,
        length: duration,
        fps: isMiniMaxOrLTX25 ? 24.0 : fps,
        aspect_ratio: aspectRatio,
        megapixels: isMiniMaxOrLTX25 ? parseFloat(megapixels) : 1.0,
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
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[300px]">
            {VIDEO_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Image Upload (ซ่อนสำหรับ T2V models) */}
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
          placeholder="Describe the video you want to create..."
        />
      </div>

      {/* MiniMax / LTX 2.5: Aspect Ratio + Megapixels */}
      {isMiniMaxOrLTX25 && (
        <>
          <div className="space-y-2">
            <Label>📐 Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASPECT_RATIOS.map((ar) => (
                  <SelectItem key={ar.value} value={ar.value}>{ar.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>📊 Resolution</Label>
            <Select value={megapixels} onValueChange={setMegapixels}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
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

      {/* Duration (สำหรับทุกโมเดล) */}
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
      </div>

      {/* FPS (เฉพาะ LTX Video 2.3 เท่านั้น) */}
      {!isMiniMaxOrLTX25 && (
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
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500"
      >
        🎬 Generate Video
      </Button>
    </div>
  );
}