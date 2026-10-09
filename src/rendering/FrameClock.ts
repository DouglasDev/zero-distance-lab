/** Limit draws to 30 fps; pause effect time without pausing camera updates. */
export class FrameClock {
  private lastFrame = -Infinity;
  time = 0;

  advance(now: number, motion: boolean) {
    if (now - this.lastFrame < 1000 / 30) return false;
    const step = Math.min(now - this.lastFrame, 100);
    this.lastFrame = now;
    if (motion) this.time += step;
    return true;
  }
}
