import { combinedTrackingStatus } from '../modes/awareness/trackingStatus.ts';
import { BodyTracker } from '../modes/awareness/BodyTracker.ts';
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
  private lastTracking: TrackingStatus = 'off';
  private sampler = new MotionFrameSampler();
  private tracker: FaceTracker;
  private bodyTracker: BodyTracker;
  private readState: () => SceneState;
  private readVideo: () => HTMLVideoElement | null;

  constructor(readState: () => SceneState, readVideo: () => HTMLVideoElement | null) {
    super('experiment');
    this.readState = readState;
    this.readVideo = readVideo;
    const assets = new URL(`${import.meta.env.BASE_URL}tracking`, window.location.href).href;
    this.bodyTracker = new BodyTracker(() => {}, {
      worker: () =>
        new Worker(new URL('../modes/awareness/bodyTracking.worker.ts', import.meta.url), {
          type: 'module',
        }),
      bitmap: (canvas) =>
        createImageBitmap(canvas, { resizeWidth: 320, resizeHeight: 180, resizeQuality: 'low' }),
      assets,
    });
    this.tracker = new FaceTracker(() => {}, {
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
      assets,
    });
  }

  create() {
    this.texture = this.textures.createCanvas('effect', WIDTH, HEIGHT);
    this.add.image(0, 0, 'effect').setOrigin(0);
  }

  retryTracking() {
    this.tracker.restart();
    this.bodyTracker.restart();
  }

  dispose() {
    this.tracker.stop();
    this.bodyTracker.stop();
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
      !this.clock.advance(
        now,
        settings.motion,
        settings.mode === 'headless' || settings.mode === 'awareness' ? 60 : 30,
      )
    )
      return;
    this.effectRenderer.updateSource(this.readVideo(), settings.demo, this.clock.time);
    const video = this.readVideo();
    const nowForTracking = performance.now();
    const live = !settings.demo && video && video.readyState >= 2 && video.srcObject;
    const needsBody =
      settings.mode === 'awareness' &&
      (settings.projectionVariant === 'body' || settings.projectionVariant === 'deity');
    const needsFace =
      settings.mode === 'headless' ||
      (settings.mode === 'awareness' && settings.projectionVariant !== 'body');
    if (live && needsFace)
      this.tracker.update(
        this.effectRenderer.source.canvas,
        nowForTracking,
        video.currentTime,
        settings.mode === 'awareness',
      );
    else this.tracker.stop();
    if (live && needsBody)
      this.bodyTracker.update(this.effectRenderer.source.canvas, nowForTracking, video.currentTime);
    else this.bodyTracker.stop();
    this.effectRenderer.headless.setFace(
      settings.mode === 'headless' && live
        ? this.tracker.face(nowForTracking, settings.facePrediction)
        : null,
      settings.mode === 'headless' && live
        ? this.tracker.openingPadding(nowForTracking)
        : { x: 0, y: 0 },
    );
    this.effectRenderer.awareness.setTracking(
      settings.mode === 'awareness' && live ? this.tracker.features(nowForTracking) : null,
      settings.mode === 'awareness' && live ? this.bodyTracker.body(nowForTracking) : null,
    );
    const status = live
      ? combinedTrackingStatus(
          this.tracker.trackingStatus,
          this.bodyTracker.trackingStatus,
          needsFace,
          needsBody,
        )
      : 'off';
    if (status !== this.lastTracking) {
      this.lastTracking = status;
      this.readState().onTracking(status);
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
