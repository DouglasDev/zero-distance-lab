import { createSurface, withCircleClip, strokeCircle } from '../../rendering/canvas.ts';
import { drawDemoRoom } from '../../rendering/demo.ts';
import {
  WIDTH,
  HEIGHT,
  SOURCE_WIDTH,
  SOURCE_HEIGHT,
  type Effect,
  type Settings,
  type SourceFrame,
  type Position,
} from '../../rendering/types.ts';

export class HeadlessEffect implements Effect {
  private background = createSurface(SOURCE_WIDTH, SOURCE_HEIGHT);
  hasBackground = false;

  capture(source: SourceFrame, demo: boolean) {
    if (demo) drawDemoRoom(this.background.context);
    else this.background.context.drawImage(source.canvas, 0, 0);
    this.hasBackground = true;
  }

  clear() {
    this.hasBackground = false;
    this.background.context.clearRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);
  }

  containsPoint(settings: Settings, point: Position) {
    return (
      Math.hypot(point.x - settings.x * WIDTH, point.y - settings.y * HEIGHT) <
      settings.radius * HEIGHT
    );
  }

  positionAtPoint(point: Position): Position {
    return {
      x: Math.max(0.05, Math.min(0.95, point.x / WIDTH)),
      y: Math.max(0.05, Math.min(0.95, point.y / HEIGHT)),
    };
  }

  render(ctx: CanvasRenderingContext2D, source: SourceFrame, settings: Settings) {
    ctx.drawImage(source.canvas, 0, 0, WIDTH, HEIGHT);
    const cx = settings.x * WIDTH,
      cy = settings.y * HEIGHT,
      r = settings.radius * HEIGHT;
    withCircleClip(ctx, cx, cy, r, () => {
      if (this.hasBackground) ctx.drawImage(this.background.canvas, 0, 0, WIDTH, HEIGHT);
      else {
        ctx.fillStyle = '#142d27';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }
    });
    strokeCircle(ctx, cx, cy, r, '#dddbc0', 3);
  }
}
