import { MotionFrameSampler } from '../modes/headless/MotionFrameSampler';
import type { TrackingPerformance } from '../modes/headless/TrackingPerformance';
import * as Phaser from 'phaser';
import { EffectRenderer } from './EffectRenderer.ts';
import { FrameClock } from './FrameClock.ts';
import { FaceTracker } from '../modes/headless/FaceTracker';
import type { TrackingStatus } from '../modes/headless/trackingMessages';
import { WIDTH, HEIGHT, type Settings } from './types.ts';

export interface SceneState {
  settings: Settings;
  onPerformance: (metrics: TrackingPerformance | null) => void;
  onTracking: (status: TrackingStatus) => void;
}

export class ExperimentScene extends Phaser.Scene {
  readonly effectRenderer = new EffectRenderer();
  private clock = new FrameClock();
  private texture: Phaser.Textures.CanvasTexture | null = null;
  private lastPerformance = -Infinity;
  private sampler = new MotionFrameSampler();
  private tracker: FaceTracker;
  private readState: () => SceneState;
  private readVideo: () => HTMLVideoElement | null;

  constructor(readState: () => SceneState, readVideo: () => HTMLVideoElement | null) {
    super('experiment');
    this.readState = readState;
    this.readVideo = readVideo;
    this.tracker = new FaceTracker((status) => this.readState().onTracking(status), {
      worker: () =>
        new Worker(new URL('../modes/headless/faceTracking.worker.ts', import.meta.url), {
          type: 'module',
        }),
      bitmap: (canvas, highDetail) =>
        createImageBitmap(canvas, {
          resizeWidth: highDetail ? 640 : 320,
          resizeHeight: highDetail ? 360 : 180,
          resizeQuality: 'low',
        }),
      motionFrame: (canvas) => this.sampler.capture(canvas),
      assets: new URL(`${import.meta.env.BASE_URL}tracking`, window.location.href).href,
    });
  }

  create() {
    this.texture = this.textures.createCanvas('effect', WIDTH, HEIGHT);
    this.add.image(0, 0, 'effect').setOrigin(0);
  }

  retryTracking() {
    this.tracker.restart();
  }

  dispose() {
    this.tracker.stop();
  }

  capture() {
    const { settings } = this.readState();
    this.effectRenderer.updateSource(this.readVideo(), settings.demo, this.clock.time);
    this.effectRenderer.capture(settings.demo);
    return true;
  }

  update(now: number) {
    const { settings } = this.readState();
    if (
      !this.texture ||
      !this.clock.advance(now, settings.motion, settings.mode === 'headless' ? 60 : 30)
    )
      return;
    this.effectRenderer.updateSource(this.readVideo(), settings.demo, this.clock.time);
    const video = this.readVideo();
    const nowForTracking = performance.now();
    if (
      settings.mode === 'headless' &&
      !settings.demo &&
      video &&
      video.readyState >= 2 &&
      video.srcObject
    ) {
      this.tracker.update(this.effectRenderer.source.canvas, nowForTracking, video.currentTime);
      this.effectRenderer.headless.setFace(
        this.tracker.face(nowForTracking, settings.facePrediction),
        this.tracker.openingPadding(nowForTracking),
      );
    } else {
      this.tracker.stop();
      this.effectRenderer.headless.setFace(null);
    }
    if (nowForTracking - this.lastPerformance >= 500) {
      this.lastPerformance = nowForTracking;
      this.readState().onPerformance(
        settings.demo || settings.mode !== 'headless'
          ? null
          : this.tracker.performance(nowForTracking),
      );
    }
    this.effectRenderer.render(this.texture.getContext(), settings, this.clock.time);
    this.texture.refresh();
  }
}
