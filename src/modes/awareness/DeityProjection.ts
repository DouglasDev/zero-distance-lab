import { createSurface } from '../../rendering/canvas.ts';
import type { BodyFrame } from './bodyMessages.ts';
import type { FeatureTexture } from './FeatureTexture.ts';
import type { Settings, Position } from '../../rendering/types.ts';
import { MeshRenderer } from './visionary/MeshRenderer.ts';
import { grid } from './visionary/mesh.ts';
const gaussian = (u: number, v: number, x: number, y: number, s: number) =>
  Math.exp(-((u - x) ** 2 + (v - y) ** 2) / s);
/** Blend living features into museum artwork, then gently warp its head/arms with tracked movement. */
export class DeityProjection {
  private base = createSurface(519, 624);
  private meld = createSurface(519, 624);
  private crop = createSurface(519, 624);
  private renderer = new MeshRenderer();
  private ready = false;
  private failed = false;
  private image: HTMLImageElement | null = null;
  constructor(artwork?: CanvasImageSource) {
    if (artwork) {
      this.base.context.drawImage(artwork, 0, 0, 519, 624);
      this.ready = true;
    } else if (typeof Image !== 'undefined') {
      const image = new Image();
      this.image = image;
      image.onload = () => {
        this.base.context.drawImage(image, 0, 0, 519, 624);
        this.ready = true;
      };
      image.onerror = () => {
        this.failed = true;
      };
      image.src = `${import.meta.env?.BASE_URL ?? '/'}art/mahakala.jpg`;
    }
  }
  draw(
    ctx: CanvasRenderingContext2D,
    features: FeatureTexture,
    landmarks: Position[] | null,
    body: BodyFrame | null,
    settings: Settings,
  ) {
    if (!this.ready) {
      ctx.fillStyle = '#e9c899';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        this.failed ? 'Artwork could not load. Refresh to retry.' : 'Loading Mahakala artwork…',
        480,
        275,
      );
      return;
    }
    const c = this.meld.context;
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.drawImage(this.base.canvas, 0, 0);
    if (features.ready) {
      c.save();
      c.globalAlpha = settings.projectionOpacity * 0.85;
      c.globalCompositeOperation = 'luminosity';
      features.drawFace(c, 271, 197, 96, 81);
      c.globalAlpha = settings.projectionOpacity * 0.45;
      c.globalCompositeOperation = 'soft-light';
      features.drawFace(c, 271, 197, 96, 81);
      c.restore();
    }
    const crop = this.crop.context;
    crop.clearRect(0, 0, 519, 624);
    crop.drawImage(
      this.meld.canvas,
      519 * 0.18,
      624 * 0.12,
      519 * 0.65,
      624 * 0.65,
      0,
      0,
      519,
      624,
    );
    const nose = landmarks?.[1],
      dx = nose ? Math.max(-0.12, Math.min(0.12, (nose.x - 320) / 640)) : 0;
    const dy = nose ? Math.max(-0.09, Math.min(0.09, (nose.y - 145) / 360)) : 0;
    const pose = body?.pose ?? [];
    const arm = (index: number) =>
      pose[index]?.visibility > 0.5
        ? Math.max(-0.16, Math.min(0.16, (pose[index].y - 280) / 480))
        : 0;
    const mesh = grid(18, 22, (u, v) => {
      const head = gaussian(u, v, 0.52, 0.3, 0.035),
        left = gaussian(u, v, 0.27, 0.56, 0.025),
        right = gaussian(u, v, 0.74, 0.56, 0.025);
      return {
        x: (u - 0.5 + head * dx * 0.65) * 3.05 * settings.projectionSize,
        y:
          (0.5 - v - head * dy * 0.6 - left * arm(15) - right * arm(16)) *
          3.65 *
          settings.projectionSize,
        z: 4.8 - head * 0.06,
        u,
        v,
      };
    });
    this.renderer.draw(ctx, [mesh], this.crop.canvas, { x: 0, y: 0, z: 0, focal: 680 }, 1, false);
  }
  dispose() {
    this.renderer.dispose();
    if (this.image) {
      this.image.onload = null;
      this.image.onerror = null;
      this.image = null;
    }
  }
}
