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
  const padding = guard.update(face, still, 1, 0);
  assert.deepEqual(padding, still);
  const original = image(),
    guarded = image();
  fillFaceMask(original, demoFaceOutline(0), 0.95, 0.08);
  fillFaceMask(guarded, demoFaceOutline(0), 0.95, 0.08, padding);
  assert.deepEqual(guarded.data, original.data);
});
test('fast motion adds a modest cushion for small eye-edge alignment errors', () => {
  for (const direction of [-1, 1]) {
    const guard = new OpeningGuard();
    const padding = guard.update(face, { x: direction * 1.5, y: 0 }, 1, 16);
    const shifted = face.map((p) => ({ x: p.x + direction * 3, y: p.y }));
    const im = image(),
      normal = image();
    fillFaceMask(im, shifted, 0.95, 0.08, padding);
    fillFaceMask(normal, shifted, 0.95, 0.08);
    // The true eye positions differ by 3 px while the estimate may err in either direction.
    for (const eye of [215, 345])
      for (const delta of [-3, 3]) {
        assert.equal(alpha(im, eye + delta, 180), 255, `eye ${eye + delta} is fully erased`);
      }
    assert.ok(
      alpha(normal, 212, 180) < 255,
      'ordinary inset leaves the trailing eye partly visible',
    );
  }
});
test('low confidence and ordinary slow movement do not expand the opening', () => {
  const guard = new OpeningGuard();
  for (const time of [0, 16, 100, 1000]) {
    assert.deepEqual(guard.update(face, still, 0, time), still);
    assert.deepEqual(guard.update(face, { x: 0.15, y: 0 }, 1, time), still);
  }
  assert.deepEqual(
    guard.update(face, { x: 2, y: 1 }, 0, 1100),
    still,
    'untrusted movement cannot trigger expansion',
  );
});
test('brief confidence loss does not pulse the opening during fast motion', () => {
  const guard = new OpeningGuard();
  const fast = guard.update(face, { x: 2, y: 0 }, 1, 0);
  assert.deepEqual(guard.update(face, still, 0, 16), fast);
  assert.deepEqual(guard.update(face, { x: 1, y: 0 }, 1, 32), fast);
  assert.deepEqual(guard.update(face, still, 0, 48), fast);
});
test('coverage grows immediately, persists through reversal, then returns to normal', () => {
  const guard = new OpeningGuard();
  guard.update(face, still, 1, 0);
  const fast = guard.update(face, { x: 2, y: 1 }, 1, 16);
  assert.equal(fast.x, 8, 'horizontal expansion is capped to eight pixels / 5% of face width');
  const stopped = guard.update(face, still, 1, 32);
  assert.ok(stopped.x > fast.x * 0.8, 'no abrupt contraction at a stop');
  const reverse = guard.update(face, { x: -2, y: -1 }, 1, 48);
  assert.deepEqual(reverse, fast, 'both sides remain covered on reversal');
  assert.deepEqual(guard.update(face, still, 1, 2000), still);
  guard.update(face, { x: 2, y: 1 }, 1, 2016);
  guard.reset();
  assert.deepEqual(guard.update(face, still, 1, 2032), still);
  assert.deepEqual(guard.update(null, { x: 2, y: 1 }, 0, 2048), still);
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
