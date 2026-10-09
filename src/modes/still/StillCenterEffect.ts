import { withCircleClip, strokeCircle } from '../../rendering/canvas.ts';
import {
  WIDTH,
  HEIGHT,
  type Effect,
  type Settings,
  type SourceFrame,
} from '../../rendering/types.ts';

export class StillCenterEffect implements Effect {
  render(ctx: CanvasRenderingContext2D, source: SourceFrame, settings: Settings, time: number) {
    const { radius, amount } = settings;
    const angle = Math.sin(time / 2200) * amount;
    ctx.save();
    ctx.translate(WIDTH / 2, HEIGHT / 2);
    ctx.rotate(angle);
    const cover = Math.max(
      1.6,
      Math.abs(Math.cos(angle)) + (WIDTH / HEIGHT) * Math.abs(Math.sin(angle)) + 0.05,
    );
    ctx.scale(cover, cover);
    ctx.drawImage(source.canvas, -WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT);
    ctx.restore();
    const r = radius * HEIGHT;
    withCircleClip(ctx, WIDTH / 2, HEIGHT / 2, r, () =>
      ctx.drawImage(source.canvas, 0, 0, WIDTH, HEIGHT),
    );
    strokeCircle(ctx, WIDTH / 2, HEIGHT / 2, r, '#e3ddbf', 4);
    ctx.save();
    ctx.translate(WIDTH / 2, HEIGHT / 2);
    ctx.rotate(angle);
    ctx.strokeStyle = '#e3ddbf99';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.75, r * 1.15, 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 2.3, r * 1.6, -0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
