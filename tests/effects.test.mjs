import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCanvas } from '@napi-rs/canvas';
import { EffectRenderer } from '../src/rendering/EffectRenderer.ts';
import { demoFaceOutline } from '../src/modes/headless/faceOutline.ts';
import { WIDTH, HEIGHT } from '../src/rendering/types.ts';

globalThis.document = {
  createElement: (name) => {
    assert.equal(name, 'canvas');
    return createCanvas(1, 1);
  },
};
const defaults = {
  mode: 'headless',
  radius: 0.19,
  faceCoverage: 0.8,
  faceFeather: 0.12,
  x: 0.5,
  y: 0.39,
  motion: true,
  amount: 0.65,
  demo: false,
};
const output = () => {
  const canvas = createCanvas(WIDTH, HEIGHT);
  return { canvas, ctx: canvas.getContext('2d') };
};
const pixel = (ctx, x, y) => [...ctx.getImageData(x, y, 1, 1).data];
function video() {
  const canvas = createCanvas(640, 360),
    ctx = canvas.getContext('2d');
  for (const [color, x, y] of [
    ['#ff0000', 0, 0],
    ['#00ff00', 320, 0],
    ['#0000ff', 0, 180],
    ['#ffff00', 320, 180],
  ]) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 320, 180);
  }
  Object.assign(canvas, { readyState: 2, videoWidth: 640, videoHeight: 360 });
  return canvas;
}

test('live capture is mirrored, and a tracked face opening restores its saved background', () => {
  const fx = new EffectRenderer(),
    { ctx } = output(),
    feed = video();
  fx.updateSource(feed, false, 0);
  fx.capture(false);
  fx.headless.setFace(demoFaceOutline(0));
  feed.getContext('2d').fillStyle = '#aa00aa';
  feed.getContext('2d').fillRect(0, 0, 640, 360);
  fx.updateSource(feed, false, 0);
  fx.render(ctx, defaults, 0);
  assert.deepEqual(pixel(ctx, 500, 210), [255, 0, 0, 255]);
  assert.deepEqual(pixel(ctx, 100, 100), [170, 0, 170, 255]);
  fx.clear();
  fx.render(ctx, defaults, 0);
  assert.deepEqual(pixel(ctx, 480, 210), [20, 45, 39, 255]);
});

test('sphere inverts both axes, keeps pixels outside the ball dark, and shades its rim', () => {
  const fx = new EffectRenderer(),
    { ctx } = output();
  fx.updateSource(video(), false, 0);
  fx.render(ctx, { ...defaults, mode: 'sphere' }, 0);
  const upperLeft = pixel(ctx, 450, 235),
    lowerRight = pixel(ctx, 510, 305);
  assert.ok(
    upperLeft[2] > upperLeft[0] + 100,
    'upper-left sphere should sample lower-right of the mirrored source',
  );
  assert.ok(
    lowerRight[1] > lowerRight[0] + 100,
    'lower-right sphere should sample upper-left of the mirrored source',
  );
  assert.deepEqual(pixel(ctx, 30, 30), [16, 23, 21, 255]);
});

test('still center stays spatially stable while the surround changes; fixed phase repeats exactly', () => {
  const fx = new EffectRenderer(),
    first = output(),
    second = output(),
    paused = output();
  fx.updateSource(video(), false, 0);
  const settings = { ...defaults, mode: 'still' };
  fx.render(first.ctx, settings, 0);
  fx.render(second.ctx, settings, 2500);
  assert.deepEqual(
    first.ctx.getImageData(470, 240, 20, 20).data,
    second.ctx.getImageData(470, 240, 20, 20).data,
  );
  assert.notDeepEqual(
    first.ctx.getImageData(0, 0, WIDTH, HEIGHT).data,
    second.ctx.getImageData(0, 0, WIDTH, HEIGHT).data,
  );
  fx.render(paused.ctx, { ...settings, motion: false }, 2500);
  assert.deepEqual(
    paused.ctx.getImageData(0, 0, WIDTH, HEIGHT).data,
    second.ctx.getImageData(0, 0, WIDTH, HEIGHT).data,
  );
});

