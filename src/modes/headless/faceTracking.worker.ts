import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { faceOutline } from './faceOutline';
import type { TrackingRequest, TrackingResponse } from './trackingMessages';

let detector: FaceLandmarker | null = null;
const send = (message: TrackingResponse) => self.postMessage(message);

self.onmessage = async (event: MessageEvent<TrackingRequest>) => {
  const message = event.data;
  if (message.type === 'init') {
    try {
      // MediaPipe 1.1's module loader supports ES module workers.
      const files = await FilesetResolver.forVisionTasks(`${message.assets}/wasm`, true);
      detector = await FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: `${message.assets}/face_landmarker.task`, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      send({ type: 'ready' });
    } catch {
      send({ type: 'error' });
    }
    return;
  }
  try {
    if (!detector) throw new Error('Face tracker is not ready.');
    const landmarks = detector.detectForVideo(message.frame, message.timestamp).faceLandmarks[0];
    send({
      type: 'face',
      outline: landmarks ? faceOutline(landmarks) : null,
      timestamp: message.timestamp,
      generation: message.generation,
    });
  } catch {
    send({ type: 'error' });
  } finally {
    message.frame.close();
  }
};
