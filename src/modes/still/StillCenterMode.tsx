import { Button, Note, RangeControl } from '../../ui/controls';
import type { ModeControlsProps } from '../types';

export function StillCenterMode({ settings, patch, reset }: ModeControlsProps) {
  return (
    <>
      <h2>Still center</h2>
      <p>
        Look at the live, upright center while the larger view and surrounding rings oscillate. The
        center stays in place; it is not a frozen photograph. Pause motion to compare.
      </p>
      <RangeControl
        label="Opening size"
        value={settings.radius}
        onChange={(radius) => patch({ radius })}
      />
      <RangeControl
        label="Surround movement"
        min={10}
        max={100}
        value={settings.amount}
        onChange={(amount) => patch({ amount })}
      />
      <Button aria-pressed={!settings.motion} onClick={() => patch({ motion: !settings.motion })}>
        {settings.motion ? 'Pause motion' : 'Resume motion'}
      </Button>
      <div style={{ marginTop: 20 }}>
        <Button onClick={reset}>Reset controls</Button>
      </div>
      <Note>
        A visual experiment inspired by the Observatories. No particular experience is promised.
      </Note>
    </>
  );
}
