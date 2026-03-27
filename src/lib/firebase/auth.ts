import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth/web-extension';
import { auth, isFirebaseConfigured } from './config';
import { log } from '@/lib/utils/log';

const googleProvider = new GoogleAuthProvider();
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';
const isGoogleClientConfigured =
  googleClientId !== '' &&
  googleClientId !== 'your-client-id.apps.googleusercontent.com';

type ChromeIdentityApi = {
  getAuthToken: (
    details: { interactive: boolean },
    callback: (token?: string) => void
  ) => void;
  removeCachedAuthToken?: (
    details: { token: string },
    callback?: () => void
  ) => void;
};

type ChromeRuntimeApi = {
  lastError?: { message?: string };
};

type ChromeApi = {
  identity?: ChromeIdentityApi;
  runtime?: ChromeRuntimeApi;
};

let cachedGoogleAccessToken: string | null = null;

function getChromeApi(): ChromeApi | undefined {
  return globalThis.chrome as ChromeApi | undefined;
}

async function getGoogleAccessToken(): Promise<string> {
  const chromeApi = getChromeApi();
  const identity = chromeApi?.identity;

  if (!identity?.getAuthToken) {
    throw new Error('Chrome identity API is unavailable in this context.');
  }

  if (!isGoogleClientConfigured) {
    throw new Error(
      'Google OAuth client ID is not configured. Set VITE_GOOGLE_CLIENT_ID in .env.local and rebuild the extension.'
    );
  }

  return await new Promise((resolve, reject) => {
    identity.getAuthToken({ interactive: true }, (token) => {
      const error = chromeApi?.runtime?.lastError;

      if (error?.message) {
        reject(new Error(error.message));
        return;
      }

      if (!token) {
        reject(new Error('No Google OAuth token was returned by Chrome.'));
        return;
      }

      resolve(token);
    });
  });
}

async function clearCachedGoogleToken() {
  const token = cachedGoogleAccessToken;
  const identity = getChromeApi()?.identity;

  cachedGoogleAccessToken = null;

  if (!token || !identity?.removeCachedAuthToken) return;

  await new Promise<void>((resolve) => {
    identity.removeCachedAuthToken?.({ token }, () => resolve());
  });
}

/**
 * Sign in with Google using the Chrome identity API and Firebase credentials.
 */
export async function signInWithGoogle(): Promise<User | null> {
  if (!isFirebaseConfigured) {
    log.warn('[auth] Firebase not configured — fill in .env.local credentials');
    return null;
  }

  try {
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    const accessToken = await getGoogleAccessToken();
    const credential = GoogleAuthProvider.credential(null, accessToken);
    const result = await signInWithCredential(auth, credential);

    cachedGoogleAccessToken = accessToken;
    log.info('[auth] signed in as:', result.user.email);
    return result.user;
  } catch (error) {
    log.error('[auth] signInWithGoogle error:', error);
    throw error;
  }
}

/**
 * Sign out from Firebase.
 */
export async function signOut(): Promise<void> {
  if (!isFirebaseConfigured) return;

  try {
    await firebaseSignOut(auth);
    await clearCachedGoogleToken();
    log.info('[auth] signed out');
  } catch (error) {
    log.error('[auth] signOut error:', error);
    throw error;
  }
}

/**
 * Listen to Firebase auth state changes.
 */
export function onAuthChange(callback: (user: User | null) => void) {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

/**
 * Get the current Firebase user.
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}
