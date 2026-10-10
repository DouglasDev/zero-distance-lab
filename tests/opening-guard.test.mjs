import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OpeningGuard } from '../src/modes/headless/OpeningGuard.ts';
import { fillFaceMask } from '../src/modes/headless/faceMask.ts';
import { demoFaceOutline } from '../src/modes/headless/faceOutline.ts';
const face = [
  { x: 200, y: 100 },
  { x: 360, y: 100 },
  { x: 360, y: 260 },
  { x: 200, y: 260 },
];
const still = { x: 0, y: 0 };
const image = () => ({ width: 640, height: 360, data: new Uint8ClampedArray(640 * 360 * 4) });
const alpha = (im, x, y) => im.data[(y * 640 + x) * 4 + 3];

test('confident stationary tracking keeps the original retained face edge', () => {
  const guard = new OpeningGuard();
  const padding = guard.update(face, still, 1, 30, false, 0);
  assert.deepEqual(padding, still);
  const original = image(),
    guarded = image();
  fillFaceMask(original, demoFaceOutline(0), 0.95, 0.08);
  fillFaceMask(guarded, demoFaceOutline(0), 0.95, 0.08, padding);
  assert.deepEqual(guarded.data, original.data);
});
test('fast motion covers both outer eyes even with center overshoot or lag', () => {
  for (const direction of [-1, 1]) {
    const guard = new OpeningGuard();
    const padding = guard.update(face, { x: direction * 1.5, y: 0 }, 1, 50, false, 16);
    const shifted = face.map((p) => ({ x: p.x + direction * 6, y: p.y }));
    const im = image(),
      normal = image();
    fillFaceMask(im, shifted, 0.95, 0.08, padding);
    fillFaceMask(normal, shifted, 0.95, 0.08);
    // The true eye positions move 16 px while the estimate may err in either direction.
    for (const eye of [215, 345])
      for (const delta of [-16, 16]) {
        assert.equal(alpha(im, eye + delta, 180), 255, `eye ${eye + delta} is fully erased`);
      }
    assert.ok(
      alpha(normal, 199, 180) < 255,
      'ordinary inset leaves the trailing eye partly visible',
    );
  }
});
test('uncertain matches and missed detections enlarge coverage without moving its center', () => {
  const guard = new OpeningGuard();
  const weak = guard.update(face, still, 0, 50, false, 0);
  assert.ok(weak.x > 0 && weak.y > 0);
  const missed = guard.update(face, still, 0, 250, true, 16);
  assert.ok(missed.x >= weak.x && missed.y >= weak.y);
  const held = guard.update(face, still, 0, 3000, true, 32);
  assert.deepEqual(held, missed, 'prolonged misses do not grow without bound');
});
test('coverage grows immediately, persists through reversal, then returns to normal', () => {
  const guard = new OpeningGuard();
  guard.update(face, still, 1, 10, false, 0);
  const fast = guard.update(face, { x: 2, y: 1 }, 1, 30, false, 16);
  assert.equal(fast.x, 40, 'horizontal expansion is capped to a quarter of face width');
  const stopped = guard.update(face, still, 1, 10, false, 32);
  assert.ok(stopped.x > fast.x * 0.8, 'no abrupt contraction at a stop');
  const reverse = guard.update(face, { x: -2, y: -1 }, 1, 20, false, 48);
  assert.deepEqual(reverse, fast, 'both sides remain covered on reversal');
  assert.deepEqual(guard.update(face, still, 1, 10, false, 2000), still);
  guard.update(face, { x: 2, y: 1 }, 1, 50, false, 2016);
  guard.reset();
  assert.deepEqual(guard.update(face, still, 1, 10, false, 2032), still);
  assert.deepEqual(guard.update(null, { x: 2, y: 1 }, 0, 999, true, 2048), still);
});
test('expanded mask retains inward feathering without widening its fade', () => {
  const im = image();
  fillFaceMask(im, face, 0.95, 0.08, { x: 24, y: 24 });
  assert.equal(alpha(im, 194, 180), 255, 'new interior is opaque past the original edge');
  assert.equal(alpha(im, 179, 180), 0, 'outside expanded boundary stays live');
  assert.ok(
    alpha(im, 184, 180) > 0 && alpha(im, 184, 180) < 255,
    'expanded edge still blends inward',
  );
});
