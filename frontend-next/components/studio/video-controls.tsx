'use client';

import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { UploadBox } from '@/components/studio/upload-box';
import { readSSE, cancelBackendJob, SSECancelledError } from '@/lib/stream';
import { VIDEO_MODELS } from '@/lib/models';
import type { TabProps } from '@/lib/types';

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

const LIPSYNC_PROMPT_TEMPLATE = `The person in <Picture 1> speaks only in Thai, reproducing <Audio 1> exactly as it is, word for word, perfectly lip-synced. No other speech, no music, background unchanged.

While speaking, [describe natural movements: smiles warmly, blinks naturally, tilts head slightly...]. When the line ends, [describe ending action...]. Soft natural lighting, realistic skin and hair movement, background unchanged`;

const LIPSYNC_MULTI_PROMPT_TEMPLATE = `subject_definitions:
<Subject 1> is the person on the LEFT in <Picture 1>: [describe appearance, hair, clothing...]
<Subject 2> is the person on the RIGHT in <Picture 1>: [describe appearance, hair, clothing...]
<Picture 1> is the opening frame of the target video; keep both faces, outfits, lighting and background exactly as in <Picture 1>.
<Audio 1> is the exact Thai voice track of <Subject 1> (S1): copy its signal 1:1, word for word.
<Audio 2> is the exact Thai voice track of <Subject 2> (S2): copy its signal 1:1, word for word.

summary:
[image reference + 2 audio references] One continuous static shot, no cuts. Timeline: 00:00.000-00:0X.000 <Subject 1> (S1) speaks in Thai exactly as <Audio 1>; 00:0X.000-00:0Y.000 <Subject 2> (S2) speaks in Thai exactly as <Audio 2>. Only one mouth moves at a time; the listening person keeps lips closed and smiles warmly.

detailed_description:
[Shot 1] The video opens exactly on <Picture 1>. Camera fully static, framing and background unchanged.
00:00.000-00:0X.000: <Subject 1> (S1) speaks, lips perfectly synced word-for-word to <Audio 1>: <d>[Thai] put dialogue 1 here</d> During this segment <Subject 2> stays silent: lips gently closed, listening, blinking naturally.
00:0X.000-00:0Y.000: <Subject 2> (S2) speaks, lips perfectly synced word-for-word to <Audio 2>: <d>[Thai] put dialogue 2 here</d> During this segment <Subject 1> stays silent: lips closed, smiling, blinking naturally.
No other speech, no music, background unchanged.

overall_soundscape:
The final audio track is exactly <Audio 1> followed immediately by <Audio 2>, both copied 1:1 with no overlap. Under it, only the soft ambience of the scene. No music, no extra voices.`;

