import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FaceTracker } from '../src/modes/headless/FaceTracker.ts';
import { FACE_OVAL, faceOutline, demoFaceOutline } from '../src/modes/headless/faceOutline.ts';
import { fillFaceMask } from '../src/modes/headless/faceMask.ts';

const flush = () => new Promise((resolve) => setImmediate(resolve));
function harness(bitmap = async () => ({ close() {} })) {
  const workers = [],
    statuses = [];
  const tracker = new FaceTracker((status) => statuses.push(status), {
    assets: '/tracking',
    bitmap,
    worker: () => {
      const port = {
        messages: [],
        terminated: false,
        onmessage: null,
        onerror: null,
        postMessage(message) {
          this.messages.push(message);
        },
        terminate() {
          this.terminated = true;
        },
        send(data) {
          this.onmessage?.({ data });
        },
      };
      workers.push(port);
      return port;
    },
  });
  return { tracker, workers, statuses };
}

test('tracker limits requests, expires old contours, and removes missing faces immediately', async () => {
  let snapshots = 0;
  const { tracker, workers, statuses } = harness(async () => {
    snapshots++;
    return { close() {} };
  });
  tracker.update({}, 0);
  const worker = workers[0];
  assert.equal(worker.messages[0].type, 'init');
  worker.send({ type: 'ready' });
  tracker.update({}, 100);
  tracker.update({}, 120);
  await flush();
  assert.equal(snapshots, 1, 'only one frame can be in flight');
  const frame = worker.messages.at(-1);
  const outline = demoFaceOutline(0);
  worker.send({ type: 'face', outline, timestamp: frame.timestamp, generation: frame.generation });
  assert.deepEqual(tracker.face(140), outline);
  tracker.update({}, 140);
  await flush();
  assert.equal(snapshots, 1, 'requests are throttled to at most 20 per second');
  assert.equal(tracker.face(401), null, 'stale masks disappear');
  assert.equal(statuses.at(-1), 'searching');
  tracker.update({}, 450);
  await flush();
  const next = worker.messages.at(-1);
  worker.send({
    type: 'face',
    outline: null,
    timestamp: next.timestamp,
    generation: next.generation,
  });
  assert.equal(tracker.face(451), null);
  tracker.stop();
  assert.equal(worker.terminated, true);
});

test('cancelled snapshots are closed and late worker messages cannot affect a new session', async () => {
  let resolveFrame;
  let closed = false;
  const { tracker, workers, statuses } = harness(
    () =>
      new Promise((resolve) => {
        resolveFrame = resolve;
      }),
  );
  tracker.update({}, 0);
  workers[0].send({ type: 'ready' });
  tracker.update({}, 100);
  await flush();
  const old = workers[0];
  tracker.stop();
  resolveFrame({
    close() {
      closed = true;
    },
  });
  await flush();
  assert.equal(closed, true);
  assert.equal(old.messages.length, 1, 'the cancelled frame was never transferred');
  tracker.update({}, 200);
  const current = workers[1];
  current.send({ type: 'ready' });
  old.send({ type: 'face', outline: demoFaceOutline(0), timestamp: 200, generation: 0 });
  old.onerror?.({});
  assert.equal(current.terminated, false);
  assert.equal(tracker.face(200), null);
  assert.equal(statuses.at(-1), 'searching');
  tracker.stop();
});

test('unsupported snapshot creation becomes a recoverable tracking error', async () => {
  const { tracker, workers, statuses } = harness(() => {
    throw new Error('ImageBitmap unavailable');
  });
  tracker.update({}, 0);
  workers[0].send({ type: 'ready' });
  tracker.update({}, 100);
  await flush();
  assert.equal(statuses.at(-1), 'error');
  assert.equal(workers[0].terminated, true);
  tracker.update({}, 200);
  assert.equal(workers.length, 1, 'failure does not spin up new workers every frame');
  tracker.stop();
  tracker.update({}, 300);
  assert.equal(workers.length, 2, 'retry creates a new worker');
  tracker.stop();
});

test('landmark perimeter follows measured coordinates, including asymmetry and tilt', () => {
  const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  FACE_OVAL.forEach((index, i) => {
    landmarks[index] = { x: 0.2 + i / 200, y: 0.3 + i / 300 };
  });
  const contour = faceOutline(landmarks);
  assert.equal(contour.length, 36);
  assert.deepEqual(contour[0], { x: 0.2 * 640, y: 0.3 * 360 });
  assert.deepEqual(contour[35], { x: landmarks[109].x * 640, y: landmarks[109].y * 360 });
  assert.equal(faceOutline([]), null);
});

test('mask feathers only inside its inset shape and leaves outer facial edges untouched', () => {
  const image = { width: 640, height: 360, data: new Uint8ClampedArray(640 * 360 * 4) };
  fillFaceMask(image, demoFaceOutline(0), 0.8, 0.12);
  const alpha = (x, y) => image.data[(y * 640 + x) * 4 + 3];
  assert.equal(alpha(320, 142), 255);
  assert.equal(alpha(362, 142), 0);
  assert.ok(alpha(353, 142) > 0 && alpha(353, 142) < 255);
  assert.ok(alpha(350, 142) > alpha(353, 142));
  fillFaceMask(image, [], 0.8, 0.12);
  assert.equal(alpha(320, 142), 0, 'clearing geometry clears the previous mask');
});
