'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { UploadBox } from '@/components/studio/upload-box';
import { readSSE } from '@/lib/stream';
import { EDIT_MODELS } from '@/lib/models';
import type { TabProps } from '@/lib/types';

export function EditControls({ onLoading, onResult }: TabProps) {
  const [model, setModel] = useState(EDIT_MODELS[0].value);
  const [prompt, setPrompt] = useState('');
  const [image1Filename, setImage1Filename] = useState('');
  const [image2Filename, setImage2Filename] = useState('');

  const currentModel = useMemo(
    () => EDIT_MODELS.find((m) => m.value === model),
    [model]
  );

  // Reset image2 เมื่อเปลี่ยนโมเดล (ป้องกันปัญหาภาพค้าง)
  function handleModelChange(newModel: string) {
    setModel(newModel);
    setImage2Filename('');
    setPrompt('');
  }

  async function generate() {
    // Validation
    if (!currentModel) return;
    
    if (!image1Filename) {
      alert('⚠️ Please upload Image 1!');
      return;
    }
    if (currentModel.image2Required && !image2Filename) {
      alert(`⚠️ ${currentModel.value} requires Image 2!`);
      return;
    }
    if (!prompt.trim() && currentModel.value !== 'Flux Face Swap') {
      alert('⚠️ Please enter an instruction!');
      return;
    }

    onResult(null);
    onLoading({ title: 'Editing Image...', detail: 'Please wait...' });

    try {
      const payload = {
        prompt: prompt || 'default',
        model,
        seed: -1,
        width: 1024,
        height: 1024,
        lora_filename: '',
        lora_strength: 0,
        mode: 'edit',
        image1_filename: image1Filename,
        image2_filename: image2Filename,
      };

      for await (const ev of readSSE('/api/generate-stream', payload)) {
        if (ev.type === 'progress') {
          const pct = Math.round((ev.value / ev.max) * 100);
          onLoading({ title: `${pct}%`, detail: 'Editing...', progress: pct });
        } else if (ev.type === 'executing' && ev.node) {
          onLoading({ title: 'Editing Image...', detail: `Processing node ${ev.node}...` });
        } else if (ev.type === 'saved') {
          onResult({
            kind: 'image',
            url: ev.base64 || ev.url,
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
      {/* Model Selector */}
      <div className="space-y-2">
        <Label>Edit Model</Label>
        <Select value={model} onValueChange={handleModelChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[320px]">
            {EDIT_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Image 1 (Required เสมอ) */}
      <UploadBox
        label="📷 Image 1"
        kind="image"
        onUploaded={setImage1Filename}
        required
      />

      {/* Image 2 (ตามเงื่อนไขของแต่ละโมเดล) */}
      {currentModel?.needsImage2 && (
        <UploadBox
          label="📷 Image 2"
          kind="image"
          onUploaded={setImage2Filename}
          required={currentModel.image2Required}
        />
      )}

      {/* Prompt */}
      <div className="space-y-2">
        <Label>{currentModel?.promptLabel || '📝 Prompt'}</Label>
        <Textarea
          rows={currentModel?.promptRows || 3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={currentModel?.promptPlaceholder || 'Describe the edit...'}
        />
      </div>

      {/* Tips */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 text-xs text-slate-400">
        {model === 'KREA-2-CONTROLNET' ? (
          <p>
            💡 <strong>Tip:</strong> ใช้คำสั่งสั้นๆ Gemma4 จะช่วย gen prompt ยาวให้อัตโนมัติ
            รักษา pose เดิมด้วย Depth ControlNet
          </p>
        ) : model === 'Krea2 Identity Edit' ? (
          <p>
            💡 <strong>Tip:</strong> ใส่รูป reference 1 รูป + คำสั่ง จะคงเอกลักษณ์บุคคลไว้
          </p>
        ) : model === 'Krea2 Identity Edit (2 Ref)' ? (
          <p>
            💡 <strong>Tip:</strong> ใส่รูป 2 รูป เช่น คน 2 คน แล้วสั่งให้มาอยู่ในฉากเดียวกัน
          </p>
        ) : model === 'Flux Face Swap' ? (
          <p>
            💡 <strong>Tip:</strong> Image 1 = รูปต้นทาง, Image 2 = รูปใบหน้าที่จะสลับมา
          </p>
        ) : (
          <p>
            💡 <strong>Tip:</strong> Image 2 เป็น optional ใช้สำหรับ reference เพิ่มเติม
          </p>
        )}
      </div>

      {/* Generate Button */}
      <Button
        onClick={generate}
        className="w-full bg-gradient-to-r from-pink-500 to-orange-600 hover:from-pink-400 hover:to-orange-500"
      >
        ✨ Edit Image
      </Button>
    </div>
  );
}