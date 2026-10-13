import type { Position } from '../../rendering/types.ts';
import type { BodyFrame } from './bodyMessages.ts';
import { createSurface } from '../../rendering/canvas.ts';
const groups = [
  [33, 160, 158, 133, 153, 144],
  [362, 385, 387, 263, 373, 380],
  [168, 6, 197, 195, 5, 4, 1, 2, 98, 327],
  [61, 40, 37, 0, 267, 270, 291, 321, 314, 17, 84, 91],
];
export function demoLandmarks(time: number): Position[] {
  const x = 320 + Math.sin(time / 1600) * 30;
  const points = Array.from({ length: 478 }, () => ({ x, y: 145 }));
  const bounds = [
    { x: x - 17, y: 140, w: 7, h: 7 },
    { x: x + 17, y: 140, w: 7, h: 7 },
    { x, y: 151, w: 5, h: 10 },
    { x, y: 168, w: 18, h: 9 },
  ];
  groups.forEach((indices, g) =>
    indices.forEach((index, i) => {
      const b = bounds[g],
        angle = (i / indices.length) * Math.PI * 2;
      points[index] = { x: b.x + Math.cos(angle) * b.w, y: b.y + Math.sin(angle) * b.h };
    }),
  );
  return points;
}
export function demoBody(time: number): BodyFrame {
  const x = 320 + Math.sin(time / 1600) * 30;
  const surface = createSurface(160, 90, true),
    ctx = surface.context;
  ctx.scale(0.25, 0.25);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x, 142, 47, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 40, 206);
  ctx.quadraticCurveTo(x - 145, 225, x - 145, 360);
  ctx.lineTo(x + 145, 360);
  ctx.quadraticCurveTo(x + 145, 225, x + 40, 206);
  ctx.closePath();
  ctx.fill();
  const rgba = ctx.getImageData(0, 0, 160, 90).data,
    mask = new Uint8Array(160 * 90);
  for (let i = 0; i < mask.length; i++) mask[i] = rgba[i * 4 + 3];
  const pose = Array.from({ length: 33 }, () => ({ x, y: 145, visibility: 0 }));
  const set = (i: number, px: number, py: number) => (pose[i] = { x: px, y: py, visibility: 1 });
  set(0, x, 145);
  set(11, x - 70, 230);
  set(12, x + 70, 230);
  const swing = Math.sin(time / 800) * 35;
  set(13, x - 110, 280 - swing);
  set(15, x - 135, 340 - swing);
  set(14, x + 110, 280 + swing);
  set(16, x + 135, 340 + swing);
  return { pose, mask, width: 160, height: 90, timestamp: time };
}
