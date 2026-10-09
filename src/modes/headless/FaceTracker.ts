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
  bitmap: (canvas: HTMLCanvasElement) => Promise<ImageBitmap>;
  assets: string;
}

/** One frame in flight, off-thread detection, and continuity through missed frames. */
export class FaceTracker {
  private worker: WorkerPort | null = null;
  private ready = false;
  private busy = false;
  private failed = false;
  private generation = 0;
  private lastRequest = -Infinity;
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
          this.setStatus('searching');
          return;
        }
        if (data.generation !== this.generation) return;
        this.busy = false;
        if (data.outline) {
          this.outline = data.outline;
          this.timestamp = data.timestamp;
          this.setStatus('tracking');
        } else {
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

  update(canvas: HTMLCanvasElement, now: number) {
    if (!this.worker && !this.failed) this.start();
    if (!this.ready || !this.worker || this.busy || now - this.lastRequest < 50) return;
    this.busy = true;
    this.lastRequest = now;
    const worker = this.worker,
      generation = this.generation;
    void Promise.resolve()
      .then(() => this.dependencies.bitmap(canvas))
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

  face(now: number) {
    if (now - this.timestamp > 300) {
      if (this.status === 'tracking') this.setStatus('holding');
    }
    return this.outline;
  }

  restart() {
    const previousOutline = this.outline;
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
    this.lastRequest = -Infinity;
    this.setStatus('off');
  }
}
