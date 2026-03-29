import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  type QueryDocumentSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import type {
  DeviceDoc,
  ESession,
  ESettings,
  PreferencesDoc,
  TabDoc,
  TabGroupDoc
} from '@/lib/types';
import { sanitizeSessionGroup } from '@/lib/utils';
import { log } from '@/lib/utils/log';

const CURRENT_SESSION_GROUP_ID = 'current';

function normalizeString(value: string | undefined | null) {
  return (value ?? '').trim().toLowerCase();
}

function isFirestoreOfflineError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'unavailable'
  );
}

function stripUndefined<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => typeof value !== 'undefined')
  ) as T;
}

function sessionTagsToArray(tags: ESession['tags']) {
  return tags ? [tags] : [];
}

function userDoc(uid: string) {
  return doc(db, 'users', uid);
}

function preferencesDoc(uid: string) {
  return doc(db, 'users', uid, 'meta', 'preferences');
}

function devicesDoc(uid: string, deviceId: string) {
  return doc(db, 'users', uid, 'devices', deviceId);
}

function tabGroupsRef(uid: string) {
  return collection(db, 'users', uid, 'tabGroups');
}

function tabGroupDoc(uid: string, groupId: string) {
  return doc(db, 'users', uid, 'tabGroups', groupId);
}

function tabsRef(uid: string, groupId: string) {
  return collection(db, 'users', uid, 'tabGroups', groupId, 'tabs');
}

function tabDoc(uid: string, groupId: string, tabId: string) {
  return doc(db, 'users', uid, 'tabGroups', groupId, 'tabs', tabId);
}

function getFlattenedTabs(session: ESession) {
  const tabs: Array<{ tab: NonNullable<ESession['windows']>[number]['tabs'][number]; windowIndex: number; tabIndex: number }> = [];

  (session.windows ?? []).forEach((window, windowIndex) => {
    (window.tabs ?? []).forEach((tab, tabIndex) => {
      tabs.push({ tab, windowIndex, tabIndex });
    });
  });

  return tabs;
}

function buildGroupDoc(
  session: ESession,
  deviceId: string,
  {
    current = false,
    deleted = false
  }: { current?: boolean; deleted?: boolean } = {}
): TabGroupDoc {
  const normalized = sanitizeSessionGroup(session);
  const flattenedTabs = getFlattenedTabs(normalized);
  const firstTab = flattenedTabs[0]?.tab;
  const title = current ? 'Current Session' : normalized.title;
  const timestamp =
    normalized.updatedAt ??
    normalized.dateModified ??
    normalized.createdAt ??
    normalized.dateSaved ??
    Date.now();

  return {
    title,
    normalizedTitle: normalizeString(title),
    tags: current ? [] : sessionTagsToArray(normalized.tags),
    type: current ? 'current' : 'saved',
    isCurrentSession: current,
    isPinned: false,
    isArchived: false,
    isDeleted: deleted,
    sortOrder: current
      ? 0
      : normalized.createdAt ?? normalized.dateSaved ?? Date.now(),
    tabCount: normalized.tabsNumber,
    preview: firstTab
      ? {
          firstTabTitle: firstTab.title ?? '',
          firstTabUrl: firstTab.url ?? '',
          firstFaviconUrl: firstTab.favIconUrl ?? ''
        }
      : null,
    createdByDeviceId: deviceId,
    updatedByDeviceId: deviceId,
    version: timestamp,
    createdAt: normalized.createdAt ?? normalized.dateSaved ?? Date.now(),
    updatedAt: timestamp,
    lastOpenedAt: normalized.lastOpenedAt
  };
}

function buildTabDocs(session: ESession, deviceId: string): Array<{ id: string; data: TabDoc }> {
  const normalized = sanitizeSessionGroup(session);
  const timestamp =
    normalized.updatedAt ??
    normalized.dateModified ??
    normalized.createdAt ??
    normalized.dateSaved ??
    Date.now();

  return getFlattenedTabs(normalized)
    .filter(({ tab }) => !!tab.url)
    .map(({ tab, windowIndex, tabIndex }) => ({
      id:
        tab.id?.toString() ??
        `${windowIndex}-${tabIndex}-${normalizeString(tab.url ?? '')}`,
      data: {
        title: tab.title ?? '',
        url: tab.url ?? '',
        normalizedUrl: normalizeString(tab.url),
        faviconUrl: tab.favIconUrl ?? '',
        index: tabIndex,
        windowIndex,
        pinned: !!tab.pinned,
        muted: !!tab.mutedInfo?.muted,
        isDeleted: false,
        browserTabId: tab.id,
        windowId: tab.windowId,
        createdByDeviceId: deviceId,
        updatedByDeviceId: deviceId,
        version: timestamp,
        createdAt: normalized.createdAt ?? normalized.dateSaved ?? Date.now(),
        updatedAt: timestamp
      }
    }));
}

