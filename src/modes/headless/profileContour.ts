import type { Position } from '../../rendering/types.ts';

import { convexHull } from './outlineGeometry.ts';

/** Keep frontal shape unchanged, but cover the bridge, nose and lips as they turn toward the silhouette. */
export function profileContour(
  oval: Position[],
  features: Position[],
  nose: Position | undefined,
): Position[] {
  if (!nose || features.length === 0) return oval;
  // Forehead and chin define the face's vertical axis, even with a tilted head.
  const forehead = oval[0],
    chin = oval[18];
  const dx = chin.x - forehead.x,
    dy = chin.y - forehead.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return oval;
  const horizontal = { x: dy / length, y: -dx / length };
  const projection = (p: Position) => p.x * horizontal.x + p.y * horizontal.y;
  const coordinates = oval.map(projection);
  const left = Math.min(...coordinates),
    right = Math.max(...coordinates);
  const width = right - left;
  if (width < 1) return oval;
  const turn = Math.abs(projection(nose) - (left + right) / 2) / (width / 2);
  const strength = Math.max(0, Math.min(1, (turn - 0.45) / 0.4));
  if (strength === 0) return oval;
  // Cushion the features so inset + inward feathering do not leave the nose tip visible.
  // The cushion scales with the measured silhouette; the back of the face stays on the oval.
  const padding = Math.min(width, length) * 0.2 * strength;
  const paddedFeatures = features.flatMap((p) =>
    Array.from({ length: 12 }, (_, i) => ({
      x: p.x + Math.cos((i / 12) * Math.PI * 2) * padding,
      y: p.y + Math.sin((i / 12) * Math.PI * 2) * padding,
    })),
  );
  return convexHull([...oval, ...paddedFeatures]);
}
