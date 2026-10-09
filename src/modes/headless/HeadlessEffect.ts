import { createSurface } from '../../rendering/canvas.ts';
import { drawDemoRoom } from '../../rendering/demo.ts';
import { demoFaceOutline } from './faceOutline.ts';
import { fillFaceMask } from './faceMask.ts';
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

// A half-resolution alpha mask keeps close-up faces inexpensive; display interpolation smooths it.
const MASK_SCALE = 2;

export class HeadlessEffect implements Effect {
  private background = createSurface(SOURCE_WIDTH, SOURCE_HEIGHT);
  private mask = createSurface(SOURCE_WIDTH / MASK_SCALE, SOURCE_HEIGHT / MASK_SCALE);
  private overlay = createSurface(SOURCE_WIDTH, SOURCE_HEIGHT);
  private maskPixels = this.mask.context.createImageData(
    SOURCE_WIDTH / MASK_SCALE,
    SOURCE_HEIGHT / MASK_SCALE,
  );
  private contour: Position[] | null = null;
  private lastFace: Position[] | null = null;
  private lastCoverage = -1;
  private lastFeather = -1;
  hasBackground = false;

  setFace(contour: Position[] | null) {
    this.contour = contour;
  }

  capture(source: SourceFrame, demo: boolean) {
    if (demo) drawDemoRoom(this.background.context);
    else this.background.context.drawImage(source.canvas, 0, 0);
    this.hasBackground = true;
  }

  clear() {
    this.hasBackground = false;
    this.background.context.clearRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);
  }

  render(ctx: CanvasRenderingContext2D, source: SourceFrame, settings: Settings, time: number) {
    ctx.drawImage(source.canvas, 0, 0, WIDTH, HEIGHT);
    const face = settings.demo ? demoFaceOutline(time) : this.contour;
    if (!face) return;
    if (
      face !== this.lastFace ||
      settings.faceCoverage !== this.lastCoverage ||
      settings.faceFeather !== this.lastFeather
    ) {
      fillFaceMask(
        this.maskPixels,
        face.map((point) => ({ x: point.x / MASK_SCALE, y: point.y / MASK_SCALE })),
        settings.faceCoverage,
        settings.faceFeather,
      );
      this.mask.context.putImageData(this.maskPixels, 0, 0);
      this.lastFace = face;
      this.lastCoverage = settings.faceCoverage;
      this.lastFeather = settings.faceFeather;
    }
    const overlay = this.overlay.context;
    overlay.clearRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);
    if (this.hasBackground) overlay.drawImage(this.background.canvas, 0, 0);
    else {
      overlay.fillStyle = '#142d27';
      overlay.fillRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);
    }
    overlay.save();
    overlay.globalCompositeOperation = 'destination-in';
    overlay.drawImage(this.mask.canvas, 0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);
    overlay.restore();
    ctx.drawImage(this.overlay.canvas, 0, 0, WIDTH, HEIGHT);
  }
}
