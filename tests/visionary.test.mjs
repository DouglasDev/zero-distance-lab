import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import {
  project,
  sculptedFace,
  chamberSurfaces,
  grid,
} from '../src/modes/awareness/visionary/mesh.ts';
import { MeshRenderer } from '../src/modes/awareness/visionary/MeshRenderer.ts';
import { VisionaryTemple } from '../src/modes/awareness/visionary/VisionaryTemple.ts';
import { DeityProjection } from '../src/modes/awareness/DeityProjection.ts';
import { FeatureTexture } from '../src/modes/awareness/FeatureTexture.ts';
import { FrameSource } from '../src/rendering/FrameSource.ts';
import { demoLandmarks, demoBody } from '../src/modes/awareness/demoTracking.ts';
globalThis.document = { createElement: () => createCanvas(1, 1) };
const settings = {
  projectionVariant: 'face',
  projectionEnvironment: 'temple',
  projectionSize: 1,
  projectionOpacity: 0.8,
  projectionBlend: 'source-over',
  demo: true,
  motion: true,
};
const output = () => {
  const canvas = createCanvas(960, 540);
  return { canvas, ctx: canvas.getContext('2d') };
};
const pixels = (ctx) => ctx.getImageData(0, 0, 960, 540).data;

test('perspective depends on actual depth, clips points behind the camera, and produces parallax', () => {
  const camera = { x: 0, y: 0, z: 0, focal: 680 };
  const a = project({ x: 1, y: 1, z: 4, u: 0, v: 0 }, camera),
    b = project({ x: 1, y: 1, z: 8, u: 0, v: 0 }, camera);
  assert.equal(a.x - 480, 2 * (b.x - 480));
  assert.equal(270 - a.y, 2 * (270 - b.y));
  assert.equal(project({ x: 0, y: 0, z: 0.1, u: 0, v: 0 }, camera), null);
  assert.notEqual(project({ x: 1, y: 1, z: 4, u: 0, v: 0 }, { ...camera, x: 0.3 }).x, a.x);
});
test('temple uses real vaulted depth and face relief with a projecting nose', () => {
  const walls = chamberSurfaces();
  const depths = walls.flatMap((m) => m.vertices.map((v) => v.z));
  assert.ok(Math.max(...depths) - Math.min(...depths) > 20);
  const face = sculptedFace(0, 0, 5, 3, 4, 0, 20);
  const nose = face.vertices.find((p) => Math.abs(p.u - 0.5) < 0.001 && Math.abs(p.v - 0.5) < 0.03);
  const side = face.vertices.find((p) => p.u === 0 && Math.abs(p.v - 0.5) < 0.03);
  assert.ok(nose.z < side.z - 0.6, 'nose projects toward the viewer');
  assert.ok(face.indices.every((i) => i >= 0 && i < face.vertices.length));
});
test('texture UVs remain correct under perspective in the software fallback', () => {
  const texture = createCanvas(64, 64),
    t = texture.getContext('2d');
  t.fillStyle = '#ff0000';
  t.fillRect(0, 0, 32, 64);
  t.fillStyle = '#0000ff';
  t.fillRect(32, 0, 32, 64);
  const plane = grid(2, 2, (u, v) => ({ x: (u - 0.5) * 2, y: (0.5 - v) * 2, z: 4, u, v }));
  const renderer = new MeshRenderer(),
    { ctx } = output();
  renderer.draw(ctx, [plane], texture, { x: 0, y: 0, z: 0, focal: 680 });
  assert.deepEqual([...ctx.getImageData(400, 270, 1, 1).data], [255, 0, 0, 255]);
  assert.deepEqual([...ctx.getImageData(560, 270, 1, 1).data], [0, 0, 255, 255]);
  renderer.dispose();
});
test('the temple reacts to live texture changes and camera movement while fixed phase is repeatable', () => {
  const source = new FrameSource();
  source.update(null, true, 0);
  const landmarks = demoLandmarks(0),
    features = new FeatureTexture();
  features.update(source, landmarks);
  const temple = new VisionaryTemple(),
    first = output(),
    second = output(),
    again = output();
  temple.render(first.ctx, source, landmarks, features, settings, 0);
  temple.render(again.ctx, source, landmarks, features, settings, 0);
  assert.deepEqual(pixels(first.ctx), pixels(again.ctx));
  const shifted = landmarks.map((p) => ({ x: p.x + 35, y: p.y }));
  temple.render(second.ctx, source, shifted, features, settings, 1200);
  assert.notDeepEqual(pixels(first.ctx), pixels(second.ctx));
  source.context.fillStyle = '#00ff00';
  source.context.fillRect(0, 0, 640, 360);
  features.update(source, landmarks);
  temple.render(again.ctx, source, landmarks, features, settings, 0);
  assert.notDeepEqual(pixels(first.ctx), pixels(again.ctx));
  temple.dispose();
});
test('museum artwork loads locally and live feature blending changes its face', async () => {
  const art = await loadImage(new URL('../public/art/mahakala.jpg', import.meta.url).pathname);
  const deity = new DeityProjection(art),
    source = new FrameSource();
  source.update(null, true, 0);
  const landmarks = demoLandmarks(0),
    features = new FeatureTexture();
  features.update(source, landmarks);
  const first = output(),
    second = output();
  deity.draw(first.ctx, features, landmarks, demoBody(0), { ...settings, projectionOpacity: 0 });
  deity.draw(second.ctx, features, landmarks, demoBody(0), { ...settings, projectionOpacity: 1 });
  assert.notDeepEqual(pixels(first.ctx), pixels(second.ctx));
  deity.dispose();
});
