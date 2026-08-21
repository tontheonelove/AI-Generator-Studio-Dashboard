'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { readSSE } from '@/lib/stream';
import type { TabProps } from '@/lib/types';

// Preset tags สำหรับเลือกเร็ว
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

// Preset lyrics
const LYRICS_PRESETS = [
  { label: '🎼 Instrumental', value: 'instrumental' },
  { label: '🎤 Love Song', value: 'You are my sunshine\nMy only sunshine\nYou make me happy\nWhen skies are gray' },
  { label: '🌅 Morning Vibes', value: 'Waking up to a brand new day\nSun is shining, come what may\nCoffee in my hand, music on\nReady to face the day head on' },
  { label: '🌙 Night Dreams', value: 'Under the moonlight\nStars shining bright\nDancing in the dark\nWith all my heart' },
];

export function AudioControls({ onLoading, onResult }: TabProps) {
  const [tags, setTags] = useState('Euro EDM 140 BPM');
  const [lyrics, setLyrics] = useState('instrumental');
  const [duration, setDuration] = useState(60);
  const [bpm, setBpm] = useState(120);
  const [seed, setSeed] = useState(-1);

  function addTag(tag: string) {
    setTags((prev) => {
      const current = prev.trim();
      if (!current) return tag;
      return `${current}, ${tag}`;
    });
  }

  function useLyricsPreset(value: string) {
    setLyrics(value);
  }

  async function generate() {
    // Validation
    if (!tags.trim()) {
      alert('⚠️ Please enter style tags!');
      return;
    }
    if (!lyrics.trim()) {
      alert("⚠️ Please enter lyrics or use 'instrumental'!");
      return;
    }

    onResult(null);
    onLoading({ title: 'Composing Music...', detail: 'This may take 1-3 minutes...' });

    try {
      const payload = {
        model: 'AceStep 1.5 Audio',
        tags: tags.trim(),
        lyrics: lyrics.trim(),
        duration: Math.round(duration),
        bpm: Math.round(bpm),
        seed: seed,
      };

      for await (const ev of readSSE('/api/generate-audio-stream', payload)) {
        if (ev.type === 'progress') {
          const pct = Math.round((ev.value / ev.max) * 100);
          onLoading({ title: `${pct}%`, detail: 'Composing...', progress: pct });
        } else if (ev.type === 'executing' && ev.node) {
          onLoading({ title: 'Composing Music...', detail: `Processing node ${ev.node}...` });
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
      {/* Model Info */}
      <div className="rounded-lg border border-purple-700/30 bg-purple-900/20 p-3 text-xs text-purple-300">
        <span className="mr-1">🎵</span>
        <strong>AceStep 1.5</strong> — สร้างเพลงทั้งแบบมีเนื้อร้องและบรรเลง รองรับหลากหลายแนวเพลง
      </div>

      {/* Style Tags */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>🎼 Style Tags</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTags('')}
            className="h-6 px-2 text-xs text-slate-500 hover:text-red-400"
          >
            🗑️ Clear
          </Button>
        </div>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g., Pop, Rock, EDM, 120 BPM"
        />
        <p className="text-xs text-slate-500">ระบุแนวเพลง, BPM, อารมณ์</p>
        
        {/* Tag Presets */}
        <div className="flex flex-wrap gap-1.5">
          {TAG_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => addTag(p.value)}
              className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-300 transition hover:bg-purple-600 hover:text-white"
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
          placeholder="ใส่เนื้อเพลง หรือพิมพ์ 'instrumental' สำหรับเพลงบรรเลง"
          className="resize-y font-mono text-xs"
        />
        <p className="text-xs text-slate-500">
          พิมพ์ "instrumental" สำหรับเพลงไม่มีเนื้อร้อง
        </p>

        {/* Lyrics Presets */}
        <div className="flex flex-wrap gap-1.5">
          {LYRICS_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => useLyricsPreset(p.value)}
              className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-300 transition hover:bg-blue-600 hover:text-white"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration + BPM */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>⏱️ Duration (seconds)</Label>
          <Input
            type="number"
            min={10}
            max={180}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
          <p className="text-[10px] text-slate-500">10 - 180 วินาที</p>
        </div>
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
        className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500"
      >
        🎵 Compose Music
      </Button>
    </div>
  );
}