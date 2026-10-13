import { createSurface } from '../../../rendering/canvas.ts';
import type { SourceFrame, Position } from '../../../rendering/types.ts';
import { FACE_OVAL } from '../../headless/faceOutline.ts';
import type { FeatureTexture } from '../FeatureTexture.ts';
/** Ornament and the live person share a single material, rather than separate screen-space stickers. */
export class LivingTexture {
  readonly surface = createSurface(384, 480);
  private ornament = createSurface(384, 480);
  private portrait = createSurface(256, 320);
  constructor() {
    this.paintOrnament();
  }
  private paintOrnament() {
    const ctx = this.ornament.context;
    const gradient = ctx.createLinearGradient(0, 0, 384, 480);
    gradient.addColorStop(0, '#ab242f');
    gradient.addColorStop(0.5, '#42163c');
    gradient.addColorStop(1, '#db6330');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 384, 480);
    for (let row = 0; row < 10; row++)
      for (let col = 0; col < 8; col++) {
        const x = col * 51 + (row % 2 ? 24 : 0),
          y = row * 52;
        ctx.strokeStyle = '#f6ad67';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let k = 0; k < 36; k++) {
          const a = (k / 35) * Math.PI * 3,
            r = 4 + k * 0.4;
          const px = x + Math.cos(a) * r,
            py = y + Math.sin(a) * r;
          if (!k) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.fillStyle = '#173ea4';
        ctx.beginPath();
        ctx.ellipse(x, y, 12, 17, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#72c9e2';
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 1.7);
        ctx.stroke();
        ctx.fillStyle = '#ddcc99';
        ctx.beginPath();
        ctx.ellipse(x + 21, y + 22, 4, 10, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#177c65';
        ctx.beginPath();
        ctx.ellipse(x + 21, y + 22, 2, 6, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  update(
    source: SourceFrame,
    landmarks: Position[] | null,
    features: FeatureTexture,
    kind: 'face' | 'eyes' | 'body',
    opacity: number,
    bodyTexture?: HTMLCanvasElement,
  ) {
    const ctx = this.surface.context;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(this.ornament.canvas, 0, 0);
    if (kind === 'body' && bodyTexture) {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(bodyTexture, 0, 0, 384, 480);
      ctx.restore();
      return;
    }
    if (!landmarks || !features.ready) return;
    if (kind === 'eyes') {
      ctx.save();
      ctx.globalAlpha = opacity;
      for (let y = 28; y < 480; y += 72)
        for (let x = 24; x < 384; x += 75)
          ctx.drawImage(
            features.patches[(Math.round(x / 75) + Math.round(y / 72)) % 2].canvas,
            x - 28,
            y - 14,
            56,
            28,
          );
      ctx.restore();
      return;
    }
    const oval = FACE_OVAL.map((i) => landmarks[i]).filter(Boolean);
    const left = Math.min(...oval.map((p) => p.x)),
      right = Math.max(...oval.map((p) => p.x)),
      top = Math.min(...oval.map((p) => p.y)),
      bottom = Math.max(...oval.map((p) => p.y));
    if (right - left < 8 || bottom - top < 8) return;
    const p = this.portrait.context;
    p.clearRect(0, 0, 256, 320);
    p.drawImage(source.canvas, left, top, right - left, bottom - top, 0, 0, 256, 320);
    p.save();
    p.globalCompositeOperation = 'destination-in';
    p.translate(128, 160);
    p.scale(1, 1.25);
    const fade = p.createRadialGradient(0, 0, 35, 0, 0, 128);
    fade.addColorStop(0, '#fff');
    fade.addColorStop(0.68, '#ffffffee');
    fade.addColorStop(1, '#ffffff00');
    p.fillStyle = fade;
    p.fillRect(-128, -128, 256, 256);
    p.restore();
    p.save();
    p.globalCompositeOperation = 'source-atop';
    p.globalAlpha = 0.38;
    const pigment = p.createLinearGradient(0, 0, 256, 320);
    pigment.addColorStop(0, '#c82343');
    pigment.addColorStop(0.55, '#943560');
    pigment.addColorStop(1, '#dc632e');
    p.fillStyle = pigment;
    p.fillRect(0, 0, 256, 320);
    p.restore();
    ctx.save();
    ctx.globalAlpha = opacity * 0.96;
    ctx.drawImage(this.portrait.canvas, 0, 0, 384, 480);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.22;
    ctx.drawImage(this.ornament.canvas, 0, 0);
    ctx.restore();
  }
}
