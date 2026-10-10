import type { TrackingPerformance } from './TrackingPerformance';
import { Note } from '../../ui/controls';

export function PerformanceDetails({ metrics }: { metrics: TrackingPerformance | null }) {
  if (!metrics) return null;
  return (
    <details style={{ marginTop: 20 }}>
      <summary>Tracking performance</summary>
      <Note>
        Camera: {metrics.cameraFps.toFixed(0)} fps
        <br />
        Face detections: {metrics.detectionFps.toFixed(0)} per second
        <br />
        Acceleration: {metrics.backend}
        <br />
        Last detection: {metrics.inferenceMs.toFixed(0)} ms
        <br />
        Landmark age:{' '}
        {metrics.resultAgeMs === null ? 'waiting' : `${metrics.resultAgeMs.toFixed(0)} ms`}
        <br />
        Motion match: {Math.round(metrics.motionConfidence * 100)}%
      </Note>
    </details>
  );
}
