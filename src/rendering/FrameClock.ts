/** Limit draws to the requested rate; pause effect time without pausing camera updates. */
export class FrameClock {
  private lastFrame = -Infinity;
  time = 0;

  advance(now: number, motion: boolean, fps = 30) {
    if (now - this.lastFrame < 1000 / fps - 0.5) return false;
    const step = Math.min(now - this.lastFrame, 100);
    this.lastFrame = now;
    if (motion) this.time += step;
    return true;
  }
}
