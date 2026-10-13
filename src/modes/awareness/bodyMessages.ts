import type { Position } from '../../rendering/types.ts';
export interface BodyPoint extends Position {
  visibility: number;
}
export interface BodyFrame {
  image?: ImageBitmap;
  pose: BodyPoint[];
  mask: Uint8Array;
  width: number;
  height: number;
  timestamp: number;
}
export type BodyRequest =
  | { type: 'init'; assets: string }
  | { type: 'frame'; frame: ImageBitmap; timestamp: number; generation: number };
export type BodyResponse =
  | { type: 'ready' }
  | { type: 'error' }
  | { type: 'body'; result: BodyFrame | null; generation: number };
