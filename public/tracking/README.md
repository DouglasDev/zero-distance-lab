# Local face-tracking assets

`face_landmarker.task` is the official Google MediaPipe Face Landmarker float16 model, version 1:
https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task

The WebAssembly runtime is copied from the pinned `@mediapipe/tasks-vision` dependency by `pnpm face-assets`, automatically before development and production builds. Generated runtime files are ignored by Git. The package is licensed Apache-2.0.

The browser loads both the model and runtime from this application's own origin. Camera frames are processed locally in a worker; no frames or landmarks are sent to a server.
