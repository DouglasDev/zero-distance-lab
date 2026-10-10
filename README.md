# Zero Distance Lab

A local webcam experiment inspired by Tomas Peeters’s Observatories. Built with TypeScript, React, Linaria, and Phaser, starting from `codex-react-phaser-template`.

## Run

```sh
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1
```

Open the localhost URL printed by Vite in a laptop browser. Camera access requires localhost or HTTPS; an ordinary HTTP LAN address will not work. No backend or account is needed.

## Experiments

- **Headless mirror:** Start the webcam, choose “Capture empty room,” and leave the camera’s view during the three-second countdown. Return to your seat. Local face landmarks track your face's shape, position, scale, and tilt. The inset opening covers most of the face while retaining a visible band of its original edges. Adjust “Face edge width” and “Edge softness” to tune the seamless inward fade. There is no painted border. Keep the camera and room still for a convincing replacement. If tracking loses your face, the opening holds the last known shape and position until detection resumes; good lighting and facing the camera help.
- **Glass sphere:** The mirrored camera image is inverted in both axes and radially warped inside a shaded circle. This approximates the appearance of a ball lens; it is not a measured optical simulation.
- **Still center:** A live upright center remains spatially stable while the surrounding enlarged view and rings oscillate. “Pause motion” stops the animation without stopping the webcam.

“Use demo” releases the webcam and shows a synthetic person and room. All three modes work in demo mode. “Capture demo room” uses the clean synthetic room immediately. Fullscreen can be exited with Escape.

## Privacy and lifecycle

Frames and the single captured background stay in memory in the browser. The application does not upload images, record video, use analytics, or persist camera images. Stopping the webcam or changing sources clears the captured background. Closing the page releases the stream. A camera permission request that finishes after cancellation immediately releases its stream.

## Validation

```sh
pnpm format:check
pnpm test
pnpm typecheck
pnpm build
```

The rendering tests use Node.js 24 or newer and a native canvas implementation to check background replacement, sphere inversion, and a stable center. Browser camera permission, playback, live face detection, and fullscreen still require a manual browser check.

Headless rendering targets 60 fps; the other modes target 30 fps. The webcam requests up to 60 fps at 640×360, subject to camera capabilities. The sphere uses a 240×240 lookup. Phone dual-camera support is outside this initial version. The experiment makes no claim to induce nondual experience.

## Development structure

- `src/App.tsx` coordinates the camera, selected mode, settings, and page layout.
- `src/modes/` contains each mode's controls and effect implementation. Headless capture state and countdown live with the headless mode. Mode controls stay mounted while inactive so captured-background state survives switching experiments.
- `src/ui/controls.tsx` contains shared styled controls and the range input.
- `src/rendering/EffectRenderer.ts` owns the frame source and delegates to the selected effect through a common interface.
- `src/rendering/ExperimentScene.ts` owns Phaser scheduling and face-tracker lifecycle. `PhaserCanvas.tsx` only bridges React mounting, cleanup, and capture commands.
- `src/rendering/canvas.ts`, `FrameSource.ts`, and `demo.ts` contain reusable drawing helpers and source preparation.
- `useCamera.ts` and `useFullscreen.ts` own browser resource and fullscreen lifecycles.

Run `pnpm format` after edits. Husky checks formatting and TypeScript before each commit. Run `pnpm test` for rendering and scheduling regressions. See `AGENTS.md` for the inherited template conventions.

## Face tracking

MediaPipe Face Landmarker runs in an ES module worker, with one frame in flight, no artificial cooldown, and duplicate decoded camera frames skipped. It tries GPU acceleration and falls back to CPU on initialization or inference failure. A 320×180 snapshot reduces transfer and preprocessing costs while the display keeps the mirrored, cropped 640×360 frame. After two missed matches, snapshots temporarily use full resolution to help reacquire difficult side views; matching restores the smaller, faster input. Normalized landmark coordinates map back to that display frame, so resizing does not shift the opening. Actual tracking throughput depends on camera and device performance. After 300 ms without a fresh match, tracking reports that it is holding the last position; the mask stays visible. Missed detections and tracker errors also preserve the last contour. Retry preserves it while a new worker loads; stopping the camera or changing modes clears it. Tracking continues with a paused animation; demo mode follows the synthetic face without loading the model. Inactive modes and camera shutdown terminate the worker, and late results are ignored.

The model is checked in under `public/tracking/`. WebAssembly files are copied from the pinned dependency before `pnpm dev` and `pnpm build`. Both are served locally; face images and landmarks stay in browser memory. An ES module worker with WebAssembly SIMD and ImageBitmap support is required. A failed tracker shows a retry button and holds any last known mask.

The replacement uses an inset polygon with a cached, half-resolution distance-based alpha mask. Scanline filling and precomputed nearby edges avoid expensive distance calculations throughout the whole face. The default opening covers 95% of the detected face contour. Feathering is confined to the inside of that polygon, preserving the outer face band. Tests verify retained edges, partial blending, mask movement and continuity through missed detections, worker cancellation, duplicate-frame suppression, GPU fallback, and held-result recovery. Real webcam detection performance and alignment still require a manual browser check.

For side views, the opening includes projected nose and lip landmarks as well as the face oval. A turn-dependent silhouette margin prevents inset and feathering from leaving the protruding nose or mouth visible. Frontal views keep their original oval and retained rim. Near-full profiles can still exceed the model's detection capabilities; when no new landmarks arrive, the opening keeps the last known position rather than claiming to follow an unseen face.

### Motion compensation and timing

Between landmark results, a sparse two-level patch tracker measures translation in a 160×90 grayscale view of the unmodified face. Consistent matches move the opening on each new camera frame while the landmark worker continues independently. Capture-time motion history brings delayed model results forward to the current frame; new landmarks still correct shape, scale, and rotation. Weak or inconsistent matches add no motion, and after 500 ms without fresh landmarks the last opening freezes to limit drift.

Motion prediction is enabled by default, with a six-millisecond lead capped at eight source pixels or 4% of face width. It only applies to recent, confident movement and can be disabled in Headless mirror if it overshoots. This reduces displayed lag without raising the model's inference rate. The collapsed Tracking performance panel reports observed camera updates, successful detections, worker inference time, landmark age, acceleration backend, and motion match confidence. Camera fps measures decoded frames observed by the render loop; landmark age includes snapshot, queue, and inference delays but does not measure the camera hardware's exposure latency. Metrics refresh twice a second and remain local.

The opening also expands in both directions during fast movement or uncertain tracking, independently of the prediction toggle. Extra coverage grows immediately and shrinks over roughly 180 ms after motion settles, keeping a cushion through stops and reversals. Missed detections retain an expanded opening around the held position. Padding is capped relative to face size; it deliberately erases some outer facial edges during difficult tracking. Feathering stays inside the expanded boundary at its original width. This is a bounded coverage cushion, not a guarantee for a face that moves beyond the held position during prolonged detection loss.
