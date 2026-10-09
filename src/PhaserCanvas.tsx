import * as Phaser from 'phaser';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { styled } from '@linaria/react';
import { Effects, HEIGHT, WIDTH, type Settings } from './effects';

const Host = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #101715;
  canvas { display: block; }
`;
export interface CanvasHandle { capture: () => boolean; clear: () => void; }
interface Props {
  settings: Settings;
  video: React.RefObject<HTMLVideoElement | null>;
  onPosition: (x: number, y: number) => void;
}

export const PhaserCanvas = forwardRef<CanvasHandle, Props>(function PhaserCanvas({ settings, video, onPosition }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef({ settings, onPosition });
  live.current = { settings, onPosition };
  const effects = useRef<Effects | null>(null);
  const time = useRef(0);

  useImperativeHandle(ref, () => ({
    capture: () => {
      const fx = effects.current;
      if (!fx) return false;
      fx.updateSource(video.current, live.current.settings.demo, time.current);
      fx.capture(live.current.settings.demo);
      return true;
    },
    clear: () => effects.current?.clear(),
  }), [video]);

  useEffect(() => {
    if (!host.current) return;
    const fx = new Effects();
    effects.current = fx;
    let texture: Phaser.Textures.CanvasTexture;
    let lastFrame = -Infinity;
    let elapsed = 0;
    let dragging = false;
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: host.current,
      width: WIDTH, height: HEIGHT,
      backgroundColor: '#101715',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: {
        create: function(this: Phaser.Scene) {
          texture = this.textures.createCanvas('effect', WIDTH, HEIGHT)!;
          this.add.image(0, 0, 'effect').setOrigin(0);
          this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const s = live.current.settings;
            dragging = s.mode === 'headless' && Math.hypot(pointer.x-s.x*WIDTH, pointer.y-s.y*HEIGHT) < s.radius*HEIGHT;
          });
          this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!dragging || !pointer.isDown) return;
            live.current.onPosition(Phaser.Math.Clamp(pointer.x/WIDTH, .05, .95), Phaser.Math.Clamp(pointer.y/HEIGHT, .05, .95));
          });
          this.input.on('pointerup', () => { dragging = false; });
          this.input.on('gameout', () => { dragging = false; });
        },
        update: function(this: Phaser.Scene, now: number) {
          if (!texture || now-lastFrame < 1000/30) return;
          const step = Math.min(now-lastFrame, 100);
          lastFrame = now;
          // Pausing freezes the surround's phase, while the camera keeps running.
          if (live.current.settings.motion) elapsed += step;
          time.current = elapsed;
          fx.updateSource(video.current, live.current.settings.demo, elapsed);
          fx.render(texture.getContext(), live.current.settings, elapsed);
          texture.refresh();
        },
      },
    });
    return () => { effects.current = null; game.destroy(true); };
  }, [video]);

  return <Host ref={host} aria-label="Live visual experiment. In headless mode, drag the circular opening or use the position sliders." />;
});
