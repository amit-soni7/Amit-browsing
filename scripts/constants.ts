import { existsSync, readFileSync } from 'node:fs';

export const isFirefox = process.env.TARGET === 'firefox';

function readEnvFile(path: string) {
  if (!existsSync(path)) return {} as Record<string, string>;

  const lines = readFileSync(path, 'utf-8').split(/\r?\n/);
  const env: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    env[key] = value.replace(/^['"]|['"]$/g, '');
  }

  return env;
}

const env = {
  ...readEnvFile('.env'),
  ...readEnvFile('.env.local'),
  ...process.env
};

const rawGoogleOauthClientId = env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';

export const googleOauthClientId =
  rawGoogleOauthClientId &&
  rawGoogleOauthClientId !== 'your-client-id.apps.googleusercontent.com'
    ? rawGoogleOauthClientId
    : '';

export const googleOauthScopes = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

export const extension = {
  name: 'amit-browsing',
  version: process.env.npm_package_version!,
  description:
    'A web extension to save, manage and restore sessions, windows and tabs.',
  author: 'navorite',
  homepage_url: 'https://github.com/navorite/sessionic',
  permissions: [
    'tabs',
    'storage',
    'unlimitedStorage',
    'alarms',
    'contextMenus',
    ...(!isFirefox ? ['identity'] : []),
    ...(isFirefox ? ['cookies'] : ['system.display', 'favicon'])
  ],
  firefoxId: 'sessonic@navorite'
};

export const isDEV = process.env.NODE_ENV !== 'production';

export const dir = './dist/';
