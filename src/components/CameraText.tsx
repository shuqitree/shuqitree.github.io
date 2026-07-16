import { useEffect, useState } from 'react';

const cameras = [
  'Nikon Zf',
  'Fujifilm X-T3',
  'Canon EOS R',
  'Nikon Z8',
  'Canon EOS R6',
  'Sony A7 IV',
  'Fujifilm X-T4',
  'Nikon Z6',
  'Mamiya RB67',
  'Hasselblad X2D',
];

export default function CameraText() {
  const [displayed, setDisplayed] = useState('');
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setDisplayed(cameras[0]!);
      return;
    }

    let cancelled = false;
    let cameraIndex = 0;
    let characterIndex = 0;
    let deleting = false;
    let timer: number;

    const tick = () => {
      if (cancelled) return;
      const camera = cameras[cameraIndex] ?? cameras[0]!;

      if (!deleting) {
        characterIndex += 1;
        setDisplayed(camera.slice(0, characterIndex));

        if (characterIndex === camera.length) {
          if (cameraIndex === cameras.length - 1) return;
          deleting = true;
          timer = window.setTimeout(tick, 1700);
          return;
        }

        timer = window.setTimeout(tick, 78);
        return;
      }

      characterIndex -= 1;
      setDisplayed(camera.slice(0, characterIndex));

      if (characterIndex === 0) {
        deleting = false;
        cameraIndex += 1;
        timer = window.setTimeout(tick, 420);
        return;
      }

      timer = window.setTimeout(tick, 38);
    };

    timer = window.setTimeout(tick, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cycle]);

  return (
    <p
      className="camera-text"
      onMouseEnter={() => setCycle((value) => value + 1)}
      aria-label={`All photographs are taken with my ${displayed || cameras[0]}`}
    >
      <span>All photographs are taken with my</span> <strong>{displayed || '\u00a0'}</strong>
      <span className="type-cursor" aria-hidden="true" />
    </p>
  );
}
