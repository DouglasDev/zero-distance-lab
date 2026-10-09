import { createSurface, drawMirroredVideo } from './canvas.ts';
import { drawDemoFrame } from './demo.ts';
import { SOURCE_WIDTH, SOURCE_HEIGHT, type SourceFrame } from './types.ts';

export class FrameSource implements SourceFrame {
  private surface = createSurface(SOURCE_WIDTH, SOURCE_HEIGHT, true);
  readonly canvas = this.surface.canvas;
  readonly context = this.surface.context;

  update(video: HTMLVideoElement | null, demo: boolean, time: number) {
    if (demo) {
      drawDemoFrame(this.context, time);
      return;
    }
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      this.context.fillStyle = '#111917';
      this.context.fillRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);
      return;
    }
    drawMirroredVideo(this.context, video, SOURCE_WIDTH, SOURCE_HEIGHT);
  }
}
