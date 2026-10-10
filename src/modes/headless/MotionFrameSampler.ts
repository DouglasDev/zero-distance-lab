import { createSurface } from '../../rendering/canvas.ts';
import type { GrayFrame } from './frameMotion.ts';

export class MotionFrameSampler {
  private surface = createSurface(160, 90, true);
  capture(canvas: HTMLCanvasElement): GrayFrame {
    this.surface.context.drawImage(canvas, 0, 0, 160, 90);
    const rgba = this.surface.context.getImageData(0, 0, 160, 90).data;
    const pixels = new Uint8Array(160 * 90);
    for (let i = 0; i < pixels.length; i++)
      pixels[i] = (rgba[i * 4] * 77 + rgba[i * 4 + 1] * 150 + rgba[i * 4 + 2] * 29) >> 8;
    return { width: 160, height: 90, pixels };
  }
}
