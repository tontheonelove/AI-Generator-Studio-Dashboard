'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { UploadBox } from '@/components/studio/upload-box';
import { readSSE } from '@/lib/stream';
import { loadLoras } from '@/lib/api';
import { EDIT_MODELS } from '@/lib/models';
import type { TabProps, Lora } from '@/lib/types';

// FaceSwap / BodySwap options
const FACESWAP_ASPECT_RATIOS = [
  { value: '1:1 (Square)', label: '⬜ 1:1 Square' },
  { value: '3:4 (Portrait)', label: '📷 3:4 Portrait' },
  { value: '4:3 (Landscape)', label: '🖥️ 4:3 Landscape' },
  { value: '9:16 (Vertical)', label: '📱 9:16 Vertical' },
  { value: '16:9 (Horizontal)', label: '🎞️ 16:9 Horizontal' },
];

const FACESWAP_MEGAPIXELS = [
  { value: '1', label: '1 MP (1024x1024)' },
  { value: '2', label: '2 MP (1408x1408) - Recommended' },
  { value: '3', label: '3 MP (1728x1728)' },
];

export function EditControls({ onLoading, onResult }: TabProps) {
  const [model, setModel] = useState(EDIT_MODELS[0].value);
  const [prompt, setPrompt] = useState('');
  const [image1Filename, setImage1Filename] = useState('');
  const [image2Filename, setImage2Filename] = useState('');
  const [loras, setLoras] = useState<Lora[]>([]);
  const [loraIndex, setLoraIndex] = useState(0);
  
  const [aspectRatio, setAspectRatio] = useState('1:1 (Square)');
  const [megapixels, setMegapixels] = useState('2');

  const currentModel = useMemo(
    () => EDIT_MODELS.find((m) => m.value === model),
    [model]
  );

  useEffect(() => {
    if (currentModel?.needsLora) {
      loadLoras(model).then((list) => {
        setLoras(list);
        setLoraIndex(list.length > 0 ? 0 : -1);
      });
    } else {
      setLoras([]);
      setLoraIndex(-1);
    }
  }, [model, currentModel?.needsLora]);

  function handleModelChange(newModel: string) {
    setModel(newModel);
    setImage2Filename('');
    setPrompt('');
    setAspectRatio('1:1 (Square)');
    setMegapixels('2');
  }

  async function generate() {
    if (!currentModel) return;
    
    if (!image1Filename) {
      alert('⚠️ Please upload Image 1!');
      return;
    }
    if (currentModel.image2Required && !image2Filename) {
      alert(`⚠️ ${currentModel.value} requires Image 2!`);
      return;
    }
    
    const skipPromptCheck = currentModel.fixedPrompt || currentModel.value === 'Flux Face Swap';
    if (!skipPromptCheck && !prompt.trim()) {
      alert('⚠️ Please enter an instruction!');
      return;
    }
    
    if (currentModel.needsLora && loraIndex < 0) {
      alert('⚠️ This model requires a LoRA! Please check lora_config.json');
      return;
    }

    onResult(null);
    onLoading({ 
      title: model === 'Qwen Image 2.1 FaceSwap' ? 'Face Swapping...' : 
             model === 'Qwen Image 2.1 Body Swap' ? 'Body Swapping...' :
             'Editing Image...', 
      detail: 'Please wait...' 
    });

    try {
      const selectedLora = currentModel?.needsLora && loraIndex >= 0 ? loras[loraIndex] : undefined;
      
      const payload = {
        prompt: currentModel.fixedPrompt ? '' : (prompt || 'default'),
        model,
        seed: -1,
        width: 1024,
        height: 1024,
        lora_filename: selectedLora?.filename ?? '',
        lora_strength: selectedLora?.strength ?? 0,
        mode: 'edit',
        image1_filename: image1Filename,
        image2_filename: image2Filename,
      };

      for await (const ev of readSSE('/api/generate-stream', payload)) {
        if (ev.type === 'progress') {
          const pct = Math.round((ev.value / ev.max) * 100);
          onLoading({ title: `${pct}%`, detail: 'Processing...', progress: pct });
        } else if (ev.type === 'executing' && ev.node) {
          onLoading({ title: 'Processing...', detail: `Node ${ev.node}...` });
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
        <Select value={model} onValueChange={(v) => v && handleModelChange(v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[320px] max-w-[90vw]">
            {EDIT_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Image 1 */}
      <UploadBox
        label={
          model === 'Qwen Image 2.1 FaceSwap' ? '📷 Image 1 (Body Reference)' :
          model === 'Qwen Image 2.1 Body Swap' ? '📷 Image 1 (Scene Reference)' :
          '📷 Image 1'
        }
        kind="image"
        onUploaded={setImage1Filename}
        required
      />

      {/* Image 2 */}
      {currentModel?.needsImage2 && (
        <UploadBox
          label={
            model === 'Qwen Image 2.1 FaceSwap' ? '📷 Image 2 (Head Reference)' :
            model === 'Qwen Image 2.1 Body Swap' ? '📷 Image 2 (Body Reference)' :
            '📷 Image 2'
          }
          kind="image"
          onUploaded={setImage2Filename}
          required={currentModel.image2Required}
        />
      )}

      {/* FaceSwap / BodySwap Options */}
      {(model === 'Qwen Image 2.1 FaceSwap' || model === 'Qwen Image 2.1 Body Swap') && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>📐 Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={(v) => v && setAspectRatio(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[180px]">
                {FACESWAP_ASPECT_RATIOS.map((ar) => (
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
              <SelectContent className="min-w-[180px]">
                {FACESWAP_MEGAPIXELS.map((mp) => (
                  <SelectItem key={mp.value} value={mp.value}>
                    {mp.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* LoRA Selector */}
      {currentModel?.needsLora && (
        <div className="space-y-2">
          <Label>🎨 LoRA (Required)</Label>
          <Select 
            value={loraIndex >= 0 ? String(loraIndex) : "-1"}
            onValueChange={(v) => v && setLoraIndex(Number(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[280px] max-w-[90vw]">
              {loras.length === 0 ? (
                <SelectItem value="-1">⚠️ No LoRA found</SelectItem>
              ) : (
                loras.map((l, i) => (
                  <SelectItem key={l.filename} value={String(i)}>
                    {l.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-amber-400">
            ⚠️ โมเดลนี้บังคับใช้ LoRA ในการสร้าง
          </p>
        </div>
      )}

      {/* Prompt - ซ่อนเมื่อ fixedPrompt */}
      {currentModel?.fixedPrompt ? (
        <div className="space-y-2">
          <Label>🔒 Prompt (Fixed)</Label>
          <div className="rounded-lg border border-emerald-700/30 bg-emerald-900/20 p-3 text-xs text-emerald-300">
            <p className="mb-2">
              <span className="mr-1">✅</span>
              <strong>Prompt ถูก fix ไว้แล้ว</strong> เพื่อผลลัพธ์ที่ดีที่สุด
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-[10px] text-slate-400 hover:text-emerald-300">
                👀 ดู Prompt
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-900/50 p-2 text-[10px] text-slate-300">
                {currentModel.fixedPromptText}
              </pre>
            </details>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>{currentModel?.promptLabel || '📝 Prompt'}</Label>
          <Textarea
            rows={currentModel?.promptRows || 3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={currentModel?.promptPlaceholder || 'Describe the edit...'}
          />
        </div>
      )}

      {/* ✅ Tips - แก้ไขแล้ว เรียงให้ถูกต้อง */}
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
        ) : model === 'Qwen Image 2.1 Union Control' ? (
          <p>
            💡 <strong>Tip:</strong> ใช้ Canny ControlNet รักษาโครงร่างรูปต้นแบบ + LoRA 8-step turbo สำหรับความเร็วสูง
          </p>
        ) : model === 'Qwen Image 2.1 FaceSwap' ? (
          <p>
            💡 <strong>Tip:</strong> Image 1 = ร่างกาย/ฉากต้นแบบ, Image 2 = ใบหน้าที่จะสลับมา. Prompt ถูก fix ไว้แล้วเพื่อผลลัพธ์ที่ดีที่สุด
          </p>
        ) : model === 'Qwen Image 2.1 Body Swap' ? (
          <p>
            💡 <strong>Tip:</strong> Image 1 = ฉาก/pose ต้นแบบ, Image 2 = ร่างกายที่จะสลับมา (แนะนำรูป pose neutral). Prompt ถูก fix ไว้แล้วเพื่อผลลัพธ์ที่ดีที่สุด
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
        ✨ {
          model === 'Qwen Image 2.1 FaceSwap' ? 'Face Swap' :
          model === 'Qwen Image 2.1 Body Swap' ? 'Body Swap' :
          'Edit Image'
        }
      </Button>
    </div>
  );
}