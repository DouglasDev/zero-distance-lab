# Zero Distance Lab

A local webcam experiment inspired by Tomas Peeters’s Observatories. Built with TypeScript, React, Linaria, and Phaser, starting from `codex-react-phaser-template`.

## Run

```sh
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1
```

Open the localhost URL printed by Vite in a laptop browser. Camera access requires localhost or HTTPS; an ordinary HTTP LAN address will not work. No backend or account is needed.

## Experiments

- **Headless mirror:** Start the webcam, choose “Capture empty room,” and leave the camera’s view during the three-second countdown. Return to your seat and align your face with the circular opening. Adjust its size, drag it, or use the position sliders. Keep the camera and background still for a convincing replacement. This is a fixed aperture, not face tracking or automatic head segmentation.
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

The rendering tests use Node.js 24 or newer and a native canvas implementation to check background replacement, sphere inversion, and a stable center. Browser camera permission, playback, dragging, and fullscreen still require a manual browser check.

Rendering runs at approximately 30 fps with a 640×360 camera frame and a 240×240 sphere lookup. Phone dual-camera support is outside this initial version. The experiment makes no claim to induce nondual experience.

## Development structure

- `src/App.tsx` coordinates the camera, selected mode, settings, and page layout.
- `src/modes/` contains each mode's controls and effect implementation. Headless capture state and countdown live with the headless mode. Mode controls stay mounted while inactive so captured-background state survives switching experiments.
- `src/ui/controls.tsx` contains shared styled controls and the range input.
- `src/rendering/EffectRenderer.ts` owns the frame source and delegates to the selected effect through a common interface.
- `src/rendering/ExperimentScene.ts` owns Phaser scheduling and pointer input. `PhaserCanvas.tsx` only bridges React mounting, cleanup, and capture commands.
- `src/rendering/canvas.ts`, `FrameSource.ts`, and `demo.ts` contain reusable drawing helpers and source preparation.
- `useCamera.ts` and `useFullscreen.ts` own browser resource and fullscreen lifecycles.

Run `pnpm format` after edits. Husky checks formatting and TypeScript before each commit. Run `pnpm test` for rendering and scheduling regressions. See `AGENTS.md` for the inherited template conventions.
