import type { BodyFrame, BodyPoint } from './bodyMessages.ts';
import type { FeatureTexture } from './FeatureTexture.ts';
import type { Settings, Position } from '../../rendering/types.ts';
const visible = (point: BodyPoint | undefined) => Boolean(point && point.visibility > 0.5);
function limb(ctx: CanvasRenderingContext2D, a: Position, b: Position, c: Position, width: number) {
  ctx.strokeStyle = '#d7ac60';
  ctx.lineWidth = width + 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.stroke();
  ctx.strokeStyle = '#274db0';
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.fillStyle = '#e3ba75';
  ctx.beginPath();
  ctx.arc(c.x, c.y, width * 0.65, 0, Math.PI * 2);
  ctx.fill();
}
function direction(pose: BodyPoint[], a: number, b: number, fallback: number) {
  return visible(pose[a]) && visible(pose[b])
    ? Math.atan2(pose[b].y - pose[a].y, pose[b].x - pose[a].x)
    : fallback;
}
/** An original, symbolic wrathful figure: six arms follow the user's two arm chains. */
export function drawDeity(
  ctx: CanvasRenderingContext2D,
  features: FeatureTexture,
  body: BodyFrame | null,
  settings: Settings,
  time: number,
) {
  const pose = body?.pose ?? [];
  const shoulder =
    visible(pose[11]) && visible(pose[12])
      ? { x: (pose[11].x + pose[12].x) / 2, y: (pose[11].y + pose[12].y) / 2 }
      : null;
  const visualLeft = visible(pose[11]) && visible(pose[12]) && pose[11].x > pose[12].x ? 12 : 11;
  const leftHip = visible(pose[23]) && visible(pose[24]) && pose[23].x > pose[24].x ? 24 : 23;
  const span = shoulder ? Math.max(40, Math.abs(pose[12].x - pose[11].x)) : 140;
  const lean =
    shoulder && visible(pose[0])
      ? Math.max(-0.35, Math.min(0.35, (pose[0].x - shoulder.x) / span))
      : 0;
  ctx.save();
  ctx.translate(480, 290);
  ctx.scale(settings.projectionSize, settings.projectionSize);
  // Flame aureole, with animation controlled by the shared motion clock.
  ctx.fillStyle = '#b84624';
  ctx.strokeStyle = '#ecb45a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 96; i++) {
    const angle = (i / 96) * Math.PI * 2,
      r = i % 2 ? 236 : 210 + Math.sin(time / 650 + i) * 8;
    const x = Math.cos(angle) * r,
      y = Math.sin(angle) * r * 1.02;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111a34';
  ctx.beginPath();
  ctx.ellipse(0, 0, 180, 215, 0, 0, Math.PI * 2);
  ctx.fill();
  // Legs respond when knees/ankles are actually visible; otherwise use a grounded stance.
  for (const side of [-1, 1]) {
    const hip = { x: side * 45, y: 85 };
    const index = side < 0 ? leftHip : 47 - leftHip;
    const a = direction(pose, index, index + 2, side < 0 ? 2.1 : 1.04);
    const b = direction(pose, index + 2, index + 4, side < 0 ? 1 : 2.1);
    const knee = { x: hip.x + Math.cos(a) * 72, y: hip.y + Math.sin(a) * 72 };
    limb(ctx, hip, knee, { x: knee.x + Math.cos(b) * 65, y: knee.y + Math.sin(b) * 65 }, 27);
  }
  for (let layer = 2; layer >= 0; layer--)
    for (const side of [-1, 1]) {
      const shoulderPoint = { x: side * 65, y: -45 };
      const index = side < 0 ? visualLeft : 23 - visualLeft;
      const a = direction(pose, index, index + 2, side < 0 ? 2.7 : 0.44) + side * layer * 0.55;
      const b = direction(pose, index + 2, index + 4, side < 0 ? 2.1 : 1.04) + side * layer * 0.55;
      const elbow = {
        x: shoulderPoint.x + Math.cos(a) * 85,
        y: shoulderPoint.y + Math.sin(a) * 85,
      };
      limb(
        ctx,
        shoulderPoint,
        elbow,
        { x: elbow.x + Math.cos(b) * 75, y: elbow.y + Math.sin(b) * 75 },
        19 - layer * 2,
      );
    }
  ctx.save();
  ctx.rotate(lean * 0.25);
  ctx.fillStyle = '#2347a3';
  ctx.strokeStyle = '#d7ac60';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-67, -66);
  ctx.quadraticCurveTo(-75, 55, -45, 100);
  ctx.lineTo(45, 100);
  ctx.quadraticCurveTo(75, 55, 67, -66);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#a92b2f';
  ctx.fillRect(-47, 82, 94, 25);
  ctx.strokeStyle = '#e8bf73';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, -20, 38, 0, Math.PI);
  ctx.stroke();
  const hx = lean * 65,
    hy = -127;
  ctx.fillStyle = '#315cc0';
  ctx.beginPath();
  ctx.ellipse(hx, hy, 51, 65, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Crown, third eye, fangs, and living facial features.
  ctx.fillStyle = '#e7bd6c';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(hx + i * 21 - 12, hy - 52);
    ctx.lineTo(hx + i * 21, hy - 93 - Math.abs(i) * 2);
    ctx.lineTo(hx + i * 21 + 12, hy - 52);
    ctx.fill();
  }
  ctx.fillStyle = '#fff0bb';
  ctx.beginPath();
  ctx.ellipse(hx, hy - 35, 6, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  features.drawFace(ctx, hx, hy, 105, 120);
  ctx.strokeStyle = '#751e26';
  ctx.lineWidth = 5;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + side * 32, hy - 28);
    ctx.lineTo(hx + side * 9, hy - 17);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff0bb';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + side * 18, hy + 28);
    ctx.lineTo(hx + side * 13, hy + 45);
    ctx.lineTo(hx + side * 8, hy + 28);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}
