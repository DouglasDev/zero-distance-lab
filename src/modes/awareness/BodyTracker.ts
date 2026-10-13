import type { TrackingStatus } from '../headless/trackingMessages.ts';
import type { BodyFrame, BodyRequest, BodyResponse } from './bodyMessages.ts';
interface Port {
  onmessage: ((event: MessageEvent<BodyResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(data: BodyRequest, transfer?: Transferable[]): void;
  terminate(): void;
}
interface Dependencies {
  worker: () => Port;
  bitmap: (canvas: HTMLCanvasElement) => Promise<ImageBitmap>;
  assets: string;
}
/** One body snapshot in flight. Results and workers are owned by the current camera session. */
export class BodyTracker {
  private worker: Port | null = null;
  private ready = false;
  private busy = false;
  private failed = false;
  private generation = 0;
  private lastFrame: number | null = null;
  private result: BodyFrame | null = null;
  private status: TrackingStatus = 'off';
  private onStatus: (status: TrackingStatus) => void;
  private dependencies: Dependencies;
  constructor(onStatus: (status: TrackingStatus) => void, dependencies: Dependencies) {
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
        if (worker !== this.worker) {
          if (data.type === 'body') data.result?.image?.close();
          return;
        }
        if (data.type === 'error') {
          this.fail();
          return;
        }
        if (data.type === 'ready') {
          this.ready = true;
          this.setStatus('searching');
          return;
        }
        if (data.generation !== this.generation) {
          data.result?.image?.close();
          return;
        }
        this.busy = false;
        this.result?.image?.close();
        if (data.result) {
          this.result = data.result;
          this.setStatus('tracking');
        } else {
          this.result = null;
          this.setStatus('searching');
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
  update(canvas: HTMLCanvasElement, now: number, frameId: number) {
    if (!this.worker && !this.failed) this.start();
    if (!this.ready || !this.worker || this.busy || frameId === this.lastFrame) return;
    const worker = this.worker,
      generation = this.generation;
    this.busy = true;
    this.lastFrame = frameId;
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
  get trackingStatus() {
    return this.status;
  }

  body(now: number) {
    if (this.result && now - this.result.timestamp >= 300) {
      if (this.status === 'tracking') this.setStatus('searching');
      return null;
    }
    return this.result;
  }
  restart() {
    this.stop();
  }
  stop() {
    this.worker?.terminate();
    this.worker = null;
    this.generation++;
    this.ready = false;
    this.busy = false;
    this.failed = false;
    this.lastFrame = null;
    this.result?.image?.close();
    this.result = null;
    this.setStatus('off');
  }
}
