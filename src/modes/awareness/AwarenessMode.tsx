import { Actions, Button, Note, RangeControl } from '../../ui/controls.tsx';
import type { ModeControlsProps } from '../types.ts';
import { useBackgroundCapture } from '../../ui/useBackgroundCapture.ts';
import type { ProjectionVariant } from '../../rendering/types.ts';
const variants: { id: ProjectionVariant; label: string; description: string }[] = [
  {
    id: 'face',
    label: 'One big face',
    description: 'Your live eyes, nose, and mouth spread across the room.',
  },
  {
    id: 'faces',
    label: 'Many small faces',
    description: 'A field of smaller faces shares your expressions.',
  },
  {
    id: 'eyes',
    label: 'Many eyes',
    description: 'Only your eyes appear throughout the background.',
  },
  {
    id: 'body',
    label: 'Visible body',
    description: 'The part of your body in frame is softly projected onto the room.',
  },
  {
    id: 'deity',
    label: 'Fierce deity',
    description: 'Your face and movement animate an original, many-armed wrathful figure.',
  },
];
export function AwarenessMode(props: ModeControlsProps) {
  const { settings, patch, trackingStatus, canvas } = props;
  const capture = useBackgroundCapture(props);
  const current = variants.find((v) => v.id === settings.projectionVariant)!;
  const message = settings.demo
    ? 'Animated demo · start the webcam to use your own face and body.'
    : {
        off: 'Start the webcam to project yourself.',
        loading: 'Loading local tracking…',
        searching: 'Looking for you. Use good light; step back for body tracking.',
        tracking: 'Projection follows you live',
        holding: 'Waiting for a fresh match…',
        error: 'Tracking stopped. Try again or use the demo.',
      }[trackingStatus];
  return (
    <>
      <h2>Universe mirror</h2>
      <p>The room takes on your features and movement. Try each version.</p>
      <Actions aria-label="Projection version">
        {variants.map((v) => (
          <Button
            key={v.id}
            aria-pressed={settings.projectionVariant === v.id}
            data-primary={settings.projectionVariant === v.id}
            onClick={() => patch({ projectionVariant: v.id })}
          >
            {v.label}
          </Button>
        ))}
      </Actions>
      <Note>{current.description}</Note>
      <Note role="status" aria-live="polite">
        {message}
      </Note>
      {!settings.demo && trackingStatus === 'error' && (
        <Button onClick={() => canvas.current?.retryTracking()}>Retry tracking</Button>
      )}
      <Actions>
        <Button
          data-primary="true"
          disabled={props.cameraStatus === 'requesting'}
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
        {capture.background && <Button onClick={capture.clear}>Clear background</Button>}
      </Actions>
      <Note>
        {capture.background
          ? 'Background ready. Return to view and keep the camera still.'
          : settings.demo
            ? 'Demo room is ready.'
            : 'Capture the empty room first. Until then, projections appear on a dark background.'}
      </Note>
      <RangeControl
        label="Projection size"
        min={35}
        max={140}
        value={settings.projectionSize}
        onChange={(projectionSize) => patch({ projectionSize })}
      />
      <RangeControl
        label="Opacity"
        min={10}
        max={100}
        value={settings.projectionOpacity}
        onChange={(projectionOpacity) => patch({ projectionOpacity })}
      />
      <Actions aria-label="Projection blending">
        {(['source-over', 'screen', 'soft-light'] as const).map((blend) => (
          <Button
            key={blend}
            aria-pressed={settings.projectionBlend === blend}
            onClick={() => patch({ projectionBlend: blend })}
          >
            {{ 'source-over': 'Natural', screen: 'Luminous', 'soft-light': 'Subtle' }[blend]}
          </Button>
        ))}
      </Actions>
      <Button
        onClick={() => {
          capture.cancel();
          props.reset();
        }}
      >
        Reset controls
      </Button>
      <Note>
        {settings.projectionVariant === 'deity'
          ? 'An artistic deity-yoga-inspired visualization, with a stylized figure rather than a depiction of a specific deity. Visible arms and legs drive its limbs.'
          : settings.projectionVariant === 'body'
            ? 'Body tracking needs enough of your head and torso in view. Cropped limbs are projected when the person mask can detect them.'
            : 'Features stay anchored in the room while your expression changes.'}
      </Note>
    </>
  );
}
