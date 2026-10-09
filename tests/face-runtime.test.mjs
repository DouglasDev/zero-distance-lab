import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FaceDetectorRuntime } from '../src/modes/headless/FaceDetectorRuntime.ts';

test('GPU initialization failure falls back to CPU and returns usable landmarks', async () => {
  const delegates = [],
    result = { faceLandmarks: [[{ x: 0.5, y: 0.5 }]] };
  const runtime = new FaceDetectorRuntime(async (delegate) => {
    delegates.push(delegate);
    if (delegate === 'GPU') throw new Error('WebGL unavailable');
    return { detectForVideo: () => result, close() {} };
  });
  await runtime.initialize();
  assert.deepEqual(await runtime.detect({}, 100), result);
  assert.deepEqual(delegates, ['GPU', 'CPU']);
});

test('GPU inference failure retries the same frame on CPU and stays on CPU afterward', async () => {
  const delegates = [],
    frames = [];
  let closed = false;
  const runtime = new FaceDetectorRuntime(async (delegate) => {
    delegates.push(delegate);
    return {
      detectForVideo(frame, timestamp) {
        if (delegate === 'GPU') throw new Error('GPU inference failed');
        frames.push([frame, timestamp]);
        return { faceLandmarks: [] };
      },
      close() {
        closed = true;
      },
    };
  });
  await runtime.initialize();
  const frame = {};
  await runtime.detect(frame, 100);
  await runtime.detect(frame, 117);
  assert.equal(closed, true);
  assert.deepEqual(delegates, ['GPU', 'CPU']);
  assert.deepEqual(frames, [
    [frame, 100],
    [frame, 117],
  ]);
});
