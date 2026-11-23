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

const CHAR_SWAP_PROMPT_TEMPLATE = `Replace only the [person/subject] in the foreground in <Video 1> with the character in <Picture 1>. Keep the replacement character's identity and art style from <Picture 1>. Preserve the source video's camera, framing, background, lighting, objects, and all other people. Match the selected person's position, scale, pose, and movement throughout the clip. Do not show the reference sheet or its background.`;

const PIKA_T2V_PROMPT_TEMPLATE = `integrated_multimodal_description: [Shot 1] Describe the visual style, subject, setting, and the exact timed action beat-by-beat across the clip (camera move, subject motion, lighting, textures). Keep it one continuous paragraph.

overall_soundscape: Describe the diegetic audio bed and every discrete sound event synced to the action (ambience, footsteps, impacts, whooshes), in order.

non_diegetic_music: Describe the score: instrumentation, tempo, how it follows the action, where it drops out and where it resolves.`;

const PIKA_FL2V_PROMPT_TEMPLATE = `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 1) aligns with the [END]-second mark of the target video.

integrated_multimodal_description: [Shot 1] Describe the visual style and subject. The shot begins exactly on Picture 1: [opening pose / framing / lighting]. Then describe the timed action beat-by-beat (camera move, subject motion). The shot settles into the final composition of Picture 2 and holds.

overall_soundscape: Describe the diegetic audio bed and every discrete sound event synced to the action, in order.

non_diegetic_music: Describe the score: instrumentation, tempo, how it follows the action, where it drops out and where it resolves.`;

// ✅ PIKA REF2V — subject definitions + retention analysis + 3-field
const PIKA_REF2V_PROMPT_TEMPLATE = `subject_definitions:
<Subject 1> is the [character/subject] in <Picture 1>. Reference role: identity and gear anchor. Features to follow exactly: [list exact features, materials, colours, glowing details]. Do not carry over the background of <Picture 1>.
<Subject 2> is the [setting/object] in <Picture 2>. Reference role: form and material anchor. Features to follow exactly: [list exact structure, seams, lights, weathering].

summary:
[reference generation] A five-second single continuous shot: [describe the one camera move that connects both references — no cut].

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - [retained features].
<Subject 2> (appears in [Shot 1]): fully_preserved - [retained features].
<Picture 1> background: weak_reference only - discarded entirely.
No audio reference is used in this generation.

detailed_description:
[Shot 1] [Opening framing built from Subject 2, with lighting and grain]. The camera [move] with [amplitude] at [speed]. At about [X] seconds [beat]. At about [Y] seconds [beat that reveals Subject 1]. The last beat holds completely still while [micro-motion].

overall_soundscape:
[Diegetic bed and every discrete sound event in order, including the change when the camera crosses spaces.]

non_diegetic_music:
[Score: instrumentation, tempo, where it drops to silence, and the final resolved figure.]`;

