import { Button, Note, RangeControl } from '../../ui/controls';
import type { ModeControlsProps } from '../types';

export function SphereMode({ settings, patch, reset }: ModeControlsProps) {
  return (
    <>
      <h2>Glass sphere</h2>
      <p>
        An inverted, curved version of the live view sits inside a simulated sphere. Move closer,
        farther away, or side to side and notice how your face becomes part of the image.
      </p>
      <RangeControl
        label="Sphere size"
        max={26}
        value={Math.min(settings.radius, 0.26)}
        onChange={(radius) => patch({ radius })}
      />
      <Button onClick={reset}>Reset controls</Button>
      <Note>The sphere is a visual approximation, not a physical optics simulation.</Note>
    </>
  );
}
