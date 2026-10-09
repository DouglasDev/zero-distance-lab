# Zero Distance Lab

A local webcam experiment inspired by Tomas Peeters’s Observatories. Built with TypeScript, React, Linaria, and Phaser, starting from `codex-react-phaser-template`.

## Run

```sh
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1
```

Open the localhost URL printed by Vite in a laptop browser. Camera access requires localhost or HTTPS; an ordinary HTTP LAN address will not work. No backend or account is needed.

## Experiments

- **Headless mirror:** Start the webcam, choose “Capture empty room,” and leave the camera’s view during the three-second countdown. Return to your seat. Local face landmarks track your face's shape, position, scale, and tilt. The inset opening covers most of the face while retaining a visible band of its original edges. Adjust “Face edge width” and “Edge softness” to tune the seamless inward fade. There is no painted border. Keep the camera and room still for a convincing replacement. If tracking loses your face, the opening disappears; good lighting and facing the camera help.
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

Rendering runs at approximately 30 fps with a 640×360 camera frame and a 240×240 sphere lookup. Phone dual-camera support is outside this initial version. The experiment makes no claim to induce nondual experience.

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

MediaPipe Face Landmarker runs in an ES module worker, with one frame in flight and a target of up to 20 detections per second. Its 36-point face perimeter is taken from the same mirrored, cropped 640×360 canvas used for display, so the mask needs no separate coordinate correction. Results older than 300 ms are discarded. Tracking continues with a paused animation; demo mode follows the synthetic face without loading the model. Inactive modes and camera shutdown terminate the worker, and late results are ignored.

The model is checked in under `public/tracking/`. WebAssembly files are copied from the pinned dependency before `pnpm dev` and `pnpm build`. Both are served locally; face images and landmarks stay in browser memory. An ES module worker with WebAssembly SIMD and ImageBitmap support is required. A failed tracker shows a retry button instead of a misplaced mask.

The replacement uses an inset polygon with a cached, half-resolution distance-based alpha mask. Feathering is confined to the inside of that polygon, preserving the outer face band. Tests verify retained edges, partial blending, mask movement and disappearance, worker cancellation, throttling, and stale-result handling. Real webcam detection performance and alignment still require a manual browser check.
