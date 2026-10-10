import type { Position } from '../../rendering/types.ts';
import { estimateFrameMotion, type GrayFrame } from './frameMotion.ts';

interface Sample {
  time: number;
  x: number;
  y: number;
}

/** Keep capture-time motion history so a delayed model result can be aligned to the current frame. */
export class MotionCompensator {
  private previous: GrayFrame | null = null;
  private history: Sample[] = [];
  private velocity = { x: 0, y: 0 };
  private previousTime = 0;
  confidence = 0;
  private frozen: Position[] | null = null;
  private frozenAnchor = -Infinity;
  private cached: { outline: Position[]; x: number; y: number; result: Position[] } | null = null;

  update(frame: GrayFrame, outline: readonly Position[] | null, time: number) {
    const last = this.history.at(-1) ?? { time, x: 0, y: 0 };
    const dt = time - this.previousTime;
    const motion =
      this.previous && outline && dt > 0 && dt <= 100
        ? estimateFrameMotion(this.previous, frame, outline)
        : { x: 0, y: 0, confidence: 0 };
    this.confidence = motion.confidence;
    this.velocity =
      dt > 0 && motion.confidence >= 0.5 ? { x: motion.x / dt, y: motion.y / dt } : { x: 0, y: 0 };
    this.history.push({ time, x: last.x + motion.x, y: last.y + motion.y });
    this.history = this.history.filter((sample) => time - sample.time <= 2000);
    this.previous = frame;
    this.previousTime = time;
  }

  correct(
    outline: Position[] | null,
    captureTime: number,
    now: number,
    predict = false,
  ): Position[] | null {
    if (!outline) return null;
    const anchor = this.history.find((sample) => sample.time >= captureTime - 0.01);
    const latest = this.history.at(-1);
    if (!anchor || !latest) return outline;
    // Long detection loss must freeze rather than gradually follow unrelated room texture.
    if (now - captureTime > 500 && this.frozenAnchor === captureTime && this.frozen)
      return this.frozen;
    let x = latest.x - anchor.x,
      y = latest.y - anchor.y;
    if (predict && now - captureTime <= 300 && now - latest.time <= 50 && this.confidence >= 0.5) {
      const leadX = this.velocity.x * 6,
        leadY = this.velocity.y * 6;
      const width = Math.max(...outline.map((p) => p.x)) - Math.min(...outline.map((p) => p.x));
      const limit = Math.min(8, width * 0.04);
      const magnitude = Math.hypot(leadX, leadY);
      const scale = magnitude ? Math.min(1, limit / magnitude) : 0;
      x += leadX * scale;
      y += leadY * scale;
    }
    if (!x && !y) {
      this.frozen = outline;
      this.frozenAnchor = captureTime;
      return outline;
    }
    if (this.cached?.outline === outline && this.cached.x === x && this.cached.y === y) {
      this.frozen = this.cached.result;
      this.frozenAnchor = captureTime;
      return this.cached.result;
    }
    const corrected = outline.map((point) => ({ x: point.x + x, y: point.y + y }));
    this.cached = { outline, x, y, result: corrected };
    this.frozen = corrected;
    this.frozenAnchor = captureTime;
    return corrected;
  }

  reset() {
    this.cached = null;
    this.previous = null;
    this.history = [];
    this.previousTime = 0;
    this.velocity = { x: 0, y: 0 };
    this.confidence = 0;
    this.frozen = null;
    this.frozenAnchor = -Infinity;
  }
}
