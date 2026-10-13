import { Actions, Button, Note, RangeControl } from '../../ui/controls.tsx';
import type { ModeControlsProps } from '../types.ts';
import { useBackgroundCapture } from '../../ui/useBackgroundCapture.ts';
import type { ProjectionVariant } from '../../rendering/types.ts';
const variants: { id: ProjectionVariant; label: string; description: string }[] = [
  {
    id: 'face',
    label: 'One big face',
    description: 'Your face becomes the central sculpted surface of a visionary temple.',
  },
  {
    id: 'faces',
    label: 'Many small faces',
    description: 'Living faces repeat through the walls and vaults.',
  },
  {
    id: 'eyes',
    label: 'Many eyes',
    description: 'Your eyes become the repeating ornament of the environment.',
  },
  {
    id: 'body',
    label: 'Visible body',
    description: 'Your visible body becomes part of the patterned surfaces.',
  },
  {
    id: 'deity',
    label: 'Fierce deity',
    description:
      'Your features meld with a historical Mahakala painting; its face and arms follow your movement.',
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
      <p>Your image becomes the material of a sculpted, receding world.</p>
      <Actions aria-label="Environment">
        <Button
          aria-pressed={settings.projectionEnvironment === 'temple'}
          onClick={() => patch({ projectionEnvironment: 'temple' })}
        >
          Visionary temple
        </Button>
        <Button
          aria-pressed={settings.projectionEnvironment === 'room'}
          onClick={() => patch({ projectionEnvironment: 'room' })}
        >
          Captured room
        </Button>
      </Actions>
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
      <div hidden={settings.projectionEnvironment !== 'room'}>
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
      </div>
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
      <div hidden={settings.projectionEnvironment !== 'room'}>
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
      </div>
      <Button aria-pressed={settings.motion} onClick={() => patch({ motion: !settings.motion })}>
        {settings.motion ? 'Pause drift' : 'Resume drift'}
      </Button>
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
          ? 'Mahakala, Protector of the Tent · Central Tibet, ca. 1500. Public-domain artwork from The Metropolitan Museum of Art. Live features blend into the painted face; movement gently deforms the image.'
          : settings.projectionVariant === 'body'
            ? 'Body tracking needs enough of your head and torso in view. Cropped limbs are projected when the person mask can detect them.'
            : settings.projectionEnvironment === 'temple'
              ? 'No background capture needed. Move gently to see depth and parallax.'
              : 'Features stay anchored in the room while your expression changes.'}
      </Note>
    </>
  );
}
