import type { ThemeMode } from '@/lib/types';

let timeout: NodeJS.Timeout;

const mediaQuery =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

export function getSystemDarkMode() {
  return mediaQuery?.matches ?? true;
}

export function resolveThemeMode(theme: ThemeMode | boolean) {
  if (typeof theme === 'boolean') return theme;
  if (theme === 'dark') return true;
  if (theme === 'light') return false;

  return getSystemDarkMode();
}

let systemListenerBound = false;

export function bindSystemThemeListener(getTheme: () => ThemeMode) {
  if (!mediaQuery || systemListenerBound) return;

  const handleChange = () => {
    if (getTheme() === 'system') applyTheme('system', true);
  };

  if ('addEventListener' in mediaQuery)
    mediaQuery.addEventListener('change', handleChange);
  else mediaQuery.addListener(handleChange);

  systemListenerBound = true;
}

export async function applyTheme(theme: ThemeMode | boolean, fade?: boolean) {
  if (timeout) clearTimeout(timeout);

  if (fade) document.body.classList.add('fade');

  const darkMode = resolveThemeMode(theme);

  document.documentElement.classList.toggle('dark', darkMode);
  document.documentElement.classList.toggle('light', !darkMode);
  document.body.classList.toggle('dark', darkMode);
  document.body.classList.toggle('light', !darkMode);

  document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';

  if (fade)
    timeout = setTimeout(() => {
      document.body.classList.remove('fade');
    }, 200);
}
