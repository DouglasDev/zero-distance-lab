import { Actions, Button, Note, RangeControl } from '../../ui/controls';
import type { ModeControlsProps } from '../types';
import { useBackgroundCapture } from './useBackgroundCapture';

export function HeadlessMode(props: ModeControlsProps) {
  const { settings, patch, reset, cameraStatus } = props;
  const capture = useBackgroundCapture(props);
  return (
    <>
      <h2>Headless mirror</h2>
      <p>
        Capture the empty room, then return and line your face up with the opening. Your body stays
        visible; the room takes the place of your head. Drag the opening to reposition it.
      </p>
      <Actions>
        <Button
          data-primary="true"
          disabled={cameraStatus === 'requesting'}
          onClick={capture.capture}
        >
          {capture.countdown !== null
            ? 'Cancel capture'
            : capture.background
              ? 'Recapture background'
              : settings.demo
                ? 'Capture demo room'
                : 'Capture empty room'}
        </Button>
        {capture.background && <Button onClick={capture.clear}>Clear</Button>}
      </Actions>
      <Note role="status">
        {capture.background
          ? 'Background ready. Return to your seat and align your head.'
          : 'Capture a background first. The dark opening is a placeholder.'}
      </Note>
      <RangeControl
        label="Horizontal position"
        min={5}
        max={95}
        value={settings.x}
        onChange={(x) => patch({ x })}
      />
      <RangeControl
        label="Vertical position"
        min={5}
        max={95}
        value={settings.y}
        onChange={(y) => patch({ y })}
      />
      <RangeControl
        label="Opening size"
        value={settings.radius}
        onChange={(radius) => patch({ radius })}
      />
      <Button
        onClick={() => {
          capture.cancel();
          reset();
        }}
      >
        Reset controls
      </Button>
      <Note>
        A visual experiment inspired by the Observatories. No particular experience is promised.
      </Note>
    </>
  );
}
