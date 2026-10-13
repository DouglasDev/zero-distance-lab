export type Mode = 'headless' | 'sphere' | 'still' | 'awareness';
export type ProjectionVariant = 'face' | 'faces' | 'eyes' | 'body' | 'deity';
export interface Settings {
  projectionVariant: ProjectionVariant;
  projectionEnvironment: 'temple' | 'room';
  projectionSize: number;
  projectionOpacity: number;
  projectionBlend: 'source-over' | 'screen' | 'soft-light';
  mode: Mode;
  radius: number;
  facePrediction: boolean;
  faceCoverage: number;
  faceFeather: number;
  motion: boolean;
  amount: number;
  demo: boolean;
}
export const WIDTH = 960;
export const HEIGHT = 540;
export const SOURCE_WIDTH = 640;
export const SOURCE_HEIGHT = 360;

export interface SourceFrame {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}
export interface Position {
  x: number;
  y: number;
}
export interface Effect {
  render(
    context: CanvasRenderingContext2D,
    source: SourceFrame,
    settings: Settings,
    time: number,
  ): void;
}
