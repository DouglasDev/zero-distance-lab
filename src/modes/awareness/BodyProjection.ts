import { createSurface } from '../../rendering/canvas.ts';
import type { SourceFrame, Settings } from '../../rendering/types.ts';
import type { BodyFrame } from './bodyMessages.ts';
/** A soft segmentation alpha isolates the whole visible person, not just a skeleton. */
export class BodyProjection {
  private mask = createSurface(1, 1);
  private texture = createSurface(640, 360);
  private previous: BodyFrame | null = null;
  update(source: SourceFrame, body: BodyFrame | null) {
    if (!body) return;
    if (body !== this.previous) {
      this.mask.canvas.width = body.width;
      this.mask.canvas.height = body.height;
      const pixels = this.mask.context.createImageData(body.width, body.height);
      for (let i = 0; i < body.mask.length; i++) {
        const confidence = body.mask[i] / 255;
        const t = Math.max(0, Math.min(1, (confidence - 0.2) / 0.65));
        pixels.data[i * 4] = pixels.data[i * 4 + 1] = pixels.data[i * 4 + 2] = 255;
        pixels.data[i * 4 + 3] = Math.round(t * t * (3 - 2 * t) * 255);
      }
      this.mask.context.putImageData(pixels, 0, 0);
      this.previous = body;
    }
    const ctx = this.texture.context;
    ctx.clearRect(0, 0, 640, 360);
    ctx.drawImage(body.image ?? source.canvas, 0, 0, 640, 360);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(this.mask.canvas, 0, 0, 640, 360);
    ctx.restore();
  }
  get canvas() {
    return this.texture.canvas;
  }

  draw(ctx: CanvasRenderingContext2D, body: BodyFrame | null, settings: Settings) {
    if (!body) return;
    const width = 960 * settings.projectionSize,
      height = 540 * settings.projectionSize;
    ctx.drawImage(this.texture.canvas, 480 - width / 2, 270 - height / 2, width, height);
  }
}
