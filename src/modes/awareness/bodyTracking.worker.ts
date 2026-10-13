import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { BodyRequest, BodyResponse } from './bodyMessages.ts';
let detector: PoseLandmarker | null = null;
let delegate: 'GPU' | 'CPU' = 'GPU';
let assets = '';
async function create() {
  const files = await FilesetResolver.forVisionTasks(`${assets}/wasm`, true);
  return PoseLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: `${assets}/pose_landmarker_lite.task`, delegate },
    ...(delegate === 'GPU' ? { canvas: new OffscreenCanvas(320, 180) } : {}),
    runningMode: 'VIDEO',
    numPoses: 1,
    outputSegmentationMasks: true,
  });
}
const send = (message: BodyResponse, transfer: Transferable[] = []) =>
  self.postMessage(message, { transfer });
self.onmessage = async ({ data }: MessageEvent<BodyRequest>) => {
  if (data.type === 'init') {
    assets = data.assets;
    try {
      try {
        detector = await create();
      } catch {
        delegate = 'CPU';
        detector = await create();
      }
      send({ type: 'ready' });
    } catch {
      send({ type: 'error' });
    }
    return;
  }
  try {
    if (!detector) throw new Error('Body tracker not ready');
    const consume = (result: import('@mediapipe/tasks-vision').PoseLandmarkerResult) => {
      const segmentation = result.segmentationMasks?.[0];
      const landmarks = result.landmarks[0];
      if (!segmentation || !landmarks) {
        send({ type: 'body', result: null, generation: data.generation });
        return;
      }
      const probabilities = segmentation.getAsFloat32Array();
      const mask = new Uint8Array(probabilities.length);
      for (let i = 0; i < mask.length; i++)
        mask[i] = Math.round(Math.max(0, Math.min(1, probabilities[i])) * 255);
      send(
        {
          type: 'body',
          generation: data.generation,
          result: {
            image: data.frame,
            pose: landmarks.map((p) => ({ x: p.x * 640, y: p.y * 360, visibility: p.visibility })),
            mask,
            width: segmentation.width,
            height: segmentation.height,
            timestamp: data.timestamp,
          },
        },
        [mask.buffer, data.frame],
      );
    };
    try {
      detector.detectForVideo(data.frame, data.timestamp, consume);
    } catch (error) {
      if (delegate === 'CPU') throw error;
      detector.close();
      delegate = 'CPU';
      detector = await create();
      detector.detectForVideo(data.frame, data.timestamp, consume);
    }
  } catch {
    send({ type: 'error' });
  } finally {
    data.frame.close();
  }
};
