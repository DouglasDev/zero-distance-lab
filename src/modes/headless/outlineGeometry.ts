import type { Position } from '../../rendering/types.ts';

function cross(a: Position, b: Position, c: Position) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** Projected silhouette of the facial oval and protruding facial features. */
export function convexHull(points: readonly Position[]): Position[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const lower: Position[] = [],
    upper: Position[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0)
      lower.pop();
    lower.push(point);
  }
  for (const point of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0)
      upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Expand in both directions, retaining coverage when a prediction overshoots or reverses. */
export function expandOutline(points: Position[], padding: Position): Position[] {
  if (padding.x <= 0 && padding.y <= 0) return points;
  return convexHull(
    points.flatMap((point) =>
      Array.from({ length: 8 }, (_, i) => ({
        x: point.x + Math.cos((i * Math.PI) / 4) * padding.x,
        y: point.y + Math.sin((i * Math.PI) / 4) * padding.y,
      })),
    ),
  );
}
