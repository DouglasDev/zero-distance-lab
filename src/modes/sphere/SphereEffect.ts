import { createSurface } from '../../rendering/canvas.ts';
import {
  WIDTH,
  HEIGHT,
  SOURCE_WIDTH as SW,
  SOURCE_HEIGHT as SH,
  type Effect,
  type Settings,
  type SourceFrame,
} from '../../rendering/types.ts';

export class SphereEffect implements Effect {
  private orb = createSurface(240, 240);
  private orbPixels = this.orb.context.createImageData(240, 240);
  private lookup: Int32Array;

  constructor() {
    this.lookup = new Int32Array(240 * 240).fill(-1);
    // An inverted, radial image warp, not a measured ray trace of a glass sphere.
    for (let y = 0; y < 240; y++)
      for (let x = 0; x < 240; x++) {
        const nx = (x - 119.5) / 120,
          ny = (y - 119.5) / 120;
        const r = Math.hypot(nx, ny);
        if (r >= 1) continue;
        const warp = r ? Math.asin(r) / (Math.PI / 2) / r : 2 / Math.PI;
        const sx = Math.max(0, Math.min(SW - 1, Math.round(SW / 2 - (nx * warp * SW) / 2)));
        const sy = Math.max(0, Math.min(SH - 1, Math.round(SH / 2 - (ny * warp * SH) / 2)));
        this.lookup[y * 240 + x] = (sy * SW + sx) * 4;
      }
  }

  render(ctx: CanvasRenderingContext2D, sourceFrame: SourceFrame, settings: Settings) {
    const { radius } = settings;
    ctx.fillStyle = '#101715';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const source = sourceFrame.context.getImageData(0, 0, SW, SH).data;
    const out = this.orbPixels.data;
    for (let i = 0; i < this.lookup.length; i++) {
      const from = this.lookup[i],
        to = i * 4;
      if (from < 0) {
        out[to + 3] = 0;
        continue;
      }
      out[to] = source[from];
      out[to + 1] = source[from + 1];
      out[to + 2] = source[from + 2];
      out[to + 3] = 255;
    }
    this.orb.context.putImageData(this.orbPixels, 0, 0);
    const r = radius * HEIGHT * 1.8;
    ctx.drawImage(this.orb.canvas, WIDTH / 2 - r, HEIGHT / 2 - r, r * 2, r * 2);
    const glow = ctx.createRadialGradient(
      WIDTH / 2 - r * 0.3,
      HEIGHT / 2 - r * 0.4,
      r * 0.1,
      WIDTH / 2,
      HEIGHT / 2,
      r,
    );
    glow.addColorStop(0, '#ffffff18');
    glow.addColorStop(0.75, '#ffffff00');
    glow.addColorStop(1, '#ffffff60');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(WIDTH / 2, HEIGHT / 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e1eee588';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
