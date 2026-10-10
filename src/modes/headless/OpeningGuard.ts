import type { Position } from '../../rendering/types.ts';

/** Grow immediately for motion/uncertainty; release slowly to avoid exposing features on a stop. */
export class OpeningGuard {
  private padding: Position = { x: 0, y: 0 };
  private previousTime: number | null = null;

  update(
    outline: Position[] | null,
    velocity: Position,
    confidence: number,
    landmarkAge: number,
    missed: boolean,
    now: number,
  ): Position {
    if (!outline) {
      this.reset();
      return this.padding;
    }
    const width = Math.max(...outline.map((p) => p.x)) - Math.min(...outline.map((p) => p.x));
    const height = Math.max(...outline.map((p) => p.y)) - Math.min(...outline.map((p) => p.y));
    const weak = confidence < 0.5 ? 0.1 : 0;
    const stale = Math.min(0.1, Math.max(0, landmarkAge - 100) / 2000);
    const uncertain = Math.max(weak, stale, missed ? 0.12 : 0);
    // Both sides need room: an advanced center can reveal the trailing eye during a reversal.
    const target = {
      x: Math.min(width * 0.25, Math.abs(velocity.x) * 24 + width * uncertain),
      y: Math.min(height * 0.22, Math.abs(velocity.y) * 24 + height * uncertain),
    };
    const dt = this.previousTime === null ? 0 : Math.max(0, now - this.previousTime);
    const decay = Math.exp(-dt / 180);
    this.previousTime = now;
    this.padding = {
      x: Math.max(target.x, this.padding.x * decay),
      y: Math.max(target.y, this.padding.y * decay),
    };
    // Pixel steps keep a steady opening's mask cached between camera frames.
    return {
      x: Math.ceil(this.padding.x < 0.5 ? 0 : this.padding.x),
      y: Math.ceil(this.padding.y < 0.5 ? 0 : this.padding.y),
    };
  }

  reset() {
    this.padding = { x: 0, y: 0 };
    this.previousTime = null;
  }
}