export function VideoControls({ onLoading, onResult }: TabProps) {
  const [model, setModel] = useState(VIDEO_MODELS[0].value);
  const [prompt, setPrompt] = useState('');
  const [imageFilename, setImageFilename] = useState('');
  const [image2Filename, setImage2Filename] = useState('');
  const [videoFilename, setVideoFilename] = useState('');
  const [audioFilename, setAudioFilename] = useState('');
  const [audio2Filename, setAudio2Filename] = useState('');
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0].value);
  const [megapixels, setMegapixels] = useState('1.0');
  const [duration, setDuration] = useState(5);
  const [fps, setFps] = useState(24);

  const abortRef = useRef<AbortController | null>(null);
  const cancelledByUserRef = useRef(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const currentModel = useMemo(
    () => VIDEO_MODELS.find((m) => m.value === model),
    [model]
  );

  const isMultiLipsync = model === 'Minimax H3 Multiple Lipsync';
  const isOminiRef = model === 'Fast H3 OminiRef 8 Step with lipsync';
  const isCharSwap = model === 'Minimax Charactor Swap Turbo';
  const isPikaFlexT2V = model === 'PIKA H3 FLEX T2V';
  const isPikaFL2V = model === 'PIKA H3 FLEX FL2V';
  const isPikaREF2V = model === 'PIKA H3 FLEX REF2V';
  const isPikaFamily = isPikaFlexT2V || isPikaFL2V || isPikaREF2V;
  const isFastH3Lipsync = model === 'Minimax H3 Single Lipsync' || isMultiLipsync;
  const isFastH3I2V = model === 'Fast Video H3 I2V';
  const isFastH3T2V = model === 'Fast Video H3 T2V';
  const isMinimaxI2VFast = model === 'Minimax H3 I2V Fast 4 Step';
  const isFastH3 =
    model.startsWith('Fast Video H3') ||
    isFastH3Lipsync ||
    isMinimaxI2VFast ||
    isOminiRef ||
    isCharSwap ||
    isPikaFamily;

  const isMiniMaxOrLTX25 = useMemo(() => {
    return (
      (model.startsWith('MiniMax H3') || model.startsWith('LTX 2.5')) &&
      !isFastH3
    );
  }, [model, isFastH3]);

  const needsAspectRatio =
    isMiniMaxOrLTX25 ||
    isFastH3T2V ||
    isFastH3Lipsync ||
    isMinimaxI2VFast ||
    isOminiRef ||
    isPikaFlexT2V ||
    isPikaREF2V;

  const autoResFromImage = isFastH3I2V || isPikaFL2V;
  const needsImage2 = isOminiRef || isPikaFL2V || isPikaREF2V;

  const isLipsync = model === 'LTX 2.3 Lipsync' || isFastH3Lipsync || isOminiRef;
  const isLTXLipsync = model === 'LTX 2.3 Lipsync';

  const stepLabel = isPikaFamily
    ? '6'
    : isFastH3Lipsync || isMinimaxI2VFast || isCharSwap
      ? '4'
      : '8';

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

  function handleModelChange(v: string) {
    setModel(v);
    setVideoFilename('');
    setImage2Filename('');
    if (v === 'Minimax H3 Single Lipsync') {
      setAspectRatio('16:9 (Landscape Widescreen)');
      setMegapixels('0.9');
    } else if (v === 'Minimax H3 Multiple Lipsync') {
      setAspectRatio('9:16 (Portrait Widescreen)');
      setMegapixels('0.5');
    } else if (v === 'Minimax H3 I2V Fast 4 Step') {
      setAspectRatio('9:16 (Portrait Widescreen)');
      setMegapixels('0.5');
    } else if (v === 'Fast H3 OminiRef 8 Step with lipsync') {
      setAspectRatio('16:9 (Landscape Widescreen)');
      setMegapixels('1.0');
    } else if (v === 'PIKA H3 FLEX T2V' || v === 'PIKA H3 FLEX REF2V') {
      setAspectRatio('16:9 (Landscape Widescreen)');
      setMegapixels('0.5');
    }
  }

  function loadTemplate() {
    const template = isMultiLipsync
      ? LIPSYNC_MULTI_PROMPT_TEMPLATE
      : isCharSwap
        ? CHAR_SWAP_PROMPT_TEMPLATE
        : isPikaREF2V
          ? PIKA_REF2V_PROMPT_TEMPLATE
          : isPikaFL2V
            ? PIKA_FL2V_PROMPT_TEMPLATE
            : isPikaFlexT2V
              ? PIKA_T2V_PROMPT_TEMPLATE
              : LIPSYNC_PROMPT_TEMPLATE;
    if (!prompt.trim() || confirm('Replace current prompt with template?')) {
      setPrompt(template);
    }
  }

  async function handleCancel() {
    if (!abortRef.current) return;
    cancelledByUserRef.current = true;
    await cancelBackendJob();
    abortRef.current.abort();
  }

  async function generate() {
    if (isGenerating) return;
    if (!prompt.trim() && !isLTXLipsync) {
      alert('Please enter a prompt!');
      return;
    }
    if (currentModel?.needsVideo && !videoFilename) {
      alert('⚠️ Please upload a source video!');
      return;
    }
    if (currentModel?.needsImage && !imageFilename) {
      alert('⚠️ Please upload an image!');
      return;
    }
    if (isPikaFL2V && !image2Filename) {
      alert('⚠️ PIKA FL2V requires a Last Frame image (Image 2)!');
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
      title: isCharSwap
        ? '🔄 Swapping Character...'
        : isPikaREF2V
          ? '⚡ PIKA REF2V Generating (6 Steps)...'
          : isPikaFL2V
            ? '⚡ PIKA FL2V Generating (6 Steps)...'
            : isPikaFlexT2V
              ? '⚡ PIKA FLEX Generating (6 Steps)...'
              : isMultiLipsync
                ? '🎤 Multi Lipsyncing...'
                : isFastH3Lipsync
                  ? '🎤 Lipsyncing...'
                  : isFastH3
                    ? '⚡ Fast Generating Video...'
                    : 'Generating Video...',
      detail: isCharSwap
        ? 'Video-to-video processing - this may take several minutes...'
        : isPikaFamily
          ? '6-step manual sigmas + auto audio...'
          : isFastH3
            ? 'Turbo mode - very fast...'
            : 'This may take several minutes...',
    });

    try {
      const payload = {
        prompt: prompt || 'default',
        model,
        image1_filename: imageFilename,
        image2_filename: image2Filename,
        video_filename: videoFilename,
        audio_filename: audioFilename,
        audio2_filename: audio2Filename,
        width: autoResFromImage ? 1024 : calculatedResolution.width,
        height: autoResFromImage ? 1024 : calculatedResolution.height,
        length: duration,
        fps: isMiniMaxOrLTX25 || isFastH3 ? 24.0 : fps,
        aspect_ratio: aspectRatio,
        megapixels: needsAspectRatio ? parseFloat(megapixels) : 1.0,
      };

      for await (const ev of readSSE('/api/generate-video-stream', payload, controller.signal)) {
        if (ev.type === 'progress') {
          const pct = Math.round((ev.value / ev.max) * 100);
          onLoading({ title: `${pct}%`, detail: `Step ${ev.value}/${ev.max}`, progress: pct });
        } else if (ev.type === 'executing' && ev.node) {
          onLoading({ title: 'Generating Video...', detail: `Processing node ${ev.node}...` });
        } else if (ev.type === 'saved') {
          onResult({ kind: 'video', url: ev.url, seed: ev.seed, filename: ev.filename });
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
        onLoading({ title: '⏹ Cancelled', detail: 'Generation was cancelled' });
        setTimeout(() => onLoading(null), 1500);
      } else {
        alert('Error: ' + message);
      }
    } finally {
      abortRef.current = null;
      setIsGenerating(false);
      cancelledByUserRef.current = false;
      if (!wasCancelled) onLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Video Model</Label>
        <Select value={model} onValueChange={(v) => v && handleModelChange(v)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent className="min-w-[320px] max-w-[90vw]">
            {VIDEO_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isFastH3 && (
        <div className="rounded-lg border border-emerald-700/30 bg-emerald-900/20 p-3 text-xs text-emerald-300">
          <span className="mr-1">⚡</span>
          <strong>Fast Mode ({stepLabel} Steps):</strong> เร็วกว่า MiniMax H3 ปกติหลายเท่า FPS fixed ที่ 24
        </div>
      )}

      {isPikaFlexT2V && (
        <div className="rounded-lg border border-yellow-700/30 bg-yellow-900/20 p-3 text-xs text-yellow-300">
          <span className="mr-1">⚡</span>
          <strong>PIKA H3 FLEX T2V:</strong> Text-to-Video 6-step + LoRA Pika Flex — สร้างเสียงอัตโนมัติ
          แนะนำ prompt แบบ 3 ฟิลด์ (กด Load Template)
        </div>
      )}

      {isPikaFL2V && (
        <div className="rounded-lg border border-orange-700/30 bg-orange-900/20 p-3 text-xs text-orange-300">
          <span className="mr-1">⚡</span>
          <strong>PIKA H3 FLEX FL2V:</strong> First Frame → Last Frame (6-step) + เสียงอัตโนมัติ —
          Resolution ตามรูป First Frame อัตโนมัติ | ต้อง upload ทั้ง Picture 1 (first) และ Picture 2 (last)
        </div>
      )}

      {isPikaREF2V && (
        <div className="rounded-lg border border-rose-700/30 bg-rose-900/20 p-3 text-xs text-rose-300">
          <span className="mr-1">⚡</span>
          <strong>PIKA H3 FLEX REF2V:</strong> Reference-to-Video 6-step — ดึงตัวละครจาก Picture 1 และฉาก/วัตถุจาก Picture 2
          มารวมในช็อตเดียวต่อเนื่อง + สร้างเสียงอัตโนมัติ | ใช้{' '}
          <code className="rounded bg-slate-900/50 px-1">&lt;Subject 1/2&gt;</code> และ{' '}
          <code className="rounded bg-slate-900/50 px-1">&lt;Picture 1/2&gt;</code> ใน prompt (กด Load Template)
        </div>
      )}

      {isFastH3Lipsync && !isMultiLipsync && (
        <div className="rounded-lg border border-pink-700/30 bg-pink-900/20 p-3 text-xs text-pink-300">
          <span className="mr-1">🎤</span>
          <strong>Single Lipsync:</strong> รูปตัวละคร + เสียงพูด → วิดีโอปากตรงคำพูด ใช้{' '}
          <code className="rounded bg-slate-900/50 px-1">&lt;Picture 1&gt;</code> และ{' '}
          <code className="rounded bg-slate-900/50 px-1">&lt;Audio 1&gt;</code> ใน prompt
        </div>
      )}

      {isMultiLipsync && (
        <div className="rounded-lg border border-purple-700/30 bg-purple-900/20 p-3 text-xs text-purple-300">
          <span className="mr-1">🎤</span>
          <strong>Multiple Lipsync:</strong> 2 คนในรูป + 2 เสียง → ผลัดกันพูดตาม timeline ใช้{' '}
          <code className="rounded bg-slate-900/50 px-1">&lt;Subject 1/2&gt;</code>,{' '}
          <code className="rounded bg-slate-900/50 px-1">&lt;Audio 1/2&gt;</code> ใน prompt
        </div>
      )}

      {isOminiRef && (
        <div className="rounded-lg border border-indigo-700/30 bg-indigo-900/20 p-3 text-xs text-indigo-300">
          <span className="mr-1">🎬</span>
          <strong>OminiRef Multi-Reference:</strong> รองรับ 2 รูป + 2 เสียง (optional) — ใช้{' '}
          <code className="rounded bg-slate-900/50 px-1">&lt;Picture 1/2&gt;</code> และ{' '}
          <code className="rounded bg-slate-900/50 px-1">&lt;Audio 1/2&gt;</code> ใน prompt
        </div>
      )}

      {isCharSwap && (
        <div className="rounded-lg border border-cyan-700/30 bg-cyan-900/20 p-3 text-xs text-cyan-300">
          <span className="mr-1">🔄</span>
          <strong>Character Swap:</strong> เปลี่ยนตัวละครในวิดีโอต้นฉบับเป็นตัวละครจากรูปอ้างอิง —
          คงกล้อง ฉาก แสง และคนอื่นๆ ไว้ทั้งหมด ความยาว / FPS / Resolution ตามวิดีโอต้นฉบับอัตโนมัติ
        </div>
      )}

      {currentModel?.needsVideo && (
        <UploadBox label="🎬 Source Video (วิดีโอต้นฉบับ)" kind="video" onUploaded={setVideoFilename} required />
      )}

      {currentModel?.needsImage && (
        <UploadBox
          label={
            isPikaREF2V ? '📷 Picture 1 — ตัวละคร/Subject หลัก (บังคับ)'
              : isPikaFL2V ? '📷 First Frame (Picture 1 - บังคับ)'
                : isCharSwap ? '📷 Character Reference (รูปตัวละครที่จะใส่)'
                  : isOminiRef ? '📷 Reference Image 1 (Required - รูปหลัก)'
                    : isFastH3Lipsync ? '📷 Character Image (คนที่จะพูด)'
                      : '📷 Input Image'
          }
          kind="image"
          onUploaded={setImageFilename}
          required
        />
      )}

      {needsImage2 && (
        <UploadBox
          label={
            isPikaFL2V
              ? '📷 Last Frame (Picture 2 - บังคับ)'
              : isPikaREF2V
                ? '📷 Picture 2 — ฉาก/วัตถุอ้างอิง (Optional)'
                : '📷 Reference Image 2 (Optional - ตัวละคร/ฉากเพิ่มเติม)'
          }
          kind="image"
          onUploaded={setImage2Filename}
          required={isPikaFL2V}
        />
      )}

      {isLipsync && (
        <UploadBox
          label={
            isOminiRef ? '🎵 Reference Audio 1 (Required - เสียงหลัก)'
              : isMultiLipsync ? '🎵 Audio 1 (เสียงคนที่ 1 / Subject 1)'
                : '🎵 Reference Audio (เสียงพูด)'
          }
          kind="audio"
          onUploaded={setAudioFilename}
          required
        />
      )}

      {isMultiLipsync && (
        <UploadBox label="🎵 Audio 2 (เสียงคนที่ 2 / Subject 2)" kind="audio" onUploaded={setAudio2Filename} required />
      )}
      {isOminiRef && (
        <UploadBox label="🎵 Reference Audio 2 (Optional - เสียงเพิ่มเติม)" kind="audio" onUploaded={setAudio2Filename} required={false} />
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>📝 Prompt</Label>
          {(isFastH3Lipsync || isCharSwap || isPikaFamily) && (
            <Button variant="outline" size="sm" onClick={loadTemplate} className="h-7 px-2 text-xs">
              📝 Load Template
            </Button>
          )}
        </div>
        <Textarea
          rows={isMultiLipsync ? 10 : isPikaREF2V ? 12 : isPikaFamily ? 8 : isFastH3Lipsync ? 6 : 4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            isPikaREF2V
              ? 'subject_definitions: <Subject 1> ... <Picture 1> ... <Subject 2> ... <Picture 2> ... retention_analysis: ... detailed_description: [Shot 1] ... (กด Load Template)'
              : isPikaFL2V
                ? 'Picture 1 aligns 0.00s ... Picture 2 aligns [END]s ... integrated_multimodal_description: ... (กด Load Template)'
                : isPikaFlexT2V
                  ? 'integrated_multimodal_description: ... overall_soundscape: ... non_diegetic_music: ... (กด Load Template)'
                  : isCharSwap
                    ? 'Replace only the [person] in <Video 1> with the character in <Picture 1>... (กด Load Template)'
                    : isOminiRef
                      ? 'subject_definitions: <Subject 1> ... <Picture 1> ... detailed_description: [Shot 1]...'
                      : isMultiLipsync
                        ? 'subject_definitions: ... <Subject 1> ... <Audio 1> ... (กด Load Template)'
                        : isFastH3Lipsync
                          ? "The person in <Picture 1> speaks only in Thai, reproducing <Audio 1> exactly... Dialogue: '(บทพูด)'"
                          : 'Describe the video you want to create...'
          }
          className={isPikaREF2V ? 'font-mono text-xs' : ''}
        />
      </div>

      {needsAspectRatio && (
        <>
          <div className="space-y-2">
            <Label>📐 Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={(v) => v && setAspectRatio(v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent className="min-w-[280px]">
                {Object.entries(MINIMAX_RESOLUTIONS).map(([mp, size]) => (
                  <SelectItem key={mp} value={mp}>{mp} MP - {size.width} x {size.height}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-emerald-400">
              Output: {calculatedResolution.width} x {calculatedResolution.height}
            </p>
          </div>
        </>
      )}

      {autoResFromImage && (
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5 text-[10px] text-slate-400">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-slate-500">📐 Aspect:</span> <span className="text-emerald-400">Auto (from first image)</span></div>
            <div><span className="text-slate-500">📊 Resolution:</span> <span className="text-emerald-400">Auto (from first image)</span></div>
            <div><span className="text-slate-500">🎞️ FPS:</span> <span className="text-emerald-400">Fixed 24</span></div>
            <div><span className="text-slate-500">🔊 Audio:</span> <span className="text-emerald-400">Auto generated</span></div>
          </div>
        </div>
      )}

      {isCharSwap && (
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5 text-[10px] text-slate-400">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-slate-500">📐 Resolution:</span> <span className="text-cyan-400">Auto (480p budget)</span></div>
            <div><span className="text-slate-500">⏱️ Duration:</span> <span className="text-cyan-400">Auto (ตามต้นฉบับ)</span></div>
            <div><span className="text-slate-500">🎞️ FPS:</span> <span className="text-cyan-400">Auto (จากต้นฉบับ)</span></div>
            <div><span className="text-slate-500">🔊 Audio:</span> <span className="text-cyan-400">จากต้นฉบับ</span></div>
          </div>
        </div>
      )}

      {!isCharSwap && (
        <div className="space-y-2">
          <Label>⏱️ Duration (seconds)</Label>
          <Input
            type="number"
            min={1}
            max={isMultiLipsync ? 60 : isOminiRef ? 20 : isPikaFamily ? 10 : isFastH3Lipsync ? 30 : 10}
            step={0.5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
          {isMultiLipsync ? (
            <p className="text-[10px] text-purple-400">💡 ตั้งให้ตรงกับความยาว เสียง1 + เสียง2 รวมกัน</p>
          ) : isOminiRef ? (
            <p className="text-[10px] text-indigo-400">💡 ตั้งให้ตรงกับความยาวเสียงรวมทั้งหมด</p>
          ) : isPikaFamily ? (
            <p className="text-[10px] text-yellow-400">💡 ระบบแปลง seconds → frames ให้อัตโนมัติ (min 5s)</p>
          ) : isFastH3Lipsync ? (
            <p className="text-[10px] text-pink-400">💡 ตั้งให้ตรงกับความยาวเสียงพูด</p>
          ) : isFastH3 ? (
            <p className="text-[10px] text-amber-400">💡 แนะนำ 5s สำหรับ preview, 10s สำหรับ full video</p>
          ) : null}
        </div>
      )}

      {!isMiniMaxOrLTX25 && !isFastH3 && (
        <div className="space-y-2">
          <Label>🎞️ FPS</Label>
          <Input type="number" min={12} max={30} value={fps} onChange={(e) => setFps(Number(e.target.value))} />
        </div>
      )}

      <Button
        onClick={generate}
        disabled={isGenerating}
        className={`w-full bg-gradient-to-r ${
          isPikaREF2V
            ? 'from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500'
            : isPikaFL2V
              ? 'from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500'
              : isPikaFlexT2V
                ? 'from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500'
                : isCharSwap
                  ? 'from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500'
                  : isOminiRef
                    ? 'from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500'
                    : isMultiLipsync
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
          : isPikaREF2V
            ? '⚡ Generate PIKA REF2V Video'
            : isPikaFL2V
              ? '⚡ Generate PIKA FL2V Video'
              : isPikaFlexT2V
                ? '⚡ Generate PIKA FLEX Video'
                : isCharSwap
                  ? '🔄 Swap Character'
                  : isOminiRef
                    ? '🎬 Generate OminiRef Video'
                    : isMultiLipsync
                      ? '🎤 Generate Multi Lipsync'
                      : isFastH3Lipsync
                        ? '🎤 Generate Lipsync Video'
                        : isFastH3
                          ? '⚡ Fast Generate Video'
                          : '🎬 Generate Video'}
      </Button>

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