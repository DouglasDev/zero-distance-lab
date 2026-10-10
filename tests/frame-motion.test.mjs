import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estimateFrameMotion } from '../src/modes/headless/frameMotion.ts';
import { MotionCompensator } from '../src/modes/headless/MotionCompensator.ts';
import { FaceTracker } from '../src/modes/headless/FaceTracker.ts';
import { PerformanceMeter } from '../src/modes/headless/TrackingPerformance.ts';

const outline = [
  { x: 200, y: 100 },
  { x: 360, y: 100 },
  { x: 360, y: 260 },
  { x: 200, y: 260 },
];
// A textured face moves independently of a stationary, separately textured room.
function frame(dx = 0, dy = 0, seed = 1) {
  const pixels = new Uint8Array(160 * 90);
  for (let y = 0; y < 90; y++)
    for (let x = 0; x < 160; x++) {
      const fx = x - dx,
        fy = y - dy;
      const face = fx >= 48 && fx < 92 && fy >= 23 && fy < 67;
      const a = face ? fx : x,
        b = face ? fy : y,
        k = face ? seed : 712;
      // Smooth texture survives half-resolution matching without ambiguous repeated stripes.
      pixels[y * 160 + x] = Math.round(
        128 +
          35 * Math.sin(a * 0.37 + k) +
          32 * Math.cos(b * 0.43 + k * 3) +
          28 * Math.sin(a * 0.21 + b * 0.29 + k * 5),
      );
    }
  return { width: 160, height: 90, pixels };
}
const move = (points, x, y) => points.map((p) => ({ x: p.x + x, y: p.y + y }));

test('sparse motion follows fast face translation while the room stays still', () => {
  for (const [x, y] of [
    [4, 2],
    [-6, 4],
    [12, -2],
  ]) {
    const result = estimateFrameMotion(frame(), frame(x, y), outline);
    assert.equal(result.x, x * 4);
    assert.equal(result.y, y * 4);
    assert.ok(result.confidence >= 0.5);
  }
});
test('flat or unrelated face texture produces no motion', () => {
  const flat = { width: 160, height: 90, pixels: new Uint8Array(160 * 90).fill(100) };
  assert.deepEqual(estimateFrameMotion(flat, flat, outline), { x: 0, y: 0, confidence: 0 });
  assert.deepEqual(estimateFrameMotion(frame(), frame(0, 0, 17), outline), {
    x: 0,
    y: 0,
    confidence: 0,
  });
});
test('capture-time history corrects delayed results without double applying movement', () => {
  const m = new MotionCompensator();
  m.update(frame(), null, 0);
  m.update(frame(4, 0), outline, 16);
  m.update(frame(8, 0), move(outline, 16, 0), 32);
  const current = m.correct(outline, 0, 32);
  assert.deepEqual(current, move(outline, 32, 0));
  assert.deepEqual(m.correct(move(outline, 16, 0), 16, 32), current);
  const again = m.correct(outline, 0, 32);
  assert.equal(m.correct(outline, 0, 40), again, 'unchanged motion reuses geometry/mask');
});
test('prediction is bounded and drops immediately when movement stops or reverses', () => {
  const m = new MotionCompensator();
  m.update(frame(), null, 0);
  m.update(frame(12, 0), outline, 16);
  const predicted = m.correct(outline, 0, 16, true);
  assert.ok(predicted[0].x - 248 <= 6.4 + 0.00001);
  assert.ok(predicted[0].x > 248);
  m.update(frame(12, 0), move(outline, 48, 0), 32);
  assert.deepEqual(m.correct(outline, 0, 32, true), move(outline, 48, 0));
  m.update(frame(8, 0), move(outline, 48, 0), 48);
  assert.ok(m.correct(outline, 0, 48, true)[0].x < 232);
  assert.deepEqual(
    m.correct(outline, 0, 120, true),
    move(outline, 32, 0),
    'stale velocity cannot extrapolate',
  );
});
test('prolonged detection loss freezes motion and reset clears its history', () => {
  const m = new MotionCompensator();
  m.update(frame(), null, 0);
  m.update(frame(4, 0), outline, 16);
  const held = m.correct(outline, 0, 16);
  m.update(frame(8, 0), held, 32);
  assert.equal(m.correct(outline, 0, 600), held);
  m.reset();
  m.update(frame(12, 0), null, 700);
  assert.equal(m.correct(outline, 700, 700), outline);
  assert.equal(m.confidence, 0);
});
test('performance reports inference, end-to-end age, rolling rates, and fallback backend', () => {
  const m = new PerformanceMeter();
  m.camera(0);
  m.camera(20);
  m.camera(40);
  m.result(50, 0, 30, 'GPU');
  m.result(100, 50, 35, 'CPU');
  assert.deepEqual(m.snapshot(110, 0.7), {
    backend: 'CPU',
    cameraFps: 50,
    detectionFps: 20,
    inferenceMs: 35,
    resultAgeMs: 60,
    motionConfidence: 0.7,
  });
  assert.equal(m.snapshot(2000, 0).detectionFps, 0);
  m.reset();
  assert.equal(m.snapshot(2000, 0).resultAgeMs, null);
});

const flush = () => new Promise((resolve) => setImmediate(resolve));
test('tracker moves during inference and aligns a late result with the displayed camera frame', async () => {
  let time = 0;
  const messages = [];
  const worker = {
    onmessage: null,
    onerror: null,
    postMessage(message) {
      messages.push(message);
    },
    terminate() {},
  };
  const tracker = new FaceTracker(() => {}, {
    worker: () => worker,
    assets: '/tracking',
    now: () => time,
    motionFrame: (canvas) => canvas,
    bitmap: async () => ({ close() {} }),
  });
  const send = (data) => worker.onmessage({ data });
  tracker.update(frame(), 0, 0);
  send({ type: 'ready', backend: 'GPU' });
  tracker.update(frame(), 0, 0);
  await flush();
  send({
    type: 'face',
    outline,
    timestamp: 0,
    generation: messages.at(-1).generation,
    inferenceMs: 10,
    backend: 'GPU',
  });
  time = 16;
  tracker.update(frame(4, 0), time, 1);
  await flush();
  const inFlight = messages.at(-1);
  time = 32;
  tracker.update(frame(8, 0), time, 2);
  assert.deepEqual(
    tracker.face(time),
    move(outline, 32, 0),
    'mask follows even while the worker is busy',
  );
  assert.equal(messages.at(-1), inFlight, 'no queue of stale camera images');
  send({
    type: 'face',
    outline: move(outline, 16, 0),
    timestamp: 16,
    generation: inFlight.generation,
    inferenceMs: 16,
    backend: 'CPU',
  });
  assert.deepEqual(
    tracker.face(time),
    move(outline, 32, 0),
    'late landmarks retain current position',
  );
  assert.equal(tracker.performance(time).backend, 'CPU');
  tracker.restart();
  tracker.update(frame(12, 0), 48, 3);
  assert.deepEqual(
    tracker.face(48),
    move(outline, 32, 0),
    'retry preserves compensated position and clears old motion',
  );
  tracker.stop();
  assert.equal(tracker.face(49), null);
});
test('a missed detection still updates inference timing and CPU fallback without refreshing landmark age', () => {
  const m = new PerformanceMeter();
  m.result(20, 0, 10, 'GPU');
  m.result(40, 30, 8, 'CPU', false);
  const metrics = m.snapshot(50, 0);
  assert.equal(metrics.backend, 'CPU');
  assert.equal(metrics.inferenceMs, 8);
  assert.equal(metrics.resultAgeMs, 50);
  assert.equal(metrics.detectionFps, 0);
});
