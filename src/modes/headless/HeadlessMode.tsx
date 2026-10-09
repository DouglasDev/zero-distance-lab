import { Actions, Button, Note, RangeControl } from '../../ui/controls';
import type { ModeControlsProps } from '../types';
import { useBackgroundCapture } from './useBackgroundCapture';

export function HeadlessMode(props: ModeControlsProps) {
  const { settings, patch, reset, cameraStatus, trackingStatus, canvas } = props;
  const capture = useBackgroundCapture(props);
  const trackingMessage = settings.demo
    ? 'Demo face tracking'
    : {
        off: 'Start the webcam to track your face.',
        loading: 'Loading face tracking…',
        searching: 'Looking for your face. Face the camera in good light.',
        tracking: 'Following your face',
        holding: 'Holding the last position while looking for your face…',
        error: 'Face tracking stopped. Any last position is held. Retry tracking or use the demo.',
      }[trackingStatus];
  return (
    <>
      <h2>Headless mirror</h2>
      <p>
        Capture the empty room, then return to your seat. The opening follows the shape and position
        of your face, leaving its edges visible and blending softly into the room.
      </p>
      <Note role="status" aria-live="polite">
        {trackingMessage}
      </Note>
      {!settings.demo && trackingStatus === 'error' && (
        <Button onClick={() => canvas.current?.retryTracking()}>Retry face tracking</Button>
      )}
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
          ? 'Background ready. Return to your seat and keep the camera still.'
          : 'Capture a background first. The dark face-shaped opening is a placeholder.'}
      </Note>
      <RangeControl
        label="Face edge width"
        min={5}
        max={35}
        value={1 - settings.faceCoverage}
        onChange={(width) => patch({ faceCoverage: 1 - width })}
      />
      <RangeControl
        label="Edge softness"
        min={1}
        max={25}
        value={settings.faceFeather}
        onChange={(faceFeather) => patch({ faceFeather })}
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
        The opening holds its last position if tracking briefly loses your face. A visual experiment
        inspired by the Observatories. No particular experience is promised.
      </Note>
    </>
  );
}
