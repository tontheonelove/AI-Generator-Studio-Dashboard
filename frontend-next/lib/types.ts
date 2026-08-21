export interface Lora {
  label: string;
  filename: string;
  strength: number;
}

export interface LoadingState {
  title: string;
  detail: string;
  progress?: number;
}

export type ResultState =
  | { kind: 'image'; url: string; seed: string | number; filename: string }
  | { kind: 'video'; url: string; seed: string | number; filename: string }
  | { kind: 'audio'; url: string; filename: string }
  | { kind: 'text'; text: string };

export interface TabProps {
  onLoading: (state: LoadingState | null) => void;
  onResult: (result: ResultState | null) => void;
}