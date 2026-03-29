import { writable, get } from 'svelte/store';
import type { User } from 'firebase/auth';
import browser from 'webextension-polyfill';
import {
  signInWithGoogle,
  signOut,
  onAuthChange,
  ensureUserDocument,
  subscribeToSavedSessions,
  subscribeToPreferences,
  syncSavedSessionToCloud,
  syncCurrentSessionToCloud,
  syncPreferencesToCloud,
  upsertDeviceToCloud,
  deleteSavedSessionFromCloud,
  isFirebaseConfigured
} from '@/lib/firebase';
import type { DeviceDoc, ESession, ESettings, PreferencesDoc } from '@/lib/types';
import { log } from '@/lib/utils/log';
import { getDeviceId } from '@/lib/utils';
import { sessionsDB } from '@/lib/utils/database';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

interface AuthState {
  user: User | null;
  loading: boolean;
  syncStatus: SyncStatus;
  error: string | null;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getSyncStatusForError(error: unknown): SyncStatus {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'unavailable'
  )
    ? 'offline'
    : 'error';
}

function createAuthStore() {
  const { subscribe, update } = writable<AuthState>({
    user: null,
    loading: true,
    syncStatus: 'idle',
    error: null
  });

  let savedUnsubscribe: (() => void) | null = null;
  let preferencesUnsubscribe: (() => void) | null = null;

  let savedSessionsCallback: ((sessions: ESession[]) => void) | null = null;
  let preferencesCallback: ((preferences: PreferencesDoc | null) => void) | null =
    null;

  async function pushSavedSession(session: ESession) {
    const { user } = get({ subscribe });
    if (!user || !isFirebaseConfigured) return;

    update((s) => ({ ...s, syncStatus: 'syncing', error: null }));

    try {
      const deviceId = await getDeviceId();
      await syncSavedSessionToCloud(user.uid, session, deviceId);
      update((s) => ({ ...s, syncStatus: 'synced' }));
    } catch (error) {
      const message = getErrorMessage(error, 'Session sync failed');
      update((s) => ({
        ...s,
        syncStatus: getSyncStatusForError(error),
        error: message
      }));
      log.error('[authStore] pushSavedSession error:', error);
    }
  }

  async function pushCurrentSession(session: ESession) {
    const { user } = get({ subscribe });
    if (!user || !isFirebaseConfigured) return;

    try {
      const deviceId = await getDeviceId();
      await syncCurrentSessionToCloud(user.uid, session, deviceId);
    } catch (error) {
      update((s) => ({
        ...s,
        syncStatus: getSyncStatusForError(error),
        error: getErrorMessage(error, 'Current session sync failed')
      }));
      log.error('[authStore] pushCurrentSession error:', error);
    }
  }

  async function pushPreferences(settings: ESettings) {
    const { user } = get({ subscribe });
    if (!user || !isFirebaseConfigured) return;

    try {
      await syncPreferencesToCloud(user.uid, settings);
    } catch (error) {
      update((s) => ({
        ...s,
        syncStatus: getSyncStatusForError(error),
        error: getErrorMessage(error, 'Preferences sync failed')
      }));
      log.error('[authStore] pushPreferences error:', error);
    }
  }

  async function removeSavedSession(sessionId: string) {
    const { user } = get({ subscribe });
    if (!user || !isFirebaseConfigured) return;

    try {
      await deleteSavedSessionFromCloud(user.uid, sessionId);
    } catch (error) {
      update((s) => ({
        ...s,
        syncStatus: getSyncStatusForError(error),
        error: getErrorMessage(error, 'Delete sync failed')
      }));
      log.error('[authStore] removeSavedSession error:', error);
    }
  }

  const unsubscribeAuth = onAuthChange(async (user) => {
    if (user) {
      update((s) => ({ ...s, user, loading: false, error: null }));

      try {
        await ensureUserDocument(
          user.uid,
          user.email,
          user.displayName,
          user.photoURL
        );

        const deviceId = await getDeviceId();
        const platform = await browser.runtime.getPlatformInfo();
        const deviceDoc: DeviceDoc = {
          deviceId,
          deviceName: `${platform.os}-${platform.arch}`,
          browser: 'Chrome',
          platform: platform.os,
          extensionVersion: __EXT_VER__
        };

        await upsertDeviceToCloud(user.uid, deviceDoc);

        if (savedSessionsCallback) startSavedSync(user.uid, savedSessionsCallback);
        if (preferencesCallback)
          startPreferencesSync(user.uid, preferencesCallback);

        const localSaved = await sessionsDB.loadSessions();
        await Promise.all(localSaved.map((session) => pushSavedSession(session)));
      } catch (error) {
        update((s) => ({
          ...s,
          loading: false,
          syncStatus: getSyncStatusForError(error),
          error: getErrorMessage(error, 'Auth initialization failed')
        }));
        log.error('[authStore] auth initialization error:', error);
      }
    } else {
      savedUnsubscribe?.();
      preferencesUnsubscribe?.();
      savedUnsubscribe = null;
      preferencesUnsubscribe = null;
      update((s) => ({ ...s, user: null, loading: false, syncStatus: 'idle' }));
    }
  });

  function startSavedSync(uid: string, onSessions: (sessions: ESession[]) => void) {
    savedUnsubscribe?.();
    update((s) => ({ ...s, syncStatus: 'syncing', error: null }));
    savedUnsubscribe = subscribeToSavedSessions(
      uid,
      (sessions) => {
        update((s) => ({ ...s, syncStatus: 'synced', error: null }));
        onSessions(sessions);
      },
      (error) =>
        update((s) => ({
          ...s,
          syncStatus: getSyncStatusForError(error),
          error: getErrorMessage(error, 'Saved sessions sync failed')
        }))
    );
  }

  function startPreferencesSync(
    uid: string,
    onPreferences: (preferences: PreferencesDoc | null) => void
  ) {
    preferencesUnsubscribe?.();
    preferencesUnsubscribe = subscribeToPreferences(
      uid,
      (preferences) => {
        update((s) => ({ ...s, error: null }));
        onPreferences(preferences);
      },
      (error) =>
        update((s) => ({
          ...s,
          syncStatus: getSyncStatusForError(error),
          error: getErrorMessage(error, 'Preferences sync failed')
        }))
    );
  }

  return {
    subscribe,
    onSavedSessions(callback: (sessions: ESession[]) => void) {
      savedSessionsCallback = callback;
      const { user } = get({ subscribe });
      if (user) startSavedSync(user.uid, callback);
    },
    onPreferences(callback: (preferences: PreferencesDoc | null) => void) {
      preferencesCallback = callback;
      const { user } = get({ subscribe });
      if (user) startPreferencesSync(user.uid, callback);
    },
    async login() {
      update((s) => ({ ...s, loading: true, error: null }));
      try {
        await signInWithGoogle();
      } catch (err) {
        const msg = getErrorMessage(err, 'Login failed');
        update((s) => ({ ...s, loading: false, error: msg }));
        log.error('[authStore] login error:', err);
      }
    },
    async logout() {
      update((s) => ({ ...s, loading: true }));
      try {
        savedUnsubscribe?.();
        preferencesUnsubscribe?.();
        await signOut();
      } catch (err) {
        log.error('[authStore] logout error:', err);
      } finally {
        update((s) => ({ ...s, loading: false }));
      }
    },
    pushSavedSession,
    pushCurrentSession,
    pushPreferences,
    removeSavedSession,
    destroy() {
      savedUnsubscribe?.();
      preferencesUnsubscribe?.();
      unsubscribeAuth();
    }
  };
}

export const authStore = createAuthStore();