test('demo background contains the empty room rather than the synthetic head', () => {
  const fx = new EffectRenderer(),
    { ctx } = output();
  fx.updateSource(null, true, 0);
  fx.capture(true);
  fx.render(ctx, { ...defaults, demo: true }, 0);
  assert.deepEqual(pixel(ctx, 480, 210), [113, 144, 133, 255]);
  fx.clear();
  assert.equal(fx.hasBackground, false);
});

test('switching effects preserves captured background until explicitly cleared', () => {
  const renderer = new EffectRenderer();
  const { ctx } = output();
  renderer.updateSource(null, true, 0);
  renderer.capture(true);
  renderer.render(ctx, { ...defaults, mode: 'sphere' }, 1000);
  renderer.render(ctx, { ...defaults, mode: 'still' }, 2500);
  renderer.updateSource(null, true, 2500);
  renderer.render(ctx, { ...defaults, demo: true }, 2500);
  assert.equal(renderer.hasBackground, true);
  assert.deepEqual(pixel(ctx, 525, 213), [113, 144, 133, 255]);
  renderer.clear();
  renderer.updateSource(null, true, 2500);
  renderer.render(ctx, { ...defaults, demo: true }, 2500);
  assert.deepEqual(pixel(ctx, 525, 213), [20, 45, 39, 255]);
});

test('live view is preserved before the first face match and after explicit geometry clearing', () => {
  const renderer = new EffectRenderer();
  const { ctx } = output();
  renderer.updateSource(video(), false, 0);
  renderer.render(ctx, defaults, 0);
  const live = pixel(ctx, 500, 210);
  renderer.headless.setFace(demoFaceOutline(0));
  renderer.render(ctx, defaults, 0);
  assert.notDeepEqual(pixel(ctx, 500, 210), live);
  renderer.headless.setFace(null);
  renderer.render(ctx, defaults, 0);
  assert.deepEqual(pixel(ctx, 500, 210), live);
});

test('face-shaped replacement keeps a thick live edge, blends inward, and follows motion', () => {
  const renderer = new EffectRenderer();
  const { ctx } = output();
  const feed = video();
  const sourceContext = feed.getContext('2d');
  sourceContext.fillStyle = '#0000ff';
  sourceContext.fillRect(0, 0, 640, 360);
  renderer.updateSource(feed, false, 0);
  renderer.capture(false);
  sourceContext.fillStyle = '#ff0000';
  sourceContext.fillRect(0, 0, 640, 360);
  renderer.updateSource(feed, false, 0);
  renderer.headless.setFace(demoFaceOutline(0));
  renderer.render(ctx, defaults, 0);
  assert.deepEqual(pixel(ctx, 480, 213), [0, 0, 255, 255]);
  assert.deepEqual(
    pixel(ctx, 544, 213),
    [255, 0, 0, 255],
    'the original face edge has no painted border',
  );
  const blend = pixel(ctx, 530, 213);
  assert.ok(
    blend[0] > 0 && blend[2] > 0 && blend[1] === 0,
    'fade mixes the background and live face',
  );
  assert.deepEqual(pixel(ctx, 540, 295), [255, 0, 0, 255], 'outside the face contour stays live');
  renderer.headless.setFace(demoFaceOutline(0).map((p) => ({ x: p.x + 130, y: p.y + 30 })));
  renderer.render(ctx, defaults, 0);
  assert.deepEqual(
    pixel(ctx, 480, 213),
    [255, 0, 0, 255],
    'the previous face location is restored',
  );
  assert.deepEqual(
    pixel(ctx, 675, 258),
    [0, 0, 255, 255],
    'the opening follows the new face position',
  );
});
