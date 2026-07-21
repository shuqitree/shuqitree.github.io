import { useEffect, useState } from 'react';

const rainStorageKey = 'shuqi-site-rain';

export default function RainToggle() {
  const [isRaining, setIsRaining] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsRaining(document.documentElement.dataset.siteRain === 'true');
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const root = document.documentElement;

    if (isRaining) root.dataset.siteRain = 'true';
    else delete root.dataset.siteRain;

    try {
      if (isRaining) window.localStorage.setItem(rainStorageKey, 'true');
      else window.localStorage.removeItem(rainStorageKey);
    } catch {
      // The weather switch still works when storage is unavailable.
    }
  }, [isRaining, isReady]);

  return (
    <button
      className="weather-button rain-button"
      type="button"
      onClick={() => setIsRaining((current) => !current)}
      aria-label={isRaining ? 'Stop the rain' : 'Make it rain'}
      aria-pressed={isRaining}
      title={isRaining ? 'Stop the rain' : 'Make it rain'}
    >
      <span aria-hidden="true">🌧️</span>
    </button>
  );
}
