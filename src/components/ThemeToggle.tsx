import { useEffect, useState } from 'react';

const themeChangeEvent = 'shuqi-theme-change';

export default function ThemeToggle() {
  const [isNight, setIsNight] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsNight(document.documentElement.dataset.siteTheme === 'night');
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const root = document.documentElement;
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

    if (isNight) {
      root.dataset.siteTheme = 'night';
      themeColor?.setAttribute('content', '#0e1222');
    } else {
      delete root.dataset.siteTheme;
      themeColor?.setAttribute('content', '#f4eff4');
    }

    try {
      if (isNight) window.localStorage.setItem('shuqi-site-theme', 'night');
      else window.localStorage.removeItem('shuqi-site-theme');
    } catch {
      // The visual switch still works when storage is unavailable.
    }

    root.dispatchEvent(new CustomEvent(themeChangeEvent));
  }, [isNight, isReady]);

  return (
    <button
      className="weather-button night-button"
      type="button"
      onClick={() => setIsNight((current) => !current)}
      aria-label={isNight ? 'Turn on daylight' : 'Turn on night mode'}
      aria-pressed={isNight}
      title={isNight ? 'Turn on daylight' : 'Turn on night mode'}
    >
      <span aria-hidden="true">🌙</span>
    </button>
  );
}

export { themeChangeEvent };
