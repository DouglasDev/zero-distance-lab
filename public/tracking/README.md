# Local face-tracking assets

`face_landmarker.task` is the official Google MediaPipe Face Landmarker float16 model, version 1:
https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task

The WebAssembly runtime is copied from the pinned `@mediapipe/tasks-vision` dependency by `pnpm face-assets`, automatically before development and production builds. Generated runtime files are ignored by Git. The package is licensed Apache-2.0.

The browser loads both the model and runtime from this application's own origin. Camera frames are processed locally in a worker; no frames or landmarks are sent to a server.

Body tracking uses the official Pose Landmarker Lite model, downloaded from:
https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task

SHA-256: `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`. Served locally; no camera frames are uploaded.
