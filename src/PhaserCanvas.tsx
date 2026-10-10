import type { TrackingPerformance } from './modes/headless/TrackingPerformance';
import * as Phaser from 'phaser';
import { forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from 'react';
import { styled } from '@linaria/react';
import { ExperimentScene } from './rendering/ExperimentScene';
import type { TrackingStatus } from './modes/headless/trackingMessages';
import { HEIGHT, WIDTH, type Settings } from './rendering/types';

const Host = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #101715;
  canvas {
    display: block;
  }
`;
export interface CanvasHandle {
  capture: () => boolean;
  clear: () => void;
  retryTracking: () => void;
}
interface Props {
  settings: Settings;
  video: RefObject<HTMLVideoElement | null>;
  onPerformance: (metrics: TrackingPerformance | null) => void;
  onTracking: (status: TrackingStatus) => void;
}

/** Bridge React and Phaser; the scene owns scheduling, input, and rendering. */
export const PhaserCanvas = forwardRef<CanvasHandle, Props>(function PhaserCanvas(
  { settings, video, onTracking, onPerformance },
  ref,
) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef({ settings, onTracking, onPerformance });
  live.current = { settings, onTracking, onPerformance };
  const scene = useRef<ExperimentScene | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      capture: () => scene.current?.capture() ?? false,
      clear: () => scene.current?.effectRenderer.clear(),
      retryTracking: () => scene.current?.retryTracking(),
    }),
    [],
  );

  useEffect(() => {
    if (!host.current) return;
    const experiment = new ExperimentScene(
      () => live.current,
      () => video.current,
    );
    scene.current = experiment;
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: host.current,
      width: WIDTH,
      height: HEIGHT,
      backgroundColor: '#101715',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: experiment,
    });
    return () => {
      experiment.dispose();
      scene.current = null;
      game.destroy(true);
    };
  }, [video]);

  return (
    <Host
      ref={host}
      aria-label="Live visual experiment. In headless mode, the opening follows your face automatically."
    />
  );
});
