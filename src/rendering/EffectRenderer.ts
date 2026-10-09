import { HeadlessEffect } from '../modes/headless/HeadlessEffect.ts';
import { SphereEffect } from '../modes/sphere/SphereEffect.ts';
import { StillCenterEffect } from '../modes/still/StillCenterEffect.ts';
import { FrameSource } from './FrameSource.ts';
import { WIDTH, HEIGHT, type Effect, type Mode, type Settings } from './types.ts';

/** Own the frame source and delegate algorithms to independent effects. */
export class EffectRenderer {
  readonly source = new FrameSource();
  readonly headless = new HeadlessEffect();
  private effects: Record<Mode, Effect> = {
    headless: this.headless,
    sphere: new SphereEffect(),
    still: new StillCenterEffect(),
  };

  updateSource(video: HTMLVideoElement | null, demo: boolean, time: number) {
    this.source.update(video, demo, time);
  }

  capture(demo: boolean) {
    this.headless.capture(this.source, demo);
  }
  clear() {
    this.headless.clear();
  }
  get hasBackground() {
    return this.headless.hasBackground;
  }

  render(context: CanvasRenderingContext2D, settings: Settings, time: number) {
    context.clearRect(0, 0, WIDTH, HEIGHT);
    this.effects[settings.mode].render(context, this.source, settings, time);
  }
}
