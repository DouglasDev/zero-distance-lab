import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FACE_OVAL, faceOutline } from '../src/modes/headless/faceOutline.ts';
import { fillFaceMask } from '../src/modes/headless/faceMask.ts';

function profile(direction, tilt = 0) {
  const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.45 }));
  const toLandmark = (x, y) => ({
    x: (320 + x * Math.cos(tilt) - y * Math.sin(tilt)) / 640,
    y: (162 + x * Math.sin(tilt) + y * Math.cos(tilt)) / 360,
  });
  FACE_OVAL.forEach((index, i) => {
    const angle = (i / 36) * Math.PI * 2 - Math.PI / 2;
    landmarks[index] = toLandmark(Math.cos(angle) * 30, Math.sin(angle) * 65);
  });
  for (const index of [168, 6, 5]) landmarks[index] = toLandmark(direction * 28, -15);
  for (const index of [1, 4, 19, 94, 2, 98, 327]) landmarks[index] = toLandmark(direction * 45, 0);
  for (const index of [61, 291, 0, 17, 13, 14, 37, 267, 39, 269, 40, 270])
    landmarks[index] = toLandmark(direction * 32, 29);
  return landmarks;
}

for (const direction of [-1, 1])
  for (const tilt of [0, 0.45]) {
    test(`profile mask covers the protruding nose and lips: direction ${direction}, tilt ${tilt}`, () => {
      const landmarks = profile(direction, tilt);
      const contour = faceOutline(landmarks);
      const image = { width: 640, height: 360, data: new Uint8ClampedArray(640 * 360 * 4) };
      fillFaceMask(image, contour, 0.95, 0.08);
      const alpha = (point) =>
        image.data[(Math.round(point.y * 360) * 640 + Math.round(point.x * 640)) * 4 + 3];
      assert.equal(
        alpha(landmarks[1]),
        255,
        'nose tip is fully replaced rather than left in the fade',
      );
      assert.equal(alpha(landmarks[17]), 255, 'lower lip is fully replaced');
      const back = direction > 0 ? 234 : 454;
      assert.equal(alpha(landmarks[back]), 0, 'the back edge of the facial oval remains visible');
      assert.ok(
        contour.some((point) => direction * (point.x - landmarks[1].x * 640) > 0),
        'silhouette extends past the protruding nose',
      );
    });
  }
