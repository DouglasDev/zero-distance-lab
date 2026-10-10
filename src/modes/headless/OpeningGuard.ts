import type { Position } from '../../rendering/types.ts';

/** Add a small cushion only for fast measured motion; hold briefly to avoid flicker. */
export class OpeningGuard {
  private padding: Position = { x: 0, y: 0 };
  private previousTime: number | null = null;
  private active = false;
  private holdUntil = -Infinity;

  update(
    outline: Position[] | null,
    velocity: Position,
    confidence: number,
    now: number,
  ): Position {
    if (!outline) {
      this.reset();
      return this.padding;
    }
    const width = Math.max(...outline.map((p) => p.x)) - Math.min(...outline.map((p) => p.x));
    const height = Math.max(...outline.map((p) => p.y)) - Math.min(...outline.map((p) => p.y));
    // Face-relative speed avoids triggering on tiny tracking jitter or ordinary slow movement.
    const speed =
      Math.hypot(velocity.x / Math.max(1, width), velocity.y / Math.max(1, height)) * 1000;
    this.active = confidence >= 0.5 && speed >= (this.active ? 0.9 : 1.5);
    const dt = this.previousTime === null ? 0 : Math.max(0, now - this.previousTime);
    this.previousTime = now;
    if (this.active) {
      this.padding = {
        x: Math.max(this.padding.x, Math.min(8, width * 0.05, Math.abs(velocity.x) * 6)),
        y: Math.max(this.padding.y, Math.min(8, height * 0.04, Math.abs(velocity.y) * 6)),
      };
      this.holdUntil = now + 100;
    } else if (now > this.holdUntil) {
      const releaseTime = Math.min(dt, now - this.holdUntil);
      const decay = Math.exp(-releaseTime / 120);
      this.padding = { x: this.padding.x * decay, y: this.padding.y * decay };
    }
    return {
      x: Math.ceil(this.padding.x < 0.5 ? 0 : this.padding.x),
      y: Math.ceil(this.padding.y < 0.5 ? 0 : this.padding.y),
    };
  }

  reset() {
    this.padding = { x: 0, y: 0 };
    this.previousTime = null;
    this.active = false;
    this.holdUntil = -Infinity;
  }
}
