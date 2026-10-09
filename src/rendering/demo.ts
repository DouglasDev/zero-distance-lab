import { SOURCE_WIDTH as SW, SOURCE_HEIGHT as SH } from './types.ts';

export function drawDemoRoom(context: CanvasRenderingContext2D) {
  context.fillStyle = '#354744';
  context.fillRect(0, 0, SW, SH);
  context.fillStyle = '#719085';
  context.fillRect(0, 0, SW, 255);
  context.fillStyle = '#c4c7a8';
  context.fillRect(55, 40, 135, 145);
  context.fillStyle = '#517975';
  context.fillRect(64, 49, 117, 127);
  context.fillStyle = '#c4c7a8';
  context.fillRect(120, 45, 5, 135);
  context.fillRect(60, 110, 125, 5);
  context.fillStyle = '#d9b17d';
  context.fillRect(455, 75, 100, 100);
  context.fillStyle = '#5c7261';
  context.fillRect(465, 85, 80, 80);
  context.fillStyle = '#233632';
  context.fillRect(415, 237, 165, 8);
  context.fillStyle = '#a39371';
  context.fillRect(465, 207, 35, 30);
  context.fillStyle = '#365e42';
  context.beginPath();
  context.ellipse(480, 188, 22, 34, 0.4, 0, Math.PI * 2);
  context.fill();
}

export function drawDemoFrame(ctx: CanvasRenderingContext2D, time: number) {
  drawDemoRoom(ctx);
  const x = SW / 2 + Math.sin(time / 1600) * 30;
  ctx.fillStyle = '#d4b28a';
  ctx.beginPath();
  ctx.ellipse(x, 142, 47, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#263734';
  ctx.beginPath();
  ctx.ellipse(x, 99, 49, 29, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#233632';
  ctx.beginPath();
  ctx.ellipse(x - 17, 140, 4, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 17, 140, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#946b53';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, 158, 15, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = '#c58562';
  ctx.beginPath();
  ctx.moveTo(x - 40, 206);
  ctx.quadraticCurveTo(x - 145, 225, x - 145, SH);
  ctx.lineTo(x + 145, SH);
  ctx.quadraticCurveTo(x + 145, 225, x + 40, 206);
  ctx.closePath();
  ctx.fill();
}