export function VideoControls({ onLoading, onResult }: TabProps) {
  const [model, setModel] = useState(VIDEO_MODELS[0].value);
  const [prompt, setPrompt] = useState('');
  const [imageFilename, setImageFilename] = useState('');
  const [audioFilename, setAudioFilename] = useState('');
  const [audio2Filename, setAudio2Filename] = useState('');
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0].value);
  const [megapixels, setMegapixels] = useState('1.0');
  const [duration, setDuration] = useState(5);
  const [fps, setFps] = useState(24);

  // ✅ Cancel feature
  const abortRef = useRef<AbortController | null>(null);
  const cancelledByUserRef = useRef(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const currentModel = useMemo(
    () => VIDEO_MODELS.find((m) => m.value === model),
    [model]
  );

  // ✅ H3 Lipsync family (Single + Multi)
  const isMultiLipsync = model === 'Minimax H3 Multiple Lipsync';
  const isFastH3Lipsync = model === 'Minimax H3 Single Lipsync' || isMultiLipsync;
  const isFastH3I2V = model === 'Fast Video H3 I2V';
  const isFastH3T2V = model === 'Fast Video H3 T2V';
  const isMinimaxI2VFast = model === 'Minimax H3 I2V Fast 4 Step';
  const isFastH3 =
    model.startsWith('Fast Video H3') ||
    isFastH3Lipsync ||
    isMinimaxI2VFast;

  const isMiniMaxOrLTX25 = useMemo(() => {
    return (
      (model.startsWith('MiniMax H3') || model.startsWith('LTX 2.5')) &&
      !isFastH3
    );
  }, [model, isFastH3]);

  // ✅ ตอนนี้ Lipsync ก็เลือก resolution ได้แล้ว
  const needsAspectRatio =
    isMiniMaxOrLTX25 ||
    isFastH3T2V ||
    isFastH3Lipsync ||
    isMinimaxI2VFast;

  const isLipsync = model === 'LTX 2.3 Lipsync' || isFastH3Lipsync;
  const isLTXLipsync = model === 'LTX 2.3 Lipsync';

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

  // ✅ ตั้งค่า resolution เริ่มต้นให้ตรงตัวอย่าง workflow เมื่อเปลี่ยนโมเดล
  function handleModelChange(v: string) {
    setModel(v);
    if (v === 'Minimax H3 Single Lipsync') {
      setAspectRatio('16:9 (Landscape Widescreen)');
      setMegapixels('0.9');
    } else if (v === 'Minimax H3 Multiple Lipsync') {
      setAspectRatio('9:16 (Portrait Widescreen)');
      setMegapixels('0.5');
    } else if (v === 'Minimax H3 I2V Fast 4 Step') {
      setAspectRatio('9:16 (Portrait Widescreen)');
      setMegapixels('0.5');
    }
  }

  function loadLipsyncTemplate() {
    const template = isMultiLipsync
      ? LIPSYNC_MULTI_PROMPT_TEMPLATE
      : LIPSYNC_PROMPT_TEMPLATE;

    if (!prompt.trim() || confirm('Replace current prompt with Lipsync template?')) {
      setPrompt(template);
    }
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
    if (isGenerating) return;

    if (!prompt.trim() && !isLTXLipsync) {
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
    if (isMultiLipsync && !audio2Filename) {
      alert('⚠️ Multiple Lipsync requires a second audio file!');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    cancelledByUserRef.current = false;
    setIsGenerating(true);

    let wasCancelled = false;

    onResult(null);
    onLoading({
      title: isMultiLipsync
        ? '🎤 Multi Lipsyncing...'
        : isFastH3Lipsync
          ? '🎤 Lipsyncing...'
          : isFastH3
            ? '⚡ Fast Generating Video...'
            : 'Generating Video...',
      detail: isFastH3
        ? '4-step turbo mode - very fast...'
        : 'This may take several minutes...',
    });

    try {
      const payload = {
        prompt: prompt || 'default',
        model,
        image1_filename: imageFilename,
        audio_filename: audioFilename,
        audio2_filename: audio2Filename,
        width: isFastH3I2V ? 1024 : calculatedResolution.width,
        height: isFastH3I2V ? 1024 : calculatedResolution.height,
        length: duration,
        fps: isMiniMaxOrLTX25 || isFastH3 ? 24.0 : fps,
        aspect_ratio: aspectRatio,
        megapixels: needsAspectRatio ? parseFloat(megapixels) : 1.0,
      };

      for await (const ev of readSSE(
        '/api/generate-video-stream',
        payload,
        controller.signal
      )) {
        if (ev.type === 'progress') {
          const pct = Math.round((ev.value / ev.max) * 100);
          onLoading({
            title: `${pct}%`,
            detail: `Step ${ev.value}/${ev.max}`,
            progress: pct,
          });
        } else if (ev.type === 'executing' && ev.node) {
          onLoading({
            title: 'Generating Video...',
            detail: `Processing node ${ev.node}...`,
          });
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
      const message = String(e?.message || '');

      const isUserCancelled =
        cancelledByUserRef.current ||
        e instanceof SSECancelledError ||
        /No (images|video|audio|output|text) generated/i.test(message);

      wasCancelled = isUserCancelled;

      if (isUserCancelled) {
        console.log('[Cancel] Video generation cancelled by user');
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
      {/* Video Model */}
      <div className="space-y-2">
        <Label>Video Model</Label>
        <Select value={model} onValueChange={(v) => v && handleModelChange(v)}>
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

      {/* Fast Mode Info */}
      {isFastH3 && (
        <div className="rounded-lg border border-emerald-700/30 bg-emerald-900/20 p-3 text-xs text-emerald-300">
          <span className="mr-1">⚡</span>
          <strong>
            Fast Mode ({isFastH3Lipsync || isMinimaxI2VFast ? '4' : '8'} Steps):
          </strong>{' '}
          เร็วกว่า MiniMax H3 ปกติ 3-4 เท่า FPS fixed ที่ 24 (แนะนำอัพโหลดรูปขนาดให้ตรงกับ output ที่ต้องการ ไม่งั้นภาพจะยืด)
        </div>
      )}

      {/* Lipsync Info */}
      {isFastH3Lipsync && !isMultiLipsync && (
        <div className="rounded-lg border border-pink-700/30 bg-pink-900/20 p-3 text-xs text-pink-300">
          <span className="mr-1">🎤</span>
          <strong>Single Lipsync:</strong> รูปตัวละคร + เสียงพูด → วิดีโอปากขตรงคำพูด ใช้{' '}
          <code className="rounded bg-slate-900/50 px-1">&lt;Picture 1&gt;</code>{' '}
          และ{' '}
          <code className="rounded bg-slate-900/50 px-1">&lt;Audio 1&gt;</code>{' '}
          ใน prompt (แนะนำรูปต้นฉบับ resolution ต้องตรงกับ output ที่คุณเลือก ไม่งั้นภาพจะยืด)
        </div>
      )}

      {/* Multi Lipsync Info */}
      {isMultiLipsync && (
        <div className="rounded-lg border border-purple-700/30 bg-purple-900/20 p-3 text-xs text-purple-300">
          <span className="mr-1">🎤</span>
          <strong>Multiple Lipsync:</strong> 2 คนในรูป + 2 เสียง → ผลัดกันพูดตาม timeline ใช้{' '}
          <code className="rounded bg-slate-900/50 px-1">
            &lt;Subject 1/2&gt;
          </code>
          ,{' '}
          <code className="rounded bg-slate-900/50 px-1">
            &lt;Audio 1/2&gt;
          </code>{' '}
          ใน prompt (แนะนำรูปต้นฉบับ resolution ต้องตรงกับ output ที่คุณเลือก ไม่งั้นภาพจะยืด)
        </div>
      )}

      {/* Image Upload */}
      {currentModel?.needsImage && (
        <UploadBox
          label={
            isFastH3Lipsync
              ? '📷 Character Image (คนที่จะพูด)'
              : '📷 Input Image'
          }
          kind="image"
          onUploaded={setImageFilename}
          required
        />
      )}

      {/* Audio 1 Upload */}
      {isLipsync && (
        <UploadBox
          label={
            isMultiLipsync
              ? '🎵 Audio 1 (เสียงคนที่ 1 / Subject 1)'
              : '🎵 Reference Audio (เสียงพูด)'
          }
          kind="audio"
          onUploaded={setAudioFilename}
          required
        />
      )}

      {/* Audio 2 Upload (Multi เท่านั้น) */}
      {isMultiLipsync && (
        <UploadBox
          label="🎵 Audio 2 (เสียงคนที่ 2 / Subject 2)"
          kind="audio"
          onUploaded={setAudio2Filename}
          required
        />
      )}

      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>📝 Prompt</Label>
          {isFastH3Lipsync && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadLipsyncTemplate}
              className="h-7 px-2 text-xs"
            >
              📝 Load Template
            </Button>
          )}
        </div>
        <Textarea
          rows={isMultiLipsync ? 10 : isFastH3Lipsync ? 6 : 4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            isMultiLipsync
              ? 'subject_definitions: ... <Subject 1> ... <Audio 1> ... (กด Load Template ได้เลย)'
              : isFastH3Lipsync
                ? "The person in <Picture 1> speaks only in Thai, reproducing <Audio 1> exactly... Dialogue: '(บทพูด)'"
                : isFastH3
                  ? 'Describe the video motion, camera action, and scene... (8-step turbo mode)'
                  : 'Describe the video you want to create...'
          }
        />
      </div>

      {/* Aspect Ratio + Resolution */}
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
                  <SelectItem key={ar.value} value={ar.value}>
                    {ar.label}
                  </SelectItem>
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

      {/* Auto Info Grid (เฉพาะ Fast I2V ที่ resolution auto จากรูป) */}
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
          max={isMultiLipsync ? 60 : isFastH3Lipsync ? 30 : 10}
          step={0.5}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
        {isMultiLipsync ? (
          <p className="text-[10px] text-purple-400">
            💡 ตั้งให้ตรงกับความยาว เสียง1 + เสียง2 รวมกัน (เช่น 3s + 3s → ตั้ง 6)
          </p>
        ) : isFastH3Lipsync ? (
          <p className="text-[10px] text-pink-400">
            💡 ตั้งให้ตรงกับความยาวเสียงพูด ไม่งั้นวิดีโอจะถูกตัดหรือยาวเกิน
          </p>
        ) : isFastH3 ? (
          <p className="text-[10px] text-amber-400">
            💡 แนะนำ 5 วินาทีสำหรับ quick preview, 10 วินาทีสำหรับ full video
          </p>
        ) : null}
      </div>

      {/* FPS (เฉพาะ LTX 2.3) */}
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
        disabled={isGenerating}
        className={`w-full bg-gradient-to-r ${
          isMultiLipsync
            ? 'from-purple-500 to-fuchsia-600 hover:from-purple-400 hover:to-fuchsia-500'
            : isFastH3Lipsync
              ? 'from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500'
              : isFastH3
                ? 'from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500'
                : 'from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500'
        } ${isGenerating ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {isGenerating
          ? '⏳ Generating Video...'
          : isMultiLipsync
            ? '🎤🎤 Generate Multi Lipsync'
            : isFastH3Lipsync
              ? '🎤 Generate Lipsync Video'
              : isFastH3
                ? '⚡ Fast Generate Video'
                : '🎬 Generate Video'}
      </Button>

      {/* ✅ Cancel Button - แสดงเฉพาะตอนกำลังรัน */}
      {isGenerating && (
        <Button
          onClick={handleCancel}
          variant="outline"
          className="w-full border-red-500/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
        >
          ⏹ Cancel Video Generation
        </Button>
      )}
    </div>
  );
}