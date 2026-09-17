'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { readSSE } from '@/lib/stream';
import { BACKEND_URL } from '@/lib/api';
import type { TabProps } from '@/lib/types';
import { Upload, X, Music } from 'lucide-react';

// รายชื่อโมเดลที่รองรับ
const AUDIO_MODELS = [ 
  { 
    id: 'YuE2 T2M', 
    label: '🎼 YuE2 Text-to-Music',
    desc: 'โมเดลคุณภาพสูง สร้างเพลงจาก Style + Lyrics คุณภาพเสียงดีเยี่ยม (FLAC)',
    maxDuration: 240,
    useBpm: false,
    isCover: false,
  },
  {
    id: 'YuE2 Music Cover',
    label: '🎤 YuE2 Music Cover',
    desc: 'Cover เพลงจากไฟล์เสียงต้นฉบับ เปลี่ยนเนื้อร้อง/สไตล์ แต่คงทำนองไว้ (max 6 นาที)',
    maxDuration: 360,
    useBpm: false,
    isCover: true,
  },
  { 
    id: 'AceStep 1.5 Audio', 
    label: '🎵 AceStep 1.5',
    desc: 'สร้างเพลงทั้งแบบมีเนื้อร้องและบรรเลง รองรับหลากหลายแนวเพลง',
    maxDuration: 180,
    useBpm: true,
    isCover: false,
  },
];

// Preset tags สำหรับ AceStep
const TAG_PRESETS = [
  { label: '🎸 Pop', value: 'Pop, catchy, uplifting' },
  { label: '🎸 Rock', value: 'Rock, electric guitar, drums' },
  { label: '🎧 EDM', value: 'EDM, electronic, dance, 128 BPM' },
  { label: '🎹 Lo-Fi', value: 'Lo-Fi, chill, hip hop, 90 BPM' },
  { label: '🎻 Classical', value: 'Classical, orchestral, piano' },
  { label: '🎤 Jazz', value: 'Jazz, smooth, saxophone' },
  { label: '🎵 Thai Pop', value: 'Thai pop, T-pop, modern' },
  { label: '🎶 Instrumental', value: 'Instrumental, no vocals' },
];

// Preset style สำหรับ YuE2 (บรรยายยาวๆ)
const STYLE_PRESETS = [
  { 
    label: '🎸 Upbeat Indie Pop', 
    value: 'Upbeat indie pop with warm female vocals, bright electric guitars, punchy drums, melodic bass, and subtle synth layers.'
  },
  { 
    label: '💔 Emotional Ballad', 
    value: 'Emotional ballad with soft piano, gentle acoustic guitar, and heartfelt female vocals. Slow tempo, cinematic strings.'
  },
  { 
    label: '🎧 Electronic Dance', 
    value: 'High-energy electronic dance track with driving synth bass, punchy kicks, bright arpeggios, and euphoric drops.'
  },
  { 
    label: '🎬 Cinematic Epic', 
    value: 'Epic cinematic orchestral with powerful brass, sweeping strings, thunderous percussion, and dramatic choir.'
  },
  { 
    label: '🎻 Acoustic Folk', 
    value: 'Warm acoustic folk with fingerpicked guitar, soft male vocals, subtle fiddle, and gentle harmonica.'
  },
  { 
    label: '🎤 R&B Soul', 
    value: 'Smooth R&B with soulful vocals, groovy bass line, jazzy chords on Rhodes piano, and laid-back drum groove.'
  },
];

// Preset lyrics
const LYRICS_PRESETS_COMMON = [
  { label: '🎼 Instrumental', value: 'instrumental' },
  { label: '🎤 Love Song', value: 'You are my sunshine\nMy only sunshine\nYou make me happy\nWhen skies are gray' },
];

const LYRICS_PRESETS_YUE2 = [
  {
    label: '🌅 Summer Journey',
    value: '[Verse]\nMorning light across the window\nCity waking down below\n\n[Chorus]\nRun with me into the sunlight\nLeave the shadows far behind',
  },
  {
    label: '💔 Heartfelt Ballad',
    value: '[Verse]\nI found your letters in the rain\nThe ink was running like my thoughts\n\n[Chorus]\nBut still I hear you in the wind\nA whisper soft, a distant song',
  },
];

export function AudioControls({ onLoading, onResult }: TabProps) {
  const [selectedModel, setSelectedModel] = useState(AUDIO_MODELS[0].id);
  const [tags, setTags] = useState('Euro EDM 140 BPM');
  const [lyrics, setLyrics] = useState('instrumental');
  const [duration, setDuration] = useState(60);
  const [bpm, setBpm] = useState(120);
  const [seed, setSeed] = useState(-1);
  
  // Audio upload state (สำหรับ Cover mode)
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFilename, setAudioFilename] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentModel = AUDIO_MODELS.find((m) => m.id === selectedModel) || AUDIO_MODELS[0];
  const isYuE2 = selectedModel === 'YuE2 T2M';
  const isCover = currentModel.isCover;

  // Auto-adjust duration เมื่อเปลี่ยนโมเดล
  useEffect(() => {
    if (duration > currentModel.maxDuration) {
      setDuration(currentModel.maxDuration);
    }
  }, [selectedModel, currentModel.maxDuration, duration]);

  function addTag(tag: string) {
    setTags((prev) => {
      const current = prev.trim();
      if (!current) return tag;
      return `${current}, ${tag}`;
    });
  }

  // Handle audio file upload
  async function handleAudioUpload(file: File) {
    if (!file.type.startsWith('audio/')) {
      alert('⚠️ กรุณาเลือกไฟล์เสียง (MP3, WAV, FLAC, M4A)');
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload-audio`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setAudioFile(file);
      setAudioFilename(data.filename);
      console.log('[Upload] ✅ Audio uploaded:', data.filename);
    } catch (e: any) {
      alert('❌ Upload failed: ' + e.message);
    } finally {
      setUploading(false);
    }
  }

  function removeAudio() {
    setAudioFile(null);
    setAudioFilename('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function generate() {
    // Validation
    if (isCover && !audioFilename) {
      alert('⚠️ กรุณาอัพโหลดไฟล์เสียงต้นฉบับก่อน!');
      return;
    }
    if (!tags.trim()) {
      alert(`⚠️ Please enter ${isYuE2 || isCover ? 'style description' : 'style tags'}!`);
      return;
    }
    if (!lyrics.trim()) {
      alert("⚠️ Please enter lyrics or use 'instrumental'!");
      return;
    }

    onResult(null);
    onLoading({ 
      title: isCover ? 'Covering song...' : isYuE2 ? 'Composing with YuE2...' : 'Composing Music...', 
      detail: isCover ? 'Analyzing melody and generating cover... (2-5 min)' : 'This may take 1-3 minutes...' 
    });

    try {
      const payload = {
        model: selectedModel,
        tags: tags.trim(),
        lyrics: lyrics.trim(),
        duration: Math.round(Math.min(duration, currentModel.maxDuration)),
        bpm: currentModel.useBpm ? Math.round(bpm) : 72,
        seed: seed,
        audio_filename: audioFilename,  // ✅ ส่ง filename สำหรับ Cover
      };

      for await (const ev of readSSE('/api/generate-audio-stream', payload)) {
        if (ev.type === 'progress') {
          const pct = Math.round((ev.value / ev.max) * 100);
          onLoading({ title: `${pct}%`, detail: 'Composing...', progress: pct });
        } else if (ev.type === 'executing' && ev.node) {
          onLoading({ title: 'Composing...', detail: `Processing node ${ev.node}...` });
        } else if (ev.type === 'saved') {
          onResult({
            kind: 'audio',
            url: ev.url,
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
      {/* Model Selection */}
      <div className="space-y-2">
        <Label>🎵 Model</Label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white transition hover:bg-slate-700 focus:border-purple-500 focus:outline-none"
        >
          {AUDIO_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Model Info */}
      <div className={`rounded-lg border p-3 text-xs ${
        isCover
          ? 'border-orange-700/30 bg-orange-900/20 text-orange-300'
          : isYuE2 
            ? 'border-emerald-700/30 bg-emerald-900/20 text-emerald-300'
            : 'border-purple-700/30 bg-purple-900/20 text-purple-300'
      }`}>
        <span className="mr-1">✨</span>
        <strong>{currentModel.label}</strong> — {currentModel.desc}
      </div>

      {/* ✅ Audio Upload - สำหรับ Cover mode เท่านั้น */}
      {isCover && (
        <div className="space-y-2">
          <Label>🎵 Reference Song (Required)</Label>
          
          {!audioFilename ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-orange-500/50 bg-orange-900/10 p-6 transition hover:border-orange-500 hover:bg-orange-900/20"
            >
              {uploading ? (
                <>
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  <p className="text-sm text-orange-300">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-orange-400" />
                  <p className="text-sm font-medium text-orange-300">
                    Click to upload audio file
                  </p>
                  <p className="text-[10px] text-slate-500">
                    MP3, WAV, FLAC, M4A (recommended: 30s - 3min)
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-orange-500/30 bg-orange-900/20 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-pink-500">
                <Music className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {audioFile?.name || audioFilename}
                </p>
                <p className="text-[10px] text-slate-400">
                  {audioFile && `${(audioFile.size / 1024 / 1024).toFixed(2)} MB`}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={removeAudio}
                className="h-8 w-8 shrink-0 text-slate-400 hover:bg-red-900/30 hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => e.target.files?.[0] && handleAudioUpload(e.target.files[0])}
            className="hidden"
          />
          
          <p className="text-[10px] text-slate-500">
            💡 เพลงต้นฉบับจะถูกใช้เพื่อวิเคราะห์ทำนอง YuE2 จะ cover ใหม่ด้วยสไตล์ที่คุณกำหนด
          </p>
        </div>
      )}

      {/* Style Tags / Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{isYuE2 || isCover ? '🎨 Style Description' : '🎼 Style Tags'}</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTags('')}
            className="h-6 px-2 text-xs text-slate-500 hover:text-red-400"
          >
            🗑️ Clear
          </Button>
        </div>
        
        {isYuE2 || isCover ? (
          <Textarea
            rows={4}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Describe the NEW style... e.g., Soulful jazz-pop with Rhodes piano, warm saxophone..."
            className="resize-y font-mono text-xs"
          />
        ) : (
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., Pop, Rock, EDM, 120 BPM"
          />
        )}
        
        <p className="text-xs text-slate-500">
          {isCover
            ? '💡 อธิบายสไตล์ใหม่ที่ต้องการ (ทำนองจะคงเดิมจากเพลงต้นฉบับ)'
            : isYuE2
              ? '💡 อธิบายแนวเพลง เครื่องดนตรี อารมณ์ ให้ละเอียด'
              : 'ระบุแนวเพลง, BPM, อารมณ์'}
        </p>
        
        {/* Style Presets */}
        <div className="flex flex-wrap gap-1.5">
          {(isYuE2 || isCover ? STYLE_PRESETS : TAG_PRESETS).map((p) => (
            <button
              key={p.label}
              onClick={() => isYuE2 || isCover ? setTags(p.value) : addTag(p.value)}
              className={`rounded-full border px-2 py-1 text-[10px] transition ${
                isCover
                  ? 'border-orange-700 bg-orange-900/40 text-orange-300 hover:bg-orange-600 hover:text-white'
                  : isYuE2
                    ? 'border-emerald-700 bg-emerald-900/40 text-emerald-300 hover:bg-emerald-600 hover:text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-purple-600 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lyrics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>📝 Lyrics</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLyrics('')}
            className="h-6 px-2 text-xs text-slate-500 hover:text-red-400"
          >
            🗑️ Clear
          </Button>
        </div>
        <Textarea
          rows={6}
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder={
            isYuE2 || isCover
              ? '[Verse]\nYour lyrics here...\n\n[Chorus]\nChorus lyrics...'
              : "ใส่เนื้อเพลง หรือพิมพ์ 'instrumental' สำหรับเพลงบรรเลง"
          }
          className="resize-y font-mono text-xs"
        />
        <p className="text-xs text-slate-500">
          {isCover
            ? '💡 ใส่เนื้อเพลงใหม่ที่ต้องการ (ทำนองจะคงเดิม)'
            : isYuE2
              ? '💡 ใช้ [Verse], [Chorus], [Bridge] เพื่อแบ่งท่อนเพลง'
              : 'พิมพ์ "instrumental" สำหรับเพลงไม่มีเนื้อร้อง'}
        </p>

        {/* Lyrics Presets */}
        <div className="flex flex-wrap gap-1.5">
          {(isYuE2 || isCover ? LYRICS_PRESETS_YUE2 : LYRICS_PRESETS_COMMON).map((p) => (
            <button
              key={p.label}
              onClick={() => setLyrics(p.value)}
              className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-300 transition hover:bg-blue-600 hover:text-white"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration + BPM */}
      <div className={`grid gap-3 ${currentModel.useBpm ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className="space-y-2">
          <Label>⏱️ Duration (seconds)</Label>
          <Input
            type="number"
            min={10}
            max={currentModel.maxDuration}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
          <p className="text-[10px] text-slate-500">
            10 - {currentModel.maxDuration} วินาที
            {isCover && <span className="ml-1 text-orange-400">(max 6 นาที)</span>}
            {isYuE2 && <span className="ml-1 text-emerald-400">(max 4 นาที)</span>}
          </p>
        </div>
        
        {currentModel.useBpm && (
          <div className="space-y-2">
            <Label>🎼 BPM</Label>
            <Input
              type="number"
              min={40}
              max={240}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
            />
            <p className="text-[10px] text-slate-500">จังหวะ (40-240)</p>
          </div>
        )}
      </div>

      {/* Seed */}
      <div className="space-y-2">
        <Label>🎲 Seed (-1 for random)</Label>
        <Input
          type="number"
          value={seed}
          onChange={(e) => setSeed(Number(e.target.value))}
        />
      </div>

      {/* Generate Button */}
      <Button
        onClick={generate}
        className={`w-full bg-gradient-to-r ${
          isCover
            ? 'from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500'
            : isYuE2
              ? 'from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500'
              : 'from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500'
        }`}
      >
        {isCover ? '🎤 Cover Song' : isYuE2 ? '🎼 Compose with YuE2' : '🎵 Compose Music'}
      </Button>

      {/* Model Comparison Info */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-3 text-[10px] text-slate-400">
        <p className="mb-1 font-semibold text-slate-300">ℹ️ ข้อมูลโมเดล</p>
        <div className="space-y-0.5">
          <p>• <strong>AceStep 1.5</strong>: เร็ว, รองรับ BPM, นามสกุล MP3</p>
          <p>• <strong>YuE2 T2M</strong>: คุณภาพสูง, ไม่มี BPM, นามสกุล FLAC, max 4 นาที</p>
          <p>• <strong>YuE2 Cover</strong>: 🎤 Cover เพลง, ต้อง upload audio, max 6 นาที</p>
        </div>
      </div>
    </div>
  );
}