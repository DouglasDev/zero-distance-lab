import type { Position } from '../../rendering/types.ts';

/** Scale toward the face center, leaving a band of the original face visible. */
export function insetOutline(points: readonly Position[], coverage: number): Position[] {
  const center = points.reduce(
    (sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }),
    { x: 0, y: 0 },
  );
  const scale = Math.max(0.55, Math.min(0.95, coverage));
  return points.map((point) => ({
    x: center.x + (point.x - center.x) * scale,
    y: center.y + (point.y - center.y) * scale,
  }));
}

function insideDistance(x: number, y: number, points: readonly Position[]) {
  let inside = false,
    distanceSquared = Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j],
      b = points[i];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const t = Math.max(
      0,
      Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)),
    );
    distanceSquared = Math.min(distanceSquared, (x - a.x - t * dx) ** 2 + (y - a.y - t * dy) ** 2);
  }
  return inside ? Math.sqrt(distanceSquared) : 0;
}

/** Feather inward only: alpha stays zero throughout the visible outer face band. */
export function fillFaceMask(
  image: ImageData,
  points: readonly Position[],
  coverage: number,
  feather: number,
) {
  image.data.fill(0);
  if (points.length < 3 || points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    return;
  const contour = insetOutline(points, coverage);
  const xs = contour.map((p) => p.x),
    ys = contour.map((p) => p.y);
  const left = Math.max(0, Math.floor(Math.min(...xs))),
    right = Math.min(image.width - 1, Math.ceil(Math.max(...xs)));
  const top = Math.max(0, Math.floor(Math.min(...ys))),
    bottom = Math.min(image.height - 1, Math.ceil(Math.max(...ys)));
  const width = Math.max(...xs) - Math.min(...xs),
    height = Math.max(...ys) - Math.min(...ys);
  const fade = Math.max(0.5, Math.min(width, height) * Math.max(0, Math.min(0.25, feather)));
  for (let y = top; y <= bottom; y++)
    for (let x = left; x <= right; x++) {
      const t = Math.min(1, insideDistance(x + 0.5, y + 0.5, contour) / fade);
      const offset = (y * image.width + x) * 4;
      image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = 255;
      image.data[offset + 3] = Math.round(t * t * (3 - 2 * t) * 255);
    }
}
