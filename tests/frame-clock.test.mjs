import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FrameClock } from '../src/rendering/FrameClock.ts';

test('paused effect time stays fixed while frames continue, then resumes without a phase jump', () => {
  const clock = new FrameClock();
  assert.equal(clock.advance(0, true), true);
  assert.equal(clock.time, 100);
  assert.equal(clock.advance(10, true), false);
  assert.equal(clock.advance(40, true), true);
  assert.equal(clock.time, 140);
  assert.equal(clock.advance(80, false), true);
  assert.equal(clock.advance(1000, false), true);
  assert.equal(clock.time, 140);
  assert.equal(clock.advance(1040, true), true);
  assert.equal(clock.time, 180);
  clock.advance(5000, true);
  assert.equal(clock.time, 280, 'long frame gaps are capped at 100 ms');
});

test('headless rendering can update at 60 fps instead of waiting for the next 30 fps slot', () => {
  const clock = new FrameClock();
  assert.equal(clock.advance(0, true, 60), true);
  assert.equal(clock.advance(16.667, true, 60), true);
  assert.equal(clock.advance(33.334, true, 60), true);
  assert.equal(clock.advance(40, true, 60), false);
});
