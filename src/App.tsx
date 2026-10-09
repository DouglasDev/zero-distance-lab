import { useEffect, useRef, useState } from 'react';
import { styled } from '@linaria/react';
import { PhaserCanvas, type CanvasHandle } from './PhaserCanvas';
import { type Mode, type Settings } from './effects';
import { useCamera } from './useCamera';

const Page = styled.main`max-width: 1140px; margin: auto; padding: 28px 24px 40px;`;
const Header = styled.header`
  display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 28px;
  h1 { font-size: 23px; letter-spacing: -.04em; margin: 0 0 5px; font-weight: 500; }
  p { color: #acb9ae; margin: 0; font-size: 14px; }
  @media (max-width: 600px) { flex-direction: column; align-items: flex-start; }
`;
const Actions = styled.div`display: flex; gap: 8px; flex-wrap: wrap; align-items: center;`;
const Button = styled.button`
  color: #dfe5da; background: #202c25; border: 1px solid #405247; border-radius: 6px; padding: 10px 14px;
  &:hover:not(:disabled) { background: #2c3c31; }
  &[data-primary='true'] { background: #d8dfbe; color: #17231c; border-color: #d8dfbe; }
  &:disabled { opacity: .45; cursor: default; }
`;
const Layout = styled.div`
  display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 22px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;
const Modes = styled.div`
  display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px;
  button { flex: 1; padding: 12px; color: #b9c5b8; background: transparent; border: 1px solid #38453b; border-radius: 6px; white-space: nowrap; }
  button[aria-pressed='true'] { color: #e2e8d1; background: #2b382b; border-color: #95a17d; }
`;
const Stage = styled.div`
  overflow: hidden; border-radius: 8px; border: 1px solid #38453b; position: relative;
  &:fullscreen { display: flex; align-items: center; justify-content: center; background: #101715; border: none; border-radius: 0; }
  &:fullscreen > div:first-child { width: min(100vw, 177.77vh); }
`;
const Overlay = styled.div`
  position: absolute; inset: 0; display: grid; place-content: center; text-align: center; background: #10171588; pointer-events: none;
  strong { font-size: 72px; font-weight: 500; }
  span { padding: 12px; background: #101715dd; border-radius: 6px; }
`;
const StageFooter = styled.div`
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin: 12px 0;
  span { color: #b8c4b7; font-size: 13px; }
`;
const Panel = styled.aside`
  padding-top: 3px; h2 { font-size: 18px; font-weight: 500; margin: 0 0 12px; }
  p { font-size: 14px; color: #bdc8ba; line-height: 1.6; margin: 0 0 20px; }
`;
const Field = styled.label`
  display: block; margin: 20px 0;
  span { display: flex; justify-content: space-between; font-size: 13px; gap: 8px; }
  input { width: 100%; margin: 12px 0 0; accent-color: #c4d19f; }
`;
const Note = styled.p`font-size: 12px; line-height: 1.6; color: #95a693; margin: 22px 0 0;`;
const Alert = styled.div`padding: 12px 16px; border: 1px solid #937b57; color: #edcca0; border-radius: 6px; margin-bottom: 16px; font-size: 14px; line-height: 1.5;`;

const modes: { id: Mode; title: string; instruction: string }[] = [
  { id: 'headless', title: 'Headless mirror', instruction: 'Capture the empty room, then return and line your face up with the opening. Your body stays visible; the room takes the place of your head. Drag the opening to reposition it.' },
  { id: 'sphere', title: 'Glass sphere', instruction: 'An inverted, curved version of the live view sits inside a simulated sphere. Move closer, farther away, or side to side and notice how your face becomes part of the image.' },
  { id: 'still', title: 'Still center', instruction: 'Look at the live, upright center while the larger view and surrounding rings oscillate. The center stays in place; it is not a frozen photograph. Pause motion to compare.' },
];
const initial: Settings = { mode: 'headless', radius: .19, x: .5, y: .39, motion: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, amount: .65, demo: true };

export function App() {
  const camera = useCamera();
  const [settings, setSettings] = useState(initial);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [background, setBackground] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [screenError, setScreenError] = useState('');
  const canvas = useRef<CanvasHandle>(null);
  const stage = useRef<HTMLDivElement>(null);
  const selected = modes.find(mode => mode.id === settings.mode)!;
  const patch = (values: Partial<Settings>) => setSettings(previous => ({ ...previous, ...values }));

  useEffect(() => {
    if (camera.status === 'on') setSettings(previous => ({ ...previous, demo: false }));
    if (camera.status === 'off') setSettings(previous => ({ ...previous, demo: true }));
    setCountdown(null); canvas.current?.clear(); setBackground(false);
  }, [camera.status]);

  useEffect(() => {
    setCountdown(null); canvas.current?.clear(); setBackground(false);
  }, [settings.demo]);

  useEffect(() => {
    if (countdown === null) return;
    const timer = window.setTimeout(() => {
      if (countdown === 1) { setBackground(canvas.current?.capture() ?? false); setCountdown(null); }
      else setCountdown(countdown-1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  async function toggleFullscreen() {
    setScreenError('');
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.current?.requestFullscreen(); }
    catch { setScreenError('Fullscreen is unavailable in this browser window.'); }
  }

  function chooseMode(mode: Mode) { setCountdown(null); setSettings(previous => ({ ...previous, mode, radius: mode === 'sphere' ? Math.min(previous.radius, .26) : previous.radius })); }

  return <Page>
    <Header>
      <div><h1>Zero Distance Lab</h1><p>Three small experiments in seeing.</p></div>
      <Actions>
        {camera.status === 'off' ? <Button data-primary="true" onClick={() => void camera.start()}>Start webcam</Button>
          : <Button onClick={camera.stop}>{camera.status === 'requesting' ? 'Cancel camera request' : 'Stop webcam'}</Button>}
        <Button onClick={() => { camera.stop(); patch({ demo: true }); }} disabled={settings.demo && camera.status === 'off'}>Use demo</Button>
      </Actions>
    </Header>
    {camera.error && <Alert role="alert">{camera.error}</Alert>}
    {screenError && <Alert role="alert">{screenError}</Alert>}
    <Layout>
      <section aria-label="Experiment">
        <Modes aria-label="Choose an experiment">{modes.map(mode => <button key={mode.id} aria-pressed={settings.mode === mode.id} onClick={() => chooseMode(mode.id)}>{mode.title}</button>)}</Modes>
        <Stage ref={stage}>
          <PhaserCanvas ref={canvas} settings={settings} video={camera.video} onPosition={(x, y) => patch({ x, y })} />
          {countdown !== null && <Overlay role="status"><span>Move out of view</span><strong>{countdown}</strong></Overlay>}
          {camera.status === 'requesting' && <Overlay role="status"><span>Waiting for camera permission…</span></Overlay>}
        </Stage>
        <StageFooter>
          <span aria-live="polite">{camera.status === 'requesting' ? 'Camera request pending' : settings.demo ? 'Demo · no webcam in use' : 'Webcam · mirrored live view'}</span>
          {document.fullscreenEnabled && <Button onClick={() => void toggleFullscreen()}>{fullscreen ? 'Exit fullscreen' : 'Fullscreen'}</Button>}
        </StageFooter>
        <Note>Camera images stay in this browser. Nothing is uploaded or recorded. Stop webcam releases the camera and clears the captured background.</Note>
      </section>
      <Panel>
        <h2>{selected.title}</h2><p>{selected.instruction}</p>
        {settings.mode === 'headless' && <>
          <Actions>
            <Button data-primary="true" disabled={camera.status === 'requesting'} onClick={() => {
              if (countdown !== null) setCountdown(null);
              else if (settings.demo) setBackground(canvas.current?.capture() ?? false);
              else setCountdown(3);
            }}>{countdown !== null ? 'Cancel capture' : background ? 'Recapture background' : settings.demo ? 'Capture demo room' : 'Capture empty room'}</Button>
            {background && <Button onClick={() => { canvas.current?.clear(); setBackground(false); }}>Clear</Button>}
          </Actions>
          <Note role="status">{background ? 'Background ready. Return to your seat and align your head.' : 'Capture a background first. The dark opening is a placeholder.'}</Note>
          <Field><span>Horizontal position <output>{Math.round(settings.x*100)}%</output></span><input aria-label="Horizontal position" type="range" min="5" max="95" value={settings.x*100} onChange={event => patch({ x: Number(event.target.value)/100 })}/></Field>
          <Field><span>Vertical position <output>{Math.round(settings.y*100)}%</output></span><input aria-label="Vertical position" type="range" min="5" max="95" value={settings.y*100} onChange={event => patch({ y: Number(event.target.value)/100 })}/></Field>
        </>}
        <Field><span>{settings.mode === 'sphere' ? 'Sphere size' : 'Opening size'} <output>{Math.round(settings.radius*100)}%</output></span><input aria-label={settings.mode === 'sphere' ? 'Sphere size' : 'Opening size'} type="range" min="8" max={settings.mode === 'sphere' ? '26' : '38'} step="1" value={Math.min(settings.radius*100, settings.mode === 'sphere' ? 26 : 38)} onChange={event => patch({ radius: Number(event.target.value)/100 })}/></Field>
        {settings.mode === 'still' && <>
          <Field><span>Surround movement <output>{Math.round(settings.amount*100)}%</output></span><input aria-label="Surround movement" type="range" min="10" max="100" value={settings.amount*100} onChange={event => patch({ amount: Number(event.target.value)/100 })}/></Field>
          <Button aria-pressed={!settings.motion} onClick={() => patch({ motion: !settings.motion })}>{settings.motion ? 'Pause motion' : 'Resume motion'}</Button>
        </>}
        <Button onClick={() => { setCountdown(null); setSettings(previous => ({ ...initial, mode: previous.mode, demo: previous.demo })); }}>Reset controls</Button>
        <Note>{settings.mode === 'sphere' ? 'The sphere is a visual approximation, not a physical optics simulation.' : 'A visual experiment inspired by the Observatories. No particular experience is promised.'}</Note>
      </Panel>
    </Layout>
  </Page>;
}
