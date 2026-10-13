import { createSurface } from '../../rendering/canvas.ts';
import type { Position, SourceFrame } from '../../rendering/types.ts';
export const FEATURES = [
  { indices: [33, 160, 158, 133, 153, 144], x: -0.24, y: -0.17, w: 0.32, h: 0.16 },
  { indices: [362, 385, 387, 263, 373, 380], x: 0.24, y: -0.17, w: 0.32, h: 0.16 },
  { indices: [168, 6, 197, 195, 5, 4, 1, 2, 98, 327], x: 0, y: 0.06, w: 0.22, h: 0.34 },
  { indices: [61, 40, 37, 0, 267, 270, 291, 321, 314, 17, 84, 91], x: 0, y: 0.32, w: 0.4, h: 0.2 },
];
/** Live feature crops with a soft alpha edge; rebuilt once, reused for every room projection. */
export class FeatureTexture {
  readonly patches = FEATURES.map(() => createSurface(128, 128));
  ready = false;
  update(source: SourceFrame, landmarks: Position[] | null, eyesOnly = false) {
    this.ready = Boolean(landmarks);
    if (!landmarks) return;
    FEATURES.forEach((feature, i) => {
      if (eyesOnly && i > 1) return;
      const points = feature.indices.map((index) => landmarks[index]);
      if (points.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
        this.ready = false;
        return;
      }
      const left = Math.min(...points.map((p) => p.x)),
        right = Math.max(...points.map((p) => p.x));
      const top = Math.min(...points.map((p) => p.y)),
        bottom = Math.max(...points.map((p) => p.y));
      const w = Math.max(6, (right - left) * 1.5),
        h = Math.max(6, (bottom - top) * 1.8);
      const ctx = this.patches[i].context;
      ctx.clearRect(0, 0, 128, 128);
      ctx.drawImage(
        source.canvas,
        (left + right - w) / 2,
        (top + bottom - h) / 2,
        w,
        h,
        0,
        0,
        128,
        128,
      );
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      const fade = ctx.createRadialGradient(64, 64, 24, 64, 64, 64);
      fade.addColorStop(0, '#fff');
      fade.addColorStop(0.6, '#ffffffcc');
      fade.addColorStop(1, '#ffffff00');
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, 128, 128);
      ctx.restore();
    });
  }
  drawFace(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
    if (!this.ready) return;
    FEATURES.forEach((feature, i) =>
      ctx.drawImage(
        this.patches[i].canvas,
        x + feature.x * width - (feature.w * width) / 2,
        y + feature.y * height - (feature.h * height) / 2,
        feature.w * width,
        feature.h * height,
      ),
    );
  }
}
