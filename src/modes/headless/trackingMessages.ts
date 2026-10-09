import type { Position } from '../../rendering/types.ts';

export type TrackingStatus = 'off' | 'loading' | 'searching' | 'tracking' | 'error';
export type TrackingRequest =
  | { type: 'init'; assets: string }
  | { type: 'frame'; frame: ImageBitmap; timestamp: number; generation: number };
export type TrackingResponse =
  | { type: 'ready' }
  | { type: 'face'; outline: Position[] | null; timestamp: number; generation: number }
  | { type: 'error' };
