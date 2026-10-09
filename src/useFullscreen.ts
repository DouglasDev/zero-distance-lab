import { useEffect, useState, type RefObject } from 'react';

export function useFullscreen(element: RefObject<HTMLElement | null>) {
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  async function toggle() {
    setError('');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await element.current?.requestFullscreen();
    } catch {
      setError('Fullscreen is unavailable in this browser window.');
    }
  }
  return { fullscreen, error, toggle };
}
