export const IMAGE_MODELS = [
  'Krea2 Turbo', 'Ideogram 4', 'Boogu Image Turbo', 'Z-image x PID4K',
  'Z-Image Turbo', 'Z-Image Turbo-GGUF', 'Flux 2 Klein-GGUF',
  'Qwen Image 2512', 'Wan2.2 Image', 'MeinaMix Anime',
];

export const SIZE_OPTIONS = [720, 864, 1024, 1080, 1280, 1440, 1536, 1920, 2160, 2560, 3840];

export const VIDEO_MODELS = [
  { value: 'MiniMax H3 I2V', label: '🎬 MiniMax H3 I2V (Image to Video)', needsImage: true },
  { value: 'MiniMax H3 I2V (GGUF)', label: '🎬 MiniMax H3 I2V GGUF (Low VRAM)', needsImage: true },
  { value: 'MiniMax H3 T2V', label: '🎬 MiniMax H3 T2V (Text to Video)', needsImage: false },
  { value: 'MiniMax H3 T2V (GGUF)', label: '🎬 MiniMax H3 T2V GGUF (Low VRAM)', needsImage: false },
  { value: 'LTX Video 2.3', label: '🎬 LTX Video 2.3 (Image-to-Video)', needsImage: true },
  { value: 'LTX 2.3 Lipsync', label: '🎤 LTX 2.3 Lipsync (Audio + Image)', needsImage: true },
  { value: 'LTX 2.5 T2V', label: '🎬 LTX 2.5 T2V (Video + Audio Auto)', needsImage: false },
  { value: 'LTX 2.5 I2V', label: '🎬 LTX 2.5 I2V (Image + Video + Audio)', needsImage: true },
];

export const TOOLS_MODELS = [
  {
    value: 'RTX Image Upscale',
    label: '🖼️ RTX Image Upscale (4K Enhancement)',
    type: 'image-upscale',
    needsImage: true,
    needsVideo: false,
    hasScaleQuality: true,
  },
  {
    value: 'RTX Video Upscale',
    label: '🎬 RTX Video Upscale (4K Enhancement)',
    type: 'video-upscale',
    needsImage: false,
    needsVideo: true,
    hasScaleQuality: true,
  },
  {
    value: 'NvidiaPID Upscale 4K',
    label: '🌟 NvidiaPID Upscale 4K',
    type: 'image-upscale',
    needsImage: true,
    needsVideo: false,
    hasScaleQuality: false,
  },
  {
    value: 'Gemma4 Image to Text',
    label: '💎 Gemma4 Image to Text (Vision LLM)',
    type: 'llm',
    needsImage: true,
    needsVideo: false,
    hasScaleQuality: false,
  },
  {
    value: 'Qwen3.5 Image to Text',
    label: '🔤 Qwen3.5 Image to Text (Vision LLM)',
    type: 'llm',
    needsImage: true,
    needsVideo: false,
    hasScaleQuality: false,
  },
];

export const EDIT_MODELS = [
  {
    value: 'Krea2 Identity Edit',
    label: '🎭 Krea2 Identity Edit (1 Ref Image)',
    needsImage1: true,
    needsImage2: false,
    image2Required: false,
    promptLabel: '📝 Edit Instruction',
    promptPlaceholder: 'e.g., "Change background to Night Club"',
    promptRows: 3,
  },
  {
    value: 'Krea2 Identity Edit (2 Ref)',
    label: '🎭 Krea2 Identity Edit (2 Ref Images)',
    needsImage1: true,
    needsImage2: true,
    image2Required: true,
    promptLabel: '📝 Edit Instruction',
    promptPlaceholder: 'e.g., "Make them stand side by side"',
    promptRows: 3,
  },
  {
    value: 'KREA-2-CONTROLNET',
    label: '🎯 KREA-2-CONTROLNET (Auto Prompt + Depth)',
    needsImage1: true,
    needsImage2: false,
    image2Required: false,
    promptLabel: '🎯 Short Instruction (Auto-Prompt by Gemma4)',
    promptPlaceholder: 'e.g., "change hair to blonde", "add sunglasses"',
    promptRows: 2,
  },
  {
    value: 'Flux Face Swap',
    label: '🔄 Flux Face Swap (2 Images Required)',
    needsImage1: true,
    needsImage2: true,
    image2Required: true,
    promptLabel: '📝 Prompt (Optional)',
    promptPlaceholder: 'Additional instructions (optional)...',
    promptRows: 2,
  },
  {
    value: 'Qwen Image Edit',
    label: '✏️ Qwen Image Edit (Image2 Optional)',
    needsImage1: true,
    needsImage2: true,
    image2Required: false,
    promptLabel: '📝 Edit Instruction',
    promptPlaceholder: 'e.g., "Remove the person on the right"',
    promptRows: 3,
  },
];