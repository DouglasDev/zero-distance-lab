import { MotionCompensator } from './MotionCompensator.ts';
import { PerformanceMeter } from './TrackingPerformance.ts';
import type { GrayFrame } from './frameMotion.ts';
import type { Position } from '../../rendering/types.ts';
import type { TrackingRequest, TrackingResponse, TrackingStatus } from './trackingMessages.ts';

interface WorkerPort {
  onmessage: ((event: MessageEvent<TrackingResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: TrackingRequest, transfer?: Transferable[]): void;
  terminate(): void;
}
interface TrackerDependencies {
  worker: () => WorkerPort;
  bitmap: (canvas: HTMLCanvasElement, highDetail: boolean) => Promise<ImageBitmap>;
  assets: string;
  motionFrame?: (canvas: HTMLCanvasElement) => GrayFrame;
  now?: () => number;
}

/** One frame in flight, off-thread detection, and continuity through missed frames. */
export class FaceTracker {
  private motion = new MotionCompensator();
  private meter = new PerformanceMeter();
  private lastCameraFrame: number | null = null;
  private worker: WorkerPort | null = null;
  private ready = false;
  private busy = false;
  private misses = 0;
  private failed = false;
  private generation = 0;
  private lastFrame: number | null = null;
  private outline: Position[] | null = null;
  private timestamp = -Infinity;
  private status: TrackingStatus = 'off';
  private dependencies: TrackerDependencies;
  private onStatus: (status: TrackingStatus) => void;

  constructor(onStatus: (status: TrackingStatus) => void, dependencies: TrackerDependencies) {
    this.onStatus = onStatus;
    this.dependencies = dependencies;
  }

  private setStatus(status: TrackingStatus) {
    if (status !== this.status) {
      this.status = status;
      this.onStatus(status);
    }
  }

  private fail() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.busy = false;
    this.failed = true;
    this.generation++;
    this.setStatus('error');
  }

  private start() {
    try {
      const worker = this.dependencies.worker();
      this.worker = worker;
      this.setStatus('loading');
      worker.onmessage = ({ data }) => {
        if (worker !== this.worker) return;
        if (data.type === 'error') {
          this.fail();
          return;
        }
        if (data.type === 'ready') {
          this.ready = true;
          this.meter.backend = data.backend ?? 'unknown';
          this.setStatus('searching');
          return;
        }
        if (data.generation !== this.generation) return;
        this.busy = false;
        this.meter.result(
          this.dependencies.now?.() ?? performance.now(),
          data.timestamp,
          data.inferenceMs ?? 0,
          data.backend,
          Boolean(data.outline),
        );
        if (data.outline) {
          this.misses = 0;
          this.outline = data.outline;
          this.timestamp = data.timestamp;
          this.setStatus('tracking');
        } else {
          this.misses++;
          this.setStatus(this.outline ? 'holding' : 'searching');
        }
      };
      worker.onerror = () => {
        if (worker === this.worker) this.fail();
      };
      worker.postMessage({ type: 'init', assets: this.dependencies.assets });
    } catch {
      this.fail();
    }
  }

  update(canvas: HTMLCanvasElement, now: number, frameId = now) {
    if (frameId !== this.lastCameraFrame) {
      this.lastCameraFrame = frameId;
      this.meter.camera(now);
      if (this.dependencies.motionFrame) {
        // Use the last displayed position to choose textured points within the unmodified face.
        const region = this.motion.correct(this.outline, this.timestamp, now, false);
        this.motion.update(this.dependencies.motionFrame(canvas), region, now);
      }
    }
    if (!this.worker && !this.failed) this.start();
    if (!this.ready || !this.worker || this.busy || frameId === this.lastFrame) return;
    this.busy = true;
    this.lastFrame = frameId;
    const worker = this.worker,
      generation = this.generation,
      highDetail = this.misses >= 2;
    void Promise.resolve()
      .then(() => this.dependencies.bitmap(canvas, highDetail))
      .then((frame) => {
        if (worker !== this.worker || generation !== this.generation) {
          frame.close();
          return;
        }
        try {
          worker.postMessage({ type: 'frame', frame, timestamp: now, generation }, [frame]);
        } catch {
          frame.close();
          this.fail();
        }
      })
      .catch(() => {
        if (generation === this.generation) this.fail();
      });
  }

  face(now: number, predict = false) {
    if (now - this.timestamp > 300) {
      if (this.status === 'tracking') this.setStatus('holding');
    }
    return this.motion.correct(this.outline, this.timestamp, now, predict);
  }

  performance(now: number) {
    return this.meter.snapshot(now, this.motion.confidence);
  }

  restart() {
    const previousOutline = this.face(this.dependencies.now?.() ?? performance.now());
    this.stop();
    this.outline = previousOutline;
    if (previousOutline) this.setStatus('holding');
  }

  stop() {
    this.worker?.terminate();
    this.worker = null;
    this.generation++;
    this.ready = false;
    this.busy = false;
    this.failed = false;
    this.outline = null;
    this.timestamp = -Infinity;
    this.lastFrame = null;
    this.misses = 0;
    this.lastCameraFrame = null;
    this.motion.reset();
    this.meter.reset();
    this.setStatus('off');
  }
}
