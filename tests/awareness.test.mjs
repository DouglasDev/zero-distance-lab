import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCanvas } from '@napi-rs/canvas';
import { EffectRenderer } from '../src/rendering/EffectRenderer.ts';
import { FeatureTexture } from '../src/modes/awareness/FeatureTexture.ts';
import { drawFaceProjection } from '../src/modes/awareness/FaceProjection.ts';
import { BodyProjection } from '../src/modes/awareness/BodyProjection.ts';
import { demoBody, demoLandmarks } from '../src/modes/awareness/demoTracking.ts';
import { drawDeity } from '../src/modes/awareness/DeityProjection.ts';
import { BodyTracker } from '../src/modes/awareness/BodyTracker.ts';
import { combinedTrackingStatus } from '../src/modes/awareness/trackingStatus.ts';
import { FaceTracker } from '../src/modes/headless/FaceTracker.ts';

globalThis.document = { createElement: () => createCanvas(1, 1) };
const settings = {
  mode: 'awareness',
  demo: true,
  projectionVariant: 'face',
  projectionSize: 1,
  projectionOpacity: 0.8,
  projectionBlend: 'source-over',
  facePrediction: true,
  faceCoverage: 0.95,
  faceFeather: 0.08,
  motion: true,
  amount: 0.65,
  radius: 0.19,
};
const output = () => {
  const canvas = createCanvas(960, 540);
  return { canvas, ctx: canvas.getContext('2d') };
};
const pixels = (ctx) => ctx.getImageData(0, 0, 960, 540).data;
const pixel = (ctx, x, y) => [...ctx.getImageData(x, y, 1, 1).data];
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('all five projection demos produce distinct visible results, and zero opacity restores the room', () => {
  const renderer = new EffectRenderer(),
    { ctx } = output();
  renderer.updateSource(null, true, 0);
  renderer.render(ctx, { ...settings, projectionOpacity: 0 }, 0);
  const background = new Uint8ClampedArray(pixels(ctx));
  const images = [];
  for (const projectionVariant of ['face', 'faces', 'eyes', 'body', 'deity']) {
    renderer.render(ctx, { ...settings, projectionVariant }, 0);
    const current = new Uint8ClampedArray(pixels(ctx));
    assert.notDeepEqual(current, background, projectionVariant + ' is visible');
    for (const other of images) assert.notDeepEqual(current, other, projectionVariant + ' differs');
    images.push(current);
    assert.deepEqual(pixel(ctx, 10, 10), [113, 144, 133, 255], 'unprojected room stays intact');
    renderer.render(ctx, { ...settings, projectionVariant, projectionOpacity: 0 }, 0);
    assert.deepEqual(pixels(ctx), background);
  }
});
test('many eyes samples eye patches only and never draws nose or mouth patches', () => {
  const features = new FeatureTexture();
  features.ready = true;
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#0000ff'];
  features.patches.forEach((patch, i) => {
    patch.context.fillStyle = colors[i];
    patch.context.fillRect(0, 0, 128, 128);
  });
  const { ctx } = output();
  drawFaceProjection(ctx, features, { ...settings, projectionVariant: 'eyes' });
  const data = pixels(ctx);
  let eyes = 0;
  for (let i = 0; i < data.length; i += 4) {
    assert.equal(data[i + 2], 0, 'nose/mouth color never appears');
    if (data[i + 3]) eyes++;
  }
  assert.ok(eyes > 1000);
});
test('body segmentation projects foreground pixels and leaves all room pixels outside its mask intact', () => {
  const source = { canvas: createCanvas(640, 360) };
  source.context = source.canvas.getContext('2d');
  source.context.fillStyle = '#ff0000';
  source.context.fillRect(0, 0, 640, 360);
  const body = {
    pose: [],
    width: 2,
    height: 2,
    mask: new Uint8Array([255, 0, 0, 0]),
    timestamp: 0,
  };
  const effect = new BodyProjection();
  effect.update(source, body);
  const { ctx } = output();
  ctx.fillStyle = '#0000ff';
  ctx.fillRect(0, 0, 960, 540);
  effect.draw(ctx, body, settings);
  assert.deepEqual(pixel(ctx, 100, 100), [255, 0, 0, 255]);
  assert.deepEqual(pixel(ctx, 800, 450), [0, 0, 255, 255]);
  const before = new Uint8ClampedArray(pixels(ctx));
  effect.draw(ctx, null, settings);
  assert.deepEqual(pixels(ctx), before, 'missing body cannot reuse an old silhouette');
});
test('deity limbs respond to pose changes even with the same animation time', () => {
  const features = new FeatureTexture(),
    first = output(),
    second = output();
  const body = demoBody(0);
  drawDeity(first.ctx, features, body, settings, 0);
  const moved = { ...body, pose: body.pose.map((p) => ({ ...p })) };
  moved.pose[13].y -= 100;
  moved.pose[15].y -= 200;
  drawDeity(second.ctx, features, moved, settings, 0);
  assert.notDeepEqual(pixels(first.ctx), pixels(second.ctx));
});
test('projection room capture survives switching experiments and clear removes it', () => {
  const renderer = new EffectRenderer();
  renderer.updateSource(null, true, 0);
  renderer.capture(true);
  assert.equal(renderer.awareness.hasBackground, true);
  const { ctx } = output();
  renderer.render(ctx, { ...settings, mode: 'sphere' }, 0);
  renderer.render(ctx, settings, 0);
  assert.equal(renderer.awareness.hasBackground, true);
  renderer.clear();
  assert.equal(renderer.awareness.hasBackground, false);
});
function harness() {
  const workers = [];
  const tracker = new BodyTracker(() => {}, {
    assets: '/tracking',
    bitmap: async () => ({ close() {} }),
    worker: () => {
      const port = {
        messages: [],
        onmessage: null,
        onerror: null,
        terminated: false,
        postMessage(data) {
          this.messages.push(data);
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
  return { tracker, workers };
}
test('body tracker keeps one frame in flight, expires stale silhouettes, and ignores old session results', async () => {
  const { tracker, workers } = harness();
  tracker.update({}, 0, 0);
  const w = workers[0];
  w.send({ type: 'ready' });
  tracker.update({}, 1, 1);
  tracker.update({}, 20, 2);
  await flush();
  assert.equal(w.messages.length, 2, 'initialization and just one frame');
  const frame = w.messages.at(-1);
  const result = { ...demoBody(0), timestamp: 1 };
  w.send({ type: 'body', result, generation: frame.generation });
  assert.equal(tracker.body(50), result);
  assert.equal(tracker.body(302), null, 'stale body disappears rather than smearing room texture');
  tracker.update({}, 60, 1);
  await flush();
  assert.equal(w.messages.length, 2, 'duplicate camera frame skipped');
  tracker.stop();
  tracker.update({}, 70, 3);
  w.send({ type: 'body', result, generation: frame.generation });
  assert.equal(tracker.body(70), null);
  assert.equal(w.terminated, true);
  tracker.stop();
});
test('body tracking errors stop automatic retries and retry clears previous session', async () => {
  const { tracker, workers } = harness();
  tracker.update({}, 0, 0);
  workers[0].send({ type: 'error' });
  tracker.update({}, 20, 1);
  assert.equal(workers.length, 1);
  tracker.restart();
  tracker.update({}, 40, 2);
  assert.equal(workers.length, 2);
  tracker.stop();
});
test('face feature data expires independently of the held headless contour', async () => {
  const worker = {
    onmessage: null,
    onerror: null,
    messages: [],
    postMessage(data) {
      this.messages.push(data);
    },
    terminate() {},
  };
  const tracker = new FaceTracker(() => {}, {
    assets: '/tracking',
    worker: () => worker,
    bitmap: async () => ({ close() {} }),
  });
  tracker.update({}, 0, 0);
  worker.onmessage({ data: { type: 'ready' } });
  tracker.update({}, 1, 1);
  await flush();
  const frame = worker.messages.at(-1),
    landmarks = demoLandmarks(0);
  worker.onmessage({
    data: {
      type: 'face',
      outline: [
        { x: 200, y: 100 },
        { x: 360, y: 100 },
        { x: 360, y: 260 },
      ],
      landmarks,
      timestamp: 1,
      generation: frame.generation,
    },
  });
  assert.deepEqual(tracker.features(50), landmarks);
  assert.equal(tracker.features(302), null);
  assert.ok(tracker.face(302), 'headless continuity remains');
  tracker.stop();
  assert.equal(tracker.features(303), null);
});

test('matched body snapshots are released on replacement, cancellation, and late delivery', async () => {
  const { tracker, workers } = harness();
  tracker.update({}, 0, 0);
  const w = workers[0];
  w.send({ type: 'ready' });
  tracker.update({}, 1, 1);
  await flush();
  let closed = 0;
  const result = {
    ...demoBody(0),
    timestamp: 1,
    image: {
      close() {
        closed++;
      },
    },
  };
  w.send({ type: 'body', result, generation: w.messages.at(-1).generation });
  tracker.stop();
  assert.equal(closed, 1);
  w.send({
    type: 'body',
    result: {
      ...result,
      image: {
        close() {
          closed++;
        },
      },
    },
    generation: 0,
  });
  assert.equal(closed, 2, 'late delivery releases its snapshot');
});

test('deity reports errors from either tracker and face-only versions ignore body status', () => {
  assert.equal(combinedTrackingStatus('error', 'tracking', true, true), 'error');
  assert.equal(combinedTrackingStatus('tracking', 'loading', true, true), 'loading');
  assert.equal(combinedTrackingStatus('tracking', 'error', true, false), 'tracking');
  assert.equal(combinedTrackingStatus('holding', 'tracking', true, true), 'searching');
});

test('body projection uses the matched snapshot rather than a newer live camera frame', () => {
  const source = { canvas: createCanvas(640, 360) };
  source.context = source.canvas.getContext('2d');
  source.context.fillStyle = '#ff0000';
  source.context.fillRect(0, 0, 640, 360);
  const snapshot = createCanvas(320, 180),
    snapshotContext = snapshot.getContext('2d');
  snapshotContext.fillStyle = '#0000ff';
  snapshotContext.fillRect(0, 0, 320, 180);
  const body = {
    pose: [],
    mask: new Uint8Array([255]),
    width: 1,
    height: 1,
    timestamp: 0,
    image: snapshot,
  };
  const projection = new BodyProjection(),
    { ctx } = output();
  projection.update(source, body);
  projection.draw(ctx, body, settings);
  assert.deepEqual(pixel(ctx, 480, 270), [0, 0, 255, 255]);
});
