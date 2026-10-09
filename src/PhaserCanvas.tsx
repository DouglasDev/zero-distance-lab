import * as Phaser from 'phaser';
import { forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from 'react';
import { styled } from '@linaria/react';
import { ExperimentScene } from './rendering/ExperimentScene';
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
}
interface Props {
  settings: Settings;
  video: RefObject<HTMLVideoElement | null>;
  onPosition: (x: number, y: number) => void;
}

/** Bridge React and Phaser; the scene owns scheduling, input, and rendering. */
export const PhaserCanvas = forwardRef<CanvasHandle, Props>(function PhaserCanvas(
  { settings, video, onPosition },
  ref,
) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef({ settings, onPosition });
  live.current = { settings, onPosition };
  const scene = useRef<ExperimentScene | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      capture: () => scene.current?.capture() ?? false,
      clear: () => scene.current?.effectRenderer.clear(),
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
      scene.current = null;
      game.destroy(true);
    };
  }, [video]);

  return (
    <Host
      ref={host}
      aria-label="Live visual experiment. In headless mode, drag the circular opening or use the position sliders."
    />
  );
});
