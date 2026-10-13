import { createSurface } from '../../rendering/canvas.ts';
import { drawDemoRoom } from '../../rendering/demo.ts';
import type { Effect, Settings, SourceFrame, Position } from '../../rendering/types.ts';
import type { BodyFrame } from './bodyMessages.ts';
import { demoLandmarks, demoBody } from './demoTracking.ts';
import { FeatureTexture } from './FeatureTexture.ts';
import { drawFaceProjection } from './FaceProjection.ts';
import { BodyProjection } from './BodyProjection.ts';
import { drawDeity } from './DeityProjection.ts';
export class AwarenessEffect implements Effect {
  private background = createSurface(640, 360);
  private features = new FeatureTexture();
  private bodyProjection = new BodyProjection();
  private landmarks: Position[] | null = null;
  private body: BodyFrame | null = null;
  hasBackground = false;
  setTracking(landmarks: Position[] | null, body: BodyFrame | null) {
    this.landmarks = landmarks;
    this.body = body;
  }
  capture(source: SourceFrame, demo: boolean) {
    if (demo) drawDemoRoom(this.background.context);
    else this.background.context.drawImage(source.canvas, 0, 0);
    this.hasBackground = true;
  }
  clear() {
    this.hasBackground = false;
    this.background.context.clearRect(0, 0, 640, 360);
    this.setTracking(null, null);
  }
  render(ctx: CanvasRenderingContext2D, source: SourceFrame, settings: Settings, time: number) {
    if (settings.demo && !this.hasBackground) drawDemoRoom(this.background.context);
    if (this.hasBackground || settings.demo) ctx.drawImage(this.background.canvas, 0, 0, 960, 540);
    else {
      ctx.fillStyle = '#17252d';
      ctx.fillRect(0, 0, 960, 540);
    }
    const landmarks = settings.demo ? demoLandmarks(time) : this.landmarks;
    const needsBody =
      settings.projectionVariant === 'body' || settings.projectionVariant === 'deity';
    const body = settings.demo && needsBody ? demoBody(time) : this.body;
    this.features.update(source, landmarks, settings.projectionVariant === 'eyes');
    ctx.save();
    ctx.globalAlpha = settings.projectionOpacity;
    ctx.globalCompositeOperation = settings.projectionBlend;
    if (settings.projectionVariant === 'body') {
      this.bodyProjection.update(source, body);
      this.bodyProjection.draw(ctx, body, settings);
    } else if (settings.projectionVariant === 'deity')
      drawDeity(ctx, this.features, body, settings, time);
    else if (this.features.ready) drawFaceProjection(ctx, this.features, settings);
    ctx.restore();
  }
}
