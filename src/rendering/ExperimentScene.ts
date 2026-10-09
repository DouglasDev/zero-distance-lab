import * as Phaser from 'phaser';
import { EffectRenderer } from './EffectRenderer.ts';
import { FrameClock } from './FrameClock.ts';
import { WIDTH, HEIGHT, type Mode, type Settings } from './types.ts';

export interface SceneState {
  settings: Settings;
  onPosition: (x: number, y: number) => void;
}

export class ExperimentScene extends Phaser.Scene {
  readonly effectRenderer = new EffectRenderer();
  private clock = new FrameClock();
  private texture: Phaser.Textures.CanvasTexture | null = null;
  private draggingMode: Mode | null = null;
  private readState: () => SceneState;
  private readVideo: () => HTMLVideoElement | null;

  constructor(readState: () => SceneState, readVideo: () => HTMLVideoElement | null) {
    super('experiment');
    this.readState = readState;
    this.readVideo = readVideo;
  }

  create() {
    this.texture = this.textures.createCanvas('effect', WIDTH, HEIGHT);
    this.add.image(0, 0, 'effect').setOrigin(0);
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const { settings } = this.readState();
      const effect = this.effectRenderer.activeEffect(settings.mode);
      this.draggingMode = effect.containsPoint?.(settings, pointer) ? settings.mode : null;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const { settings, onPosition } = this.readState();
      if (!pointer.isDown || this.draggingMode !== settings.mode) return;
      const position = this.effectRenderer.activeEffect(settings.mode).positionAtPoint?.(pointer);
      if (position) onPosition(position.x, position.y);
    });
    this.input.on('pointerup', () => {
      this.draggingMode = null;
    });
    this.input.on('gameout', () => {
      this.draggingMode = null;
    });
  }

  capture() {
    const { settings } = this.readState();
    this.effectRenderer.updateSource(this.readVideo(), settings.demo, this.clock.time);
    this.effectRenderer.capture(settings.demo);
    return true;
  }

  update(now: number) {
    const { settings } = this.readState();
    if (this.draggingMode !== settings.mode) this.draggingMode = null;
    if (!this.texture || !this.clock.advance(now, settings.motion)) return;
    this.effectRenderer.updateSource(this.readVideo(), settings.demo, this.clock.time);
    this.effectRenderer.render(this.texture.getContext(), settings, this.clock.time);
    this.texture.refresh();
  }
}
