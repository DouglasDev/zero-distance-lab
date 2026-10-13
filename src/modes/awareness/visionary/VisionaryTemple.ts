import type { Settings, Position, SourceFrame } from '../../../rendering/types.ts';
import type { FeatureTexture } from '../FeatureTexture.ts';
import { MeshRenderer } from './MeshRenderer.ts';
import { LivingTexture } from './LivingTexture.ts';
import { chamberSurfaces, sculptedFace, type Mesh } from './mesh.ts';
export class VisionaryTemple {
  private renderer = new MeshRenderer();
  private texture = new LivingTexture();
  private walls = chamberSurfaces();
  private faces: Mesh[] = [];
  constructor() {
    for (let depth = 0; depth < 3; depth++)
      for (const side of [-1, 1]) {
        this.faces.push(
          sculptedFace(
            side * (3.15 + depth * 0.8),
            0.25,
            7 + depth * 5,
            2.5,
            3.7,
            side * 0.5,
            8,
            depth * 30,
          ),
        );
        this.faces.push(
          sculptedFace(side * 1.9, 3.1, 10 + depth * 5, 1.3, 1.8, side * 0.3, 6, depth * 40),
        );
      }
  }
  dispose() {
    this.renderer.dispose();
  }

  render(
    ctx: CanvasRenderingContext2D,
    source: SourceFrame,
    landmarks: Position[] | null,
    features: FeatureTexture,
    settings: Settings,
    time: number,
    bodyTexture?: HTMLCanvasElement,
  ) {
    const kind =
      settings.projectionVariant === 'eyes'
        ? 'eyes'
        : settings.projectionVariant === 'body'
          ? 'body'
          : 'face';
    this.texture.update(source, landmarks, features, kind, settings.projectionOpacity, bodyTexture);
    const drift = settings.motion ? Math.sin(time / 6500) * 0.12 : 0;
    const nose = landmarks?.[1];
    const camera = {
      x: (nose ? Math.max(-0.25, Math.min(0.25, (nose.x - 320) / 200)) : 0) + drift,
      y: Math.cos(time / 8500) * 0.04,
      z: -1,
      focal: 680 * settings.projectionSize,
    };
    ctx.fillStyle = '#0d071b';
    ctx.fillRect(0, 0, 960, 540);
    const meshes = [...this.walls, ...this.faces];
    if (settings.projectionVariant === 'face')
      meshes.push(sculptedFace(0, 0.05, 5, 2.6, 3.65, drift, 16, 5));
    this.renderer.draw(ctx, meshes, this.texture.surface.canvas, camera);
    // Receding rings articulate the continuous architecture, rather than a flat kaleidoscope.
    for (const z of [25, 20, 15, 10, 5]) {
      ctx.strokeStyle = `rgba(247,190,122,${0.26 + 1 / z})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const a = (i / 80) * Math.PI * 2;
        const x = 480 + ((Math.cos(a) * 4.25 - camera.x) * camera.focal) / (z + 1),
          y = 270 - ((Math.sin(a) * 3.58 - camera.y) * camera.focal) / (z + 1);
        if (!i) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const vignette = ctx.createRadialGradient(480, 240, 120, 480, 270, 590);
    vignette.addColorStop(0, '#00000000');
    vignette.addColorStop(1, '#080318a0');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 960, 540);
  }
}
