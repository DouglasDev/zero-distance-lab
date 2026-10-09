export type Mode = 'headless' | 'sphere' | 'still';
export interface Settings {
  mode: Mode;
  radius: number;
  x: number;
  y: number;
  motion: boolean;
  amount: number;
  demo: boolean;
}
export const WIDTH = 960;
export const HEIGHT = 540;
const SW = 640;
const SH = 360;

export class Effects {
  private source = document.createElement('canvas');
  private sourceContext: CanvasRenderingContext2D;
  private background = document.createElement('canvas');
  private backgroundContext: CanvasRenderingContext2D;
  private orb = document.createElement('canvas');
  private orbContext: CanvasRenderingContext2D;
  private orbPixels: ImageData;
  private lookup: Int32Array;
  hasBackground = false;

  constructor() {
    this.source.width = this.background.width = SW;
    this.source.height = this.background.height = SH;
    this.orb.width = this.orb.height = 240;
    this.sourceContext = this.source.getContext('2d', { willReadFrequently: true })!;
    this.backgroundContext = this.background.getContext('2d')!;
    this.orbContext = this.orb.getContext('2d')!;
    this.orbPixels = this.orbContext.createImageData(240, 240);
    this.lookup = new Int32Array(240 * 240).fill(-1);
    // An inverted, radial image warp, not a measured ray trace of a glass sphere.
    for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) {
      const nx = (x - 119.5) / 120, ny = (y - 119.5) / 120;
      const r = Math.hypot(nx, ny);
      if (r >= 1) continue;
      const warp = r ? Math.asin(r) / (Math.PI / 2) / r : 2 / Math.PI;
      const sx = Math.max(0, Math.min(SW - 1, Math.round(SW / 2 - nx * warp * SW / 2)));
      const sy = Math.max(0, Math.min(SH - 1, Math.round(SH / 2 - ny * warp * SH / 2)));
      this.lookup[y * 240 + x] = (sy * SW + sx) * 4;
    }
  }

  private demoRoom(context: CanvasRenderingContext2D) {
    context.fillStyle = '#354744'; context.fillRect(0, 0, SW, SH);
    context.fillStyle = '#719085'; context.fillRect(0, 0, SW, 255);
    context.fillStyle = '#c4c7a8'; context.fillRect(55, 40, 135, 145);
    context.fillStyle = '#517975'; context.fillRect(64, 49, 117, 127);
    context.fillStyle = '#c4c7a8'; context.fillRect(120, 45, 5, 135); context.fillRect(60, 110, 125, 5);
    context.fillStyle = '#d9b17d'; context.fillRect(455, 75, 100, 100);
    context.fillStyle = '#5c7261'; context.fillRect(465, 85, 80, 80);
    context.fillStyle = '#233632'; context.fillRect(415, 237, 165, 8);
    context.fillStyle = '#a39371'; context.fillRect(465, 207, 35, 30);
    context.fillStyle = '#365e42'; context.beginPath(); context.ellipse(480, 188, 22, 34, .4, 0, Math.PI * 2); context.fill();
  }

  updateSource(video: HTMLVideoElement | null, demo: boolean, time: number) {
    const ctx = this.sourceContext;
    if (demo) {
      this.demoRoom(ctx);
      const x = SW / 2 + Math.sin(time / 1600) * 30;
      ctx.fillStyle = '#d4b28a'; ctx.beginPath(); ctx.ellipse(x, 142, 47, 60, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#263734'; ctx.beginPath(); ctx.ellipse(x, 99, 49, 29, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#233632'; ctx.beginPath(); ctx.ellipse(x-17, 140, 4, 5, 0, 0, Math.PI*2); ctx.ellipse(x+17, 140, 4, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#946b53'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, 158, 15, .2, Math.PI-.2); ctx.stroke();
      ctx.fillStyle = '#c58562'; ctx.beginPath(); ctx.moveTo(x-40, 206); ctx.quadraticCurveTo(x-145, 225, x-145, SH); ctx.lineTo(x+145, SH); ctx.quadraticCurveTo(x+145, 225, x+40, 206); ctx.closePath(); ctx.fill();
      return;
    }
    if (!video || video.readyState < 2) { ctx.fillStyle = '#111917'; ctx.fillRect(0, 0, SW, SH); return; }
    const scale = Math.max(SW / video.videoWidth, SH / video.videoHeight);
    const w = video.videoWidth * scale, h = video.videoHeight * scale;
    ctx.save(); ctx.translate(SW, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, (SW-w)/2, (SH-h)/2, w, h); ctx.restore();
  }

  capture(demo: boolean) {
    if (demo) this.demoRoom(this.backgroundContext);
    else this.backgroundContext.drawImage(this.source, 0, 0);
    this.hasBackground = true;
  }

  clear() { this.hasBackground = false; this.backgroundContext.clearRect(0, 0, SW, SH); }

  render(ctx: CanvasRenderingContext2D, settings: Settings, time: number) {
    const { mode, radius, x, y, amount } = settings;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    if (mode === 'headless') {
      ctx.drawImage(this.source, 0, 0, WIDTH, HEIGHT);
      const cx = x * WIDTH, cy = y * HEIGHT, r = radius * HEIGHT;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      if (this.hasBackground) ctx.drawImage(this.background, 0, 0, WIDTH, HEIGHT);
      else { ctx.fillStyle = '#142d27'; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
      ctx.restore(); ctx.strokeStyle = '#dddbc0'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    } else if (mode === 'sphere') {
      ctx.fillStyle = '#101715'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      const source = this.sourceContext.getImageData(0, 0, SW, SH).data;
      const out = this.orbPixels.data;
      for (let i = 0; i < this.lookup.length; i++) {
        const from = this.lookup[i], to = i * 4;
        if (from < 0) { out[to+3] = 0; continue; }
        out[to] = source[from]; out[to+1] = source[from+1]; out[to+2] = source[from+2]; out[to+3] = 255;
      }
      this.orbContext.putImageData(this.orbPixels, 0, 0);
      const r = radius * HEIGHT * 1.8;
      ctx.drawImage(this.orb, WIDTH/2-r, HEIGHT/2-r, r*2, r*2);
      const glow = ctx.createRadialGradient(WIDTH/2-r*.3, HEIGHT/2-r*.4, r*.1, WIDTH/2, HEIGHT/2, r);
      glow.addColorStop(0, '#ffffff18'); glow.addColorStop(.75, '#ffffff00'); glow.addColorStop(1, '#ffffff60');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(WIDTH/2, HEIGHT/2, r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#e1eee588'; ctx.lineWidth = 2; ctx.stroke();
    } else {
      const angle = Math.sin(time / 2200) * amount;
      ctx.save(); ctx.translate(WIDTH/2, HEIGHT/2); ctx.rotate(angle);
      const cover = Math.max(1.6, Math.abs(Math.cos(angle)) + WIDTH/HEIGHT * Math.abs(Math.sin(angle)) + .05);
      ctx.scale(cover, cover);
      ctx.drawImage(this.source, -WIDTH/2, -HEIGHT/2, WIDTH, HEIGHT); ctx.restore();
      const r = radius * HEIGHT;
      ctx.save(); ctx.beginPath(); ctx.arc(WIDTH/2, HEIGHT/2, r, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(this.source, 0, 0, WIDTH, HEIGHT); ctx.restore();
      ctx.strokeStyle = '#e3ddbf'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(WIDTH/2, HEIGHT/2, r, 0, Math.PI*2); ctx.stroke();
      ctx.save(); ctx.translate(WIDTH/2, HEIGHT/2); ctx.rotate(angle);
      ctx.strokeStyle = '#e3ddbf99'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, r*1.75, r*1.15, .6, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, r*2.3, r*1.6, -.6, 0, Math.PI*2); ctx.stroke(); ctx.restore();
    }
  }
}
