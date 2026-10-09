import { useCallback, useEffect, useRef, useState } from 'react';

export function useCamera() {
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const [status, setStatus] = useState<'off' | 'requesting' | 'on'>('off');
  const [error, setError] = useState('');

  const release = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);

  const stop = useCallback(() => {
    generation.current++;
    release();
    setStatus('off');
  }, [release]);

  useEffect(() => {
    const element = document.createElement('video');
    element.muted = true;
    element.playsInline = true;
    video.current = element;
    return () => {
      generation.current++;
      release();
      video.current = null;
    };
  }, [release]);

  const start = useCallback(async () => {
    const request = ++generation.current;
    release();
    setError('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        'Camera access needs HTTPS or localhost and a browser with webcam support. You can still use the demo.',
      );
      setStatus('off');
      return;
    }
    setStatus('requesting');
    let acquired: MediaStream | null = null;
    try {
      acquired = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 60, max: 60 },
        },
      });
      if (request !== generation.current || !video.current) {
        acquired.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = acquired;
      video.current.srcObject = acquired;
      await video.current.play();
      if (request !== generation.current) return;
      acquired.getVideoTracks()[0]?.addEventListener(
        'ended',
        () => {
          if (request !== generation.current) return;
          stop();
          setError('The camera stopped. Start it again or use the demo.');
        },
        { once: true },
      );
      setStatus('on');
    } catch (cause) {
      acquired?.getTracks().forEach((track) => track.stop());
      if (request !== generation.current) return;
      release();
      const name = cause instanceof DOMException ? cause.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser, or try the demo.'
          : name === 'NotFoundError'
            ? 'No webcam was found. Connect one or try the demo.'
            : 'The webcam could not start. Close other apps using it, then try again or use the demo.',
      );
      setStatus('off');
    }
  }, [release, stop]);

  return { video, status, error, start, stop };
}