async function replaceTabsSubcollection(
  uid: string,
  groupId: string,
  tabs: Array<{ id: string; data: TabDoc }>
) {
  const existing = await getDocs(tabsRef(uid, groupId));
  const batch = writeBatch(db);

  existing.forEach((existingTab) => {
    batch.delete(existingTab.ref);
  });

  tabs.forEach(({ id, data }) => {
    batch.set(tabDoc(uid, groupId, id), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
}

async function syncGroupWithTabs(
  uid: string,
  groupId: string,
  group: TabGroupDoc,
  tabs: Array<{ id: string; data: TabDoc }>
) {
  const existing = await getDocs(tabsRef(uid, groupId));
  const batch = writeBatch(db);

  batch.set(
    tabGroupDoc(uid, groupId),
    withFirestoreTimestamps(group, {
      createdAt: true,
      updatedAt: true,
      lastOpenedAt: group.lastOpenedAt
    }),
    { merge: true }
  );

  existing.forEach((existingTab) => {
    batch.delete(existingTab.ref);
  });

  tabs.forEach(({ id, data }) => {
    batch.set(tabDoc(uid, groupId, id), {
      ...stripUndefined(data),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
}

function withFirestoreTimestamps<T extends Record<string, unknown>>(
  payload: T,
  options: {
    createdAt?: boolean;
    updatedAt?: boolean;
    lastOpenedAt?: number | null | undefined;
  } = {}
) {
  const nextPayload: Record<string, unknown> = stripUndefined(payload);

  if (options.createdAt) nextPayload.createdAt = serverTimestamp();
  if (options.updatedAt) nextPayload.updatedAt = serverTimestamp();
  if (typeof options.lastOpenedAt !== 'undefined')
    nextPayload.lastOpenedAt =
      options.lastOpenedAt === null ? null : serverTimestamp();

  return nextPayload;
}

async function hydrateSession(
  uid: string,
  groupSnap: QueryDocumentSnapshot
): Promise<ESession> {
  const data = groupSnap.data() as Partial<TabGroupDoc>;
  const tabsSnapshot = await getDocs(tabsRef(uid, groupSnap.id));
  const tabDocs = tabsSnapshot.docs
    .map((docSnap) => docSnap.data() as Partial<TabDoc>)
    .filter((tab) => !tab.isDeleted && !!tab.url)
    .sort((a, b) => {
      const windowDelta = (a.windowIndex ?? 0) - (b.windowIndex ?? 0);
      if (windowDelta !== 0) return windowDelta;
      return (a.index ?? 0) - (b.index ?? 0);
    });

  const windowsMap = new Map<number, ESession['windows'][number]>();

  tabDocs.forEach((tab) => {
    const windowIndex = tab.windowIndex ?? 0;
    if (!windowsMap.has(windowIndex)) {
      windowsMap.set(windowIndex, {
        id: tab.windowId,
        focused: windowIndex === 0,
        tabs: []
      });
    }

    windowsMap.get(windowIndex)?.tabs?.push({
      id: tab.browserTabId,
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.faviconUrl,
      pinned: tab.pinned,
      mutedInfo: { muted: tab.muted },
      windowId: tab.windowId,
      active: false,
      highlighted: false
    });
  });

  return sanitizeSessionGroup({
    id: groupSnap.id as ESession['id'],
    title: data.title ?? 'Untitled Group',
    windows: Array.from(windowsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([, window]) => window),
    tabsNumber: data.tabCount ?? tabDocs.length,
    dateSaved: data.createdAt,
    dateModified: data.updatedAt,
    tags: data.tags?.[0],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    lastOpenedAt: data.lastOpenedAt,
    deviceId: data.updatedByDeviceId,
    deletedAt: data.isDeleted ? Date.now() : null
  });
}

function buildPreferencesPayload(settings: ESettings): PreferencesDoc {
  return {
    theme: settings.theme,
    tabViewMode: 'list',
    sidebarWidth: 280,
    openTabBehavior: 'new_tab',
    sortGroupsBy: settings.sortMethod,
    updatedAt: Date.now()
  };
}

export async function syncSavedSessionToCloud(
  uid: string,
  session: ESession,
  deviceId: string
) {
  if (!isFirebaseConfigured) return;

  const groupId = session.id as string;
  const group = buildGroupDoc(session, deviceId);
  const tabs = buildTabDocs(session, deviceId);

  try {
    await syncGroupWithTabs(uid, groupId, group, tabs);
    log.info('[firestore] synced saved session:', session.id);
  } catch (error) {
    log.error('[firestore] sync saved session error:', error);
  }
}

export async function syncCurrentSessionToCloud(
  uid: string,
  session: ESession,
  deviceId: string
) {
  if (!isFirebaseConfigured) return;

  const group = buildGroupDoc(session, deviceId, { current: true });
  const tabs = buildTabDocs(session, deviceId);

  try {
    await syncGroupWithTabs(uid, CURRENT_SESSION_GROUP_ID, group, tabs);
    log.info('[firestore] synced current session');
  } catch (error) {
    log.error('[firestore] sync current session error:', error);
  }
}

export async function deleteSavedSessionFromCloud(uid: string, sessionId: string) {
  if (!isFirebaseConfigured) return;

  try {
    await setDoc(
      tabGroupDoc(uid, sessionId),
      {
        isDeleted: true,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    log.error('[firestore] delete saved session error:', error);
  }
}

export function subscribeToSavedSessions(
  uid: string,
  onUpdate: (sessions: ESession[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured) return () => {};

  return onSnapshot(
    query(tabGroupsRef(uid), orderBy('sortOrder', 'asc')),
    async (snapshot) => {
      try {
        const docs = snapshot.docs.filter((docSnap) => {
          const data = docSnap.data() as Partial<TabGroupDoc>;
          return !data.isDeleted && !data.isCurrentSession;
        });

        const sessions = await Promise.all(
          docs.map((docSnap) => hydrateSession(uid, docSnap))
        );

        onUpdate(
          sessions.sort(
            (a, b) =>
              (a.createdAt ?? a.dateSaved ?? 0) - (b.createdAt ?? b.dateSaved ?? 0)
          )
        );
      } catch (error) {
        log.error('[firestore] saved sessions hydration error:', error);
        onError?.(error as Error);
      }
    },
    (error) => {
      log.error('[firestore] saved sessions snapshot error:', error);
      onError?.(error);
    }
  );
}

export function subscribeToPreferences(
  uid: string,
  onUpdate: (preferences: PreferencesDoc | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured) return () => {};

  return onSnapshot(
    preferencesDoc(uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null);
        return;
      }

      const data = snapshot.data();
      onUpdate({
        theme: data.theme ?? 'system',
        tabViewMode: data.tabViewMode ?? 'list',
        sidebarWidth: data.sidebarWidth ?? 280,
        openTabBehavior: data.openTabBehavior ?? 'new_tab',
        sortGroupsBy: data.sortGroupsBy ?? 'newest',
        updatedAt: data.updatedAt?.seconds
          ? data.updatedAt.seconds * 1000
          : data.updatedAt
      });
    },
    (error) => {
      log.error('[firestore] preferences snapshot error:', error);
      onError?.(error);
    }
  );
}

export async function syncPreferencesToCloud(uid: string, settings: ESettings) {
  if (!isFirebaseConfigured) return;

  try {
    await setDoc(
      preferencesDoc(uid),
      {
        ...buildPreferencesPayload(settings),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    log.error('[firestore] sync preferences error:', error);
  }
}

export async function upsertDeviceToCloud(uid: string, device: DeviceDoc) {
  if (!isFirebaseConfigured) return;

  try {
    await setDoc(
      devicesDoc(uid, device.deviceId),
      {
        ...device,
        createdAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        lastSyncAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    log.error('[firestore] upsert device error:', error);
  }
}

export async function ensureUserDocument(
  uid: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null
): Promise<void> {
  if (!isFirebaseConfigured) return;

  let createdAt: unknown = serverTimestamp();

  try {
    const existing = await getDoc(userDoc(uid));
    const existingData = existing.exists() ? existing.data() : null;

    createdAt =
      existingData?.createdAt && typeof existingData.createdAt !== 'undefined'
        ? existingData.createdAt
        : serverTimestamp();
  } catch (error) {
    if (isFirestoreOfflineError(error)) {
      log.warn('[firestore] skipped ensureUserDocument while offline');
      return;
    }

    log.error('[firestore] ensureUserDocument read error:', error);
    return;
  }

  try {
    await setDoc(
      userDoc(uid),
      {
        uid,
        email,
        displayName,
        photoURL,
        createdAt,
        updatedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    log.error('[firestore] ensureUserDocument error:', error);
  }
}
