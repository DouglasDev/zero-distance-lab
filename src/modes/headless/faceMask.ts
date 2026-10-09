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
  const edges = contour.map((a, index) => {
    const b = contour[(index + 1) % contour.length];
    const dx = b.x - a.x,
      dy = b.y - a.y;
    return {
      a,
      b,
      dx,
      dy,
      inverseLength: 1 / (dx * dx + dy * dy || 1),
      left: Math.min(a.x, b.x) - fade,
      right: Math.max(a.x, b.x) + fade,
      top: Math.min(a.y, b.y) - fade,
      bottom: Math.max(a.y, b.y) + fade,
    };
  });
  for (let y = top; y <= bottom; y++) {
    const py = y + 0.5;
    const intersections: number[] = [];
    for (const { a, b, dx, dy } of edges) {
      if (a.y > py !== b.y > py) intersections.push(a.x + (dx * (py - a.y)) / dy);
    }
    intersections.sort((a, b) => a - b);
    const nearEdges = edges.filter((edge) => py >= edge.top && py <= edge.bottom);
    for (let span = 0; span + 1 < intersections.length; span += 2) {
      const from = Math.max(left, Math.ceil(intersections[span] - 0.5));
      const to = Math.min(right, Math.ceil(intersections[span + 1] - 0.5) - 1);
      for (let x = from; x <= to; x++) {
        const px = x + 0.5;
        let distanceSquared = fade * fade;
        for (const edge of nearEdges) {
          if (px < edge.left || px > edge.right) continue;
          const t = Math.max(
            0,
            Math.min(
              1,
              ((px - edge.a.x) * edge.dx + (py - edge.a.y) * edge.dy) * edge.inverseLength,
            ),
          );
          const ex = px - edge.a.x - t * edge.dx,
            ey = py - edge.a.y - t * edge.dy;
          distanceSquared = Math.min(distanceSquared, ex * ex + ey * ey);
        }
        const t = Math.sqrt(distanceSquared) / fade;
        const offset = (y * image.width + x) * 4;
        image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = 255;
        image.data[offset + 3] = Math.round(t * t * (3 - 2 * t) * 255);
      }
    }
  }
}
