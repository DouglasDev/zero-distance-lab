import { SOURCE_WIDTH, SOURCE_HEIGHT, type Position } from '../../rendering/types.ts';

// The ordered perimeter of MediaPipe's FACE_LANDMARKS_FACE_OVAL.
export const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
  176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];

export function faceOutline(landmarks: readonly Position[]): Position[] | null {
  const points = FACE_OVAL.map((index) => landmarks[index]);
  if (points.some((point) => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)))
    return null;
  return points.map((point) => ({ x: point.x * SOURCE_WIDTH, y: point.y * SOURCE_HEIGHT }));
}

export function demoFaceOutline(time: number): Position[] {
  const x = SOURCE_WIDTH / 2 + Math.sin(time / 1600) * 30;
  return Array.from({ length: 36 }, (_, index) => {
    const angle = (index / 36) * Math.PI * 2;
    return { x: x + Math.cos(angle) * 47, y: 142 + Math.sin(angle) * 60 };
  });
}
