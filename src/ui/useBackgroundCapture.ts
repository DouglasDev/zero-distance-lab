import { useEffect, useState } from 'react';
import type { ModeControlsProps } from '../modes/types';

/** Shared room capture controls; keep the captured image across experiment switches. */
export function useBackgroundCapture({
  canvas,
  settings,
  cameraStatus,
  active,
  onCountdown,
}: ModeControlsProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [background, setBackground] = useState(false);

  useEffect(() => {
    setCountdown(null);
    canvas.current?.clear();
    setBackground(false);
  }, [canvas, cameraStatus, settings.demo]);

  useEffect(() => {
    if (!active) setCountdown(null);
    else setBackground(canvas.current?.hasBackground() ?? false);
  }, [active, canvas]);

  useEffect(() => {
    onCountdown(active ? countdown : null);
  }, [active, countdown, onCountdown]);

  useEffect(() => {
    if (countdown === null || !active) return;
    const timer = window.setTimeout(() => {
      if (countdown === 1) {
        setBackground(canvas.current?.capture() ?? false);
        setCountdown(null);
      } else setCountdown(countdown - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [active, canvas, countdown]);

  function capture() {
    if (countdown !== null) setCountdown(null);
    else if (settings.demo) setBackground(canvas.current?.capture() ?? false);
    else setCountdown(3);
  }

  function clear() {
    canvas.current?.clear();
    setBackground(false);
  }

  return { countdown, background, capture, clear, cancel: () => setCountdown(null) };
}
