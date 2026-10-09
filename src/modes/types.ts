import type { RefObject } from 'react';
import type { CanvasHandle } from '../PhaserCanvas';
import type { TrackingStatus } from './headless/trackingMessages';
import type { Settings } from '../rendering/types';

export interface ModeControlsProps {
  settings: Settings;
  trackingStatus: TrackingStatus;
  patch: (values: Partial<Settings>) => void;
  reset: () => void;
  active: boolean;
  canvas: RefObject<CanvasHandle | null>;
  cameraStatus: 'off' | 'requesting' | 'on';
  onCountdown: (value: number | null) => void;
}
