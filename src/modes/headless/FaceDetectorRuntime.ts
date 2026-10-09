import type { Position } from '../../rendering/types.ts';

interface Detector {
  detectForVideo(frame: ImageBitmap, timestamp: number): { faceLandmarks: Position[][] };
  close(): void;
}
type Delegate = 'GPU' | 'CPU';

/** Fall back both when GPU initialization fails and when the first inference fails. */
export class FaceDetectorRuntime {
  private detector: Detector | null = null;
  private delegate: Delegate = 'GPU';
  private create: (delegate: Delegate) => Promise<Detector>;

  constructor(create: (delegate: Delegate) => Promise<Detector>) {
    this.create = create;
  }

  async initialize() {
    try {
      this.detector = await this.create('GPU');
    } catch {
      this.delegate = 'CPU';
      this.detector = await this.create('CPU');
    }
  }

  async detect(frame: ImageBitmap, timestamp: number) {
    if (!this.detector) throw new Error('Face tracker is not ready.');
    try {
      return this.detector.detectForVideo(frame, timestamp);
    } catch (error) {
      if (this.delegate === 'CPU') throw error;
      this.detector.close();
      this.delegate = 'CPU';
      this.detector = await this.create('CPU');
      return this.detector.detectForVideo(frame, timestamp);
    }
  }
}
