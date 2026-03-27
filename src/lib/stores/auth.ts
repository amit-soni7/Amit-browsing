import { writable, get } from 'svelte/store';
import type { User } from 'firebase/auth';
import {
  signInWithGoogle,
  signOut,
  onAuthChange,
  ensureUserDocument,
  subscribeToSavedSessions,
  subscribeToRecoverySnapshots,
  subscribeToClosedItems,
  syncSavedSessionToCloud,
  syncRecoverySnapshotToCloud,
  syncClosedItemToCloud,
  deleteSavedSessionFromCloud,
  deleteRecoverySnapshotFromCloud,
  deleteClosedItemFromCloud,
  isFirebaseConfigured
} from '@/lib/firebase';
import type { EClosedItem, ESession } from '@/lib/types';
import { log } from '@/lib/utils/log';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

interface AuthState {
  user: User | null;
  loading: boolean;
  syncStatus: SyncStatus;
  error: string | null;
}

function createAuthStore() {
  const { subscribe, update } = writable<AuthState>({
    user: null,
    loading: true,
    syncStatus: 'idle',
    error: null
  });

  let savedUnsubscribe: (() => void) | null = null;
  let recoveryUnsubscribe: (() => void) | null = null;
  let closedItemsUnsubscribe: (() => void) | null = null;

  let savedSessionsCallback: ((sessions: ESession[]) => void) | null = null;
  let recoverySnapshotsCallback: ((sessions: ESession[]) => void) | null = null;
  let closedItemsCallback: ((items: EClosedItem[]) => void) | null = null;

  const unsubscribeAuth = onAuthChange(async (user) => {
    if (user) {
      update((s) => ({ ...s, user, loading: false }));

      await ensureUserDocument(
        user.uid,
        user.email,
        user.displayName,
        user.photoURL
      );

      if (savedSessionsCallback) startSavedSync(user.uid, savedSessionsCallback);
      if (recoverySnapshotsCallback)
        startRecoverySync(user.uid, recoverySnapshotsCallback);
      if (closedItemsCallback) startClosedItemsSync(user.uid, closedItemsCallback);
    } else {
      savedUnsubscribe?.();
      recoveryUnsubscribe?.();
      closedItemsUnsubscribe?.();
      savedUnsubscribe = null;
      recoveryUnsubscribe = null;
      closedItemsUnsubscribe = null;
      update((s) => ({ ...s, user: null, loading: false, syncStatus: 'idle' }));
    }
  });

  function startSavedSync(uid: string, onSessions: (sessions: ESession[]) => void) {
    savedUnsubscribe?.();
    update((s) => ({ ...s, syncStatus: 'syncing' }));
    savedUnsubscribe = subscribeToSavedSessions(
      uid,
      (sessions) => {
        update((s) => ({ ...s, syncStatus: 'synced' }));
        onSessions(sessions);
      },
      () => update((s) => ({ ...s, syncStatus: 'error' }))
    );
  }

  function startRecoverySync(uid: string, onSessions: (sessions: ESession[]) => void) {
    recoveryUnsubscribe?.();
    update((s) => ({ ...s, syncStatus: 'syncing' }));
    recoveryUnsubscribe = subscribeToRecoverySnapshots(
      uid,
      (sessions) => {
        update((s) => ({ ...s, syncStatus: 'synced' }));
        onSessions(sessions);
      },
      () => update((s) => ({ ...s, syncStatus: 'error' }))
    );
  }

  function startClosedItemsSync(uid: string, onItems: (items: EClosedItem[]) => void) {
    closedItemsUnsubscribe?.();
    update((s) => ({ ...s, syncStatus: 'syncing' }));
    closedItemsUnsubscribe = subscribeToClosedItems(
      uid,
      (items) => {
        update((s) => ({ ...s, syncStatus: 'synced' }));
        onItems(items);
      },
      () => update((s) => ({ ...s, syncStatus: 'error' }))
    );
  }

  return {
    subscribe,
    onSavedSessions(callback: (sessions: ESession[]) => void) {
      savedSessionsCallback = callback;
      const { user } = get({ subscribe });
      if (user) startSavedSync(user.uid, callback);
    },
    onRecoverySnapshots(callback: (sessions: ESession[]) => void) {
      recoverySnapshotsCallback = callback;
      const { user } = get({ subscribe });
      if (user) startRecoverySync(user.uid, callback);
    },
    onClosedItems(callback: (items: EClosedItem[]) => void) {
      closedItemsCallback = callback;
      const { user } = get({ subscribe });
      if (user) startClosedItemsSync(user.uid, callback);
    },
    async login() {
      update((s) => ({ ...s, loading: true, error: null }));
      try {
        await signInWithGoogle();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Login failed';
        update((s) => ({ ...s, loading: false, error: msg }));
        log.error('[authStore] login error:', err);
      }
    },
    async logout() {
      update((s) => ({ ...s, loading: true }));
      try {
        savedUnsubscribe?.();
        recoveryUnsubscribe?.();
        closedItemsUnsubscribe?.();
        await signOut();
      } catch (err) {
        log.error('[authStore] logout error:', err);
      } finally {
        update((s) => ({ ...s, loading: false }));
      }
    },
    async pushSavedSession(session: ESession) {
      const { user } = get({ subscribe });
      if (!user || !isFirebaseConfigured) return;
      update((s) => ({ ...s, syncStatus: 'syncing' }));
      await syncSavedSessionToCloud(user.uid, session);
      update((s) => ({ ...s, syncStatus: 'synced' }));
    },
    async pushRecoverySnapshot(session: ESession) {
      const { user } = get({ subscribe });
      if (!user || !isFirebaseConfigured) return;
      update((s) => ({ ...s, syncStatus: 'syncing' }));
      await syncRecoverySnapshotToCloud(user.uid, session);
      update((s) => ({ ...s, syncStatus: 'synced' }));
    },
    async pushClosedItem(item: EClosedItem) {
      const { user } = get({ subscribe });
      if (!user || !isFirebaseConfigured) return;
      update((s) => ({ ...s, syncStatus: 'syncing' }));
      await syncClosedItemToCloud(user.uid, item);
      update((s) => ({ ...s, syncStatus: 'synced' }));
    },
    async removeSavedSession(sessionId: string) {
      const { user } = get({ subscribe });
      if (!user || !isFirebaseConfigured) return;
      await deleteSavedSessionFromCloud(user.uid, sessionId);
    },
    async removeRecoverySnapshot(sessionId: string) {
      const { user } = get({ subscribe });
      if (!user || !isFirebaseConfigured) return;
      await deleteRecoverySnapshotFromCloud(user.uid, sessionId);
    },
    async removeClosedItem(itemId: string) {
      const { user } = get({ subscribe });
      if (!user || !isFirebaseConfigured) return;
      await deleteClosedItemFromCloud(user.uid, itemId);
    },
    destroy() {
      savedUnsubscribe?.();
      recoveryUnsubscribe?.();
      closedItemsUnsubscribe?.();
      unsubscribeAuth();
    }
  };
}

export const authStore = createAuthStore();
