export function createSurface(width: number, height: number, readFrequently = false) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: readFrequently });
  if (!context) throw new Error('A 2D canvas context is required.');
  return { canvas, context };
}

export function circle(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
}

export function withCircleClip(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  draw: () => void,
) {
  context.save();
  try {
    circle(context, x, y, radius);
    context.clip();
    draw();
  } finally {
    context.restore();
  }
}

export function strokeCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  width: number,
) {
  context.strokeStyle = color;
  context.lineWidth = width;
  circle(context, x, y, radius);
  context.stroke();
}

export function drawMirroredVideo(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
) {
  const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
  const w = video.videoWidth * scale,
    h = video.videoHeight * scale;
  context.save();
  context.translate(width, 0);
  context.scale(-1, 1);
  context.drawImage(video, (width - w) / 2, (height - h) / 2, w, h);
  context.restore();
}
