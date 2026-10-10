export interface TrackingPerformance {
  backend: 'GPU' | 'CPU' | 'unknown';
  cameraFps: number;
  detectionFps: number;
  inferenceMs: number;
  resultAgeMs: number | null;
  motionConfidence: number;
}

export class PerformanceMeter {
  backend: TrackingPerformance['backend'] = 'unknown';
  private cameras: number[] = [];
  private detections: number[] = [];
  private inference = 0;
  private capture: number | null = null;
  camera(now: number) {
    this.cameras.push(now);
    this.cameras = this.cameras.filter((t) => now - t <= 1500);
  }
  result(now: number, capture: number, inference: number, backend?: 'GPU' | 'CPU', matched = true) {
    if (matched) {
      this.detections.push(now);
      this.detections = this.detections.filter((t) => now - t <= 1500);
      this.capture = capture;
    }
    this.inference = inference;
    if (backend) this.backend = backend;
  }
  private fps(times: number[], now: number) {
    const recent = times.filter((t) => now - t <= 1500);
    return recent.length < 2 ? 0 : ((recent.length - 1) * 1000) / (recent.at(-1)! - recent[0]);
  }
  snapshot(now: number, confidence: number): TrackingPerformance {
    return {
      backend: this.backend,
      cameraFps: this.fps(this.cameras, now),
      detectionFps: this.fps(this.detections, now),
      inferenceMs: this.inference,
      resultAgeMs: this.capture === null ? null : Math.max(0, now - this.capture),
      motionConfidence: confidence,
    };
  }
  reset() {
    this.backend = 'unknown';
    this.cameras = [];
    this.detections = [];
    this.capture = null;
    this.inference = 0;
  }
}
