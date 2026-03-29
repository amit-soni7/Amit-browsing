import type { EClosedItem, ESession, ETab, EWindow, SessionSource } from '@/lib/types';
import { sessionsDB } from '@/lib/utils/database';
import { generateSession } from '@/lib/utils/generateSession';
import { getSession } from '@/lib/utils/getSession';
import { getDeviceId } from '@/lib/utils/device';
import { sendMessage } from '@/lib/utils/messages';
import { recoveryDefaults } from '@/lib/constants/shared';

let latestSessionCache: ESession | null = null;
let snapshotTimeout: NodeJS.Timeout | null = null;

function notify(message: 'notifyRecoverySnapshots' | 'notifyClosedItems') {
  return sendMessage({ message }).catch(() => undefined);
}

function notifyRecoverySnapshots() {
  notify('notifyRecoverySnapshots');
}

function notifyClosedItems() {
  notify('notifyClosedItems');
}

export async function refreshSessionCache() {
  latestSessionCache = await getSession();
  return latestSessionCache;
}

function buildRecoverySnapshot(session: ESession, source: SessionSource, deviceId: string) {
  const now = Date.now();

  return generateSession(session, {
    id: 'recovery-latest',
    title: 'Latest Recovery',
    kind: 'recovery',
    source,
    createdAt: session.createdAt ?? now,
    updatedAt: now,
    dateSaved: now,
    dateModified: now,
    deviceId,
    schemaVersion: 1,
    syncState: 'pending'
  });
}

export async function persistCurrentWorkspace(source: SessionSource) {
  const deviceId = await getDeviceId();
  const current = await getSession();

  latestSessionCache = current;

  if (!current.tabsNumber) return;

  const snapshot = buildRecoverySnapshot(current, source, deviceId);
  await sessionsDB.upsertSession(snapshot);
  notifyRecoverySnapshots();
}

export function queueWorkspaceSnapshot(source: SessionSource) {
  if (snapshotTimeout) clearTimeout(snapshotTimeout);

  snapshotTimeout = setTimeout(() => {
    persistCurrentWorkspace(source);
  }, 350);
}

function tabToClosedItem(tab: ETab, deviceId: string): EClosedItem {
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    itemType: 'tab',
    title: tab.title ?? tab.url ?? 'Closed Tab',
    tab,
    closedAt: now,
    updatedAt: now,
    deviceId,
    schemaVersion: 1,
    syncState: 'pending'
  };
}

function windowToClosedItem(window: EWindow, deviceId: string): EClosedItem {
  const now = Date.now();
  const session: ESession = {
    id: crypto.randomUUID(),
    title: 'Closed Window',
    windows: [window],
    tabsNumber: window.tabs?.length ?? 0,
    dateSaved: now,
    dateModified: now,
    kind: 'recovery',
    source: 'window-close',
    createdAt: now,
    updatedAt: now,
    deviceId,
    schemaVersion: 1,
    syncState: 'pending'
  };

  return {
    id: crypto.randomUUID(),
    itemType: 'window',
    title: window.tabs?.[0]?.title
      ? `Window: ${window.tabs[0].title}`
      : 'Closed Window',
    session,
    closedAt: now,
    updatedAt: now,
    deviceId,
    schemaVersion: 1,
    syncState: 'pending'
  };
}

export async function recordClosedEntity(
  tabId: number,
  windowId: number,
  isWindowClosing: boolean
) {
  const deviceId = await getDeviceId();
  const session = latestSessionCache ?? (await refreshSessionCache());
  if (!session) return;

  const window = session.windows.find((entry) => entry.id === windowId);
  if (!window) return;

  if (isWindowClosing) {
    await sessionsDB.saveClosedItem(windowToClosedItem(structuredClone(window), deviceId));
  } else {
    const tab = window.tabs?.find((entry) => entry.id === tabId);
    if (!tab) return;
    await sessionsDB.saveClosedItem(tabToClosedItem(structuredClone(tab), deviceId));
  }

  await sessionsDB.pruneClosedItems(recoveryDefaults.closedItemsMax);
  notifyClosedItems();
}
