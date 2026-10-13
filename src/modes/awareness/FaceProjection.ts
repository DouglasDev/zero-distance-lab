import type { FeatureTexture } from './FeatureTexture.ts';
import type { Settings } from '../../rendering/types.ts';
export function drawFaceProjection(
  ctx: CanvasRenderingContext2D,
  features: FeatureTexture,
  settings: Settings,
) {
  const size = settings.projectionSize;
  if (settings.projectionVariant === 'face')
    features.drawFace(ctx, 480, 250, 650 * size, 470 * size);
  else if (settings.projectionVariant === 'faces') {
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 4; col++)
        features.drawFace(ctx, 120 + col * 240, 85 + row * 180, 195 * size, 155 * size);
  } else {
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 6; col++) {
        const x = 80 + col * 160 + (row % 2 ? 28 : 0),
          y = 65 + row * 135;
        ctx.drawImage(
          features.patches[(row + col) % 2].canvas,
          x - 62 * size,
          y - 34 * size,
          124 * size,
          68 * size,
        );
      }
  }
}
