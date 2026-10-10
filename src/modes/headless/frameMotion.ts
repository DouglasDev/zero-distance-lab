import type { Position } from '../../rendering/types.ts';
import { SOURCE_WIDTH, SOURCE_HEIGHT } from '../../rendering/types.ts';

export interface GrayFrame {
  width: number;
  height: number;
  pixels: Uint8Array;
}
export interface MotionEstimate {
  x: number;
  y: number;
  confidence: number;
}
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

function inside(point: Position, polygon: readonly Position[]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      result = !result;
  }
  return result;
}

function half(frame: GrayFrame): GrayFrame {
  const width = Math.floor(frame.width / 2),
    height = Math.floor(frame.height / 2);
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * 2 * frame.width + x * 2;
      pixels[y * width + x] =
        (frame.pixels[i] +
          frame.pixels[i + 1] +
          frame.pixels[i + frame.width] +
          frame.pixels[i + frame.width + 1]) /
        4;
    }
  return { width, height, pixels };
}

function seeds(frame: GrayFrame, outline: readonly Position[]) {
  const polygon = outline.map((p) => ({
    x: (p.x * frame.width) / SOURCE_WIDTH,
    y: (p.y * frame.height) / SOURCE_HEIGHT,
  }));
  const left = Math.max(4, Math.min(...polygon.map((p) => p.x))),
    right = Math.min(frame.width - 5, Math.max(...polygon.map((p) => p.x)));
  const top = Math.max(4, Math.min(...polygon.map((p) => p.y))),
    bottom = Math.min(frame.height - 5, Math.max(...polygon.map((p) => p.y)));
  const points: Position[] = [];
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 5; col++) {
      let best = 120,
        candidate: Position | null = null;
      for (
        let y = Math.ceil(top + ((bottom - top) * row) / 4);
        y < top + ((bottom - top) * (row + 1)) / 4;
        y++
      ) {
        for (
          let x = Math.ceil(left + ((right - left) * col) / 5);
          x < left + ((right - left) * (col + 1)) / 5;
          x++
        ) {
          if (!inside({ x, y }, polygon)) continue;
          const i = y * frame.width + x;
          const gx = frame.pixels[i + 1] - frame.pixels[i - 1],
            gy = frame.pixels[i + frame.width] - frame.pixels[i - frame.width];
          const score = gx * gx + gy * gy;
          if (score > best) {
            best = score;
            candidate = { x, y };
          }
        }
      }
      if (candidate) points.push(candidate);
    }
  return points;
}

function match(
  previous: GrayFrame,
  current: GrayFrame,
  point: Position,
  center: Position,
  search: number,
  radius: number,
) {
  let error = Infinity,
    best = { x: center.x, y: center.y };
  const px = Math.round(point.x),
    py = Math.round(point.y);
  if (px < radius || py < radius || px >= previous.width - radius || py >= previous.height - radius)
    return { ...best, error };
  for (let dy = center.y - search; dy <= center.y + search; dy++)
    for (let dx = center.x - search; dx <= center.x + search; dx++) {
      const cx = px + dx,
        cy = py + dy;
      if (
        cx < radius ||
        cy < radius ||
        cx >= current.width - radius ||
        cy >= current.height - radius
      )
        continue;
      let cost = 0;
      for (let y = -radius; y <= radius; y++)
        for (let x = -radius; x <= radius; x++) {
          cost += Math.abs(
            previous.pixels[(py + y) * previous.width + px + x] -
              current.pixels[(cy + y) * current.width + cx + x],
          );
        }
      if (cost < error) {
        error = cost;
        best = { x: dx, y: dy };
      }
    }
  return { ...best, error: error / (radius * 2 + 1) ** 2 };
}

/** Sparse two-level patch tracking on the original face, never on the erased output. */
export function estimateFrameMotion(
  previous: GrayFrame,
  current: GrayFrame,
  outline: readonly Position[],
): MotionEstimate {
  if (outline.length < 3 || previous.width !== current.width || previous.height !== current.height)
    return { x: 0, y: 0, confidence: 0 };
  const points = seeds(previous, outline),
    smallPrevious = half(previous),
    smallCurrent = half(current);
  const matches: Position[] = [];
  for (const point of points) {
    const coarse = match(
      smallPrevious,
      smallCurrent,
      { x: point.x / 2, y: point.y / 2 },
      { x: 0, y: 0 },
      8,
      2,
    );
    const fine = match(previous, current, point, { x: coarse.x * 2, y: coarse.y * 2 }, 2, 2);
    if (fine.error > 24) continue;
    const reverse = match(
      current,
      previous,
      { x: point.x + fine.x, y: point.y + fine.y },
      { x: -fine.x, y: -fine.y },
      1,
      2,
    );
    if (Math.hypot(reverse.x + fine.x, reverse.y + fine.y) > 1 || reverse.error > 24) continue;
    matches.push(fine);
  }
  if (matches.length < 4) return { x: 0, y: 0, confidence: 0 };
  const mx = median(matches.map((p) => p.x)),
    my = median(matches.map((p) => p.y));
  const inliers = matches.filter((p) => Math.hypot(p.x - mx, p.y - my) <= 1.5);
  const confidence = inliers.length / Math.max(1, points.length);
  if (inliers.length < 4 || confidence < 0.5) return { x: 0, y: 0, confidence: 0 };
  return {
    x: (median(inliers.map((p) => p.x)) * SOURCE_WIDTH) / current.width,
    y: (median(inliers.map((p) => p.y)) * SOURCE_HEIGHT) / current.height,
    confidence,
  };
}
