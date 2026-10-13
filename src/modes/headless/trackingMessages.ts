import type { Position } from '../../rendering/types.ts';

export type TrackingStatus = 'off' | 'loading' | 'searching' | 'holding' | 'tracking' | 'error';
export type TrackingRequest =
  | { type: 'init'; assets: string }
  | {
      type: 'frame';
      frame: ImageBitmap;
      timestamp: number;
      generation: number;
      features?: boolean;
    };
export type TrackingResponse =
  | { type: 'ready'; backend?: 'GPU' | 'CPU' }
  | {
      type: 'face';
      outline: Position[] | null;
      landmarks?: Position[];
      timestamp: number;
      generation: number;
      inferenceMs?: number;
      backend?: 'GPU' | 'CPU';
    }
  | { type: 'error' };
