import type { TrackingPerformance } from './modes/headless/TrackingPerformance';
import { useEffect, useRef, useState } from 'react';
import {
  Page,
  Header,
  Layout,
  Modes,
  Stage,
  Overlay,
  StageFooter,
  Panel,
  Alert,
} from './App.styles';
import { PhaserCanvas, type CanvasHandle } from './PhaserCanvas';
import { type Mode, type Settings } from './rendering/types';
import { modes } from './modes/registry';
import { Actions, Button, Note } from './ui/controls';
import { useFullscreen } from './useFullscreen';
import { useCamera } from './useCamera';
import type { TrackingStatus } from './modes/headless/trackingMessages';

const initial: Settings = {
  mode: 'headless',
  radius: 0.19,
  facePrediction: true,
  faceCoverage: 0.95,
  faceFeather: 0.08,
  motion: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  amount: 0.65,
  demo: true,
};

export function App() {
  const camera = useCamera();
  const [performanceMetrics, setPerformanceMetrics] = useState<TrackingPerformance | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('off');
  const [settings, setSettings] = useState(initial);
  const [countdown, setCountdown] = useState<number | null>(null);
  const canvas = useRef<CanvasHandle>(null);
  const stage = useRef<HTMLDivElement>(null);
  const screen = useFullscreen(stage);
  const patch = (values: Partial<Settings>) =>
    setSettings((previous) => ({ ...previous, ...values }));

  useEffect(() => {
    if (camera.status === 'on') setSettings((previous) => ({ ...previous, demo: false }));
    if (camera.status === 'off') setSettings((previous) => ({ ...previous, demo: true }));
  }, [camera.status]);

  function chooseMode(mode: Mode) {
    setCountdown(null);
    setSettings((previous) => ({
      ...previous,
      mode,
      radius: mode === 'sphere' ? Math.min(previous.radius, 0.26) : previous.radius,
    }));
  }

  return (
    <Page>
      <Header>
        <div>
          <h1>Zero Distance Lab</h1>
          <p>Three small experiments in seeing.</p>
        </div>
        <Actions>
          {camera.status === 'off' ? (
            <Button data-primary="true" onClick={() => void camera.start()}>
              Start webcam
            </Button>
          ) : (
            <Button onClick={camera.stop}>
              {camera.status === 'requesting' ? 'Cancel camera request' : 'Stop webcam'}
            </Button>
          )}
          <Button
            onClick={() => {
              camera.stop();
              patch({ demo: true });
            }}
            disabled={settings.demo && camera.status === 'off'}
          >
            Use demo
          </Button>
        </Actions>
      </Header>
      {camera.error && <Alert role="alert">{camera.error}</Alert>}
      {screen.error && <Alert role="alert">{screen.error}</Alert>}
      <Layout>
        <section aria-label="Experiment">
          <Modes aria-label="Choose an experiment">
            {modes.map((mode) => (
              <button
                key={mode.id}
                aria-pressed={settings.mode === mode.id}
                onClick={() => chooseMode(mode.id)}
              >
                {mode.title}
              </button>
            ))}
          </Modes>
          <Stage ref={stage}>
            <PhaserCanvas
              ref={canvas}
              settings={settings}
              video={camera.video}
              onTracking={setTrackingStatus}
              onPerformance={setPerformanceMetrics}
            />
            {countdown !== null && (
              <Overlay role="status">
                <span>Move out of view</span>
                <strong>{countdown}</strong>
              </Overlay>
            )}
            {camera.status === 'requesting' && (
              <Overlay role="status">
                <span>Waiting for camera permission…</span>
              </Overlay>
            )}
          </Stage>
          <StageFooter>
            <span aria-live="polite">
              {camera.status === 'requesting'
                ? 'Camera request pending'
                : settings.demo
                  ? 'Demo · no webcam in use'
                  : 'Webcam · mirrored live view'}
            </span>
            {document.fullscreenEnabled && (
              <Button onClick={() => void screen.toggle()}>
                {screen.fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              </Button>
            )}
          </StageFooter>
          <Note>
            Camera images stay in this browser. Nothing is uploaded or recorded. Stop webcam
            releases the camera and clears the captured background.
          </Note>
        </section>
        <Panel>
          {modes.map(({ id, Controls }) => (
            <div key={id} hidden={settings.mode !== id}>
              <Controls
                settings={settings}
                patch={patch}
                reset={() =>
                  setSettings((previous) => ({
                    ...initial,
                    mode: previous.mode,
                    demo: previous.demo,
                  }))
                }
                active={settings.mode === id}
                canvas={canvas}
                cameraStatus={camera.status}
                onCountdown={setCountdown}
                trackingStatus={trackingStatus}
                performanceMetrics={performanceMetrics}
              />
            </div>
          ))}
        </Panel>
      </Layout>
    </Page>
  );
}
