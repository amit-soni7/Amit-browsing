import { derived, get, writable, type Writable } from 'svelte/store';
import browser from 'webextension-polyfill';
import type { EClosedItem, ESession } from '@/lib/types';
import { sessionsDB } from '@/lib/utils/database';
import { authStore } from '@/lib/stores/auth';
import { log, sendMessage } from '@/lib/utils';

function createRecoverySnapshotsStore() {
  const { subscribe, set } = writable<ESession[]>([]);

  authStore.onRecoverySnapshots(async (remoteSnapshots) => {
    await Promise.all(
      remoteSnapshots.map((snapshot) => sessionsDB.upsertSession(snapshot))
    );
    const local = await sessionsDB.loadSessionsByKinds(['recovery', 'autosave']);
    set(
      local.sort(
        (a, b) => (b.updatedAt ?? b.dateSaved ?? 0) - (a.updatedAt ?? a.dateSaved ?? 0)
      )
    );
  });

  async function load() {
    const items = await sessionsDB.loadSessionsByKinds(['recovery', 'autosave']);
    items.sort(
      (a, b) => (b.updatedAt ?? b.dateSaved ?? 0) - (a.updatedAt ?? a.dateSaved ?? 0)
    );
    set(items);

    const { user } = get(authStore);
    if (user) items.forEach((item) => authStore.pushRecoverySnapshot(item));
  }

  load();

  return { subscribe, load };
}

function createClosedItemsStore() {
  const { subscribe, set, update }: Writable<EClosedItem[]> = writable([]);

  authStore.onClosedItems(async (remoteItems) => {
    await Promise.all(
      remoteItems.map((item) => sessionsDB.saveClosedItem(item))
    );
    const items = await sessionsDB.loadClosedItems();
    set(items.sort((a, b) => b.closedAt - a.closedAt));
  });

  async function load() {
    const items = await sessionsDB.loadClosedItems();
    items.sort((a, b) => b.closedAt - a.closedAt);
    set(items);

    const { user } = get(authStore);
    if (user) items.forEach((item) => authStore.pushClosedItem(item));
  }

  async function remove(item: EClosedItem) {
    await sessionsDB.deleteClosedItem(item.id as string);
    authStore.removeClosedItem(item.id as string);
    update((items) => items.filter((entry) => entry.id !== item.id));
  }

  load();

  return { subscribe, load, remove };
}

export const recoverySnapshots = createRecoverySnapshotsStore();
export const closedItems = createClosedItemsStore();

export const recoveryEntries = derived(
  [recoverySnapshots, closedItems],
  ([$recoverySnapshots, $closedItems]) => ({
    snapshots: $recoverySnapshots,
    closedItems: $closedItems
  })
);

browser?.runtime?.onMessage?.addListener?.((request) => {
  if (request.message === 'notifyRecoverySnapshots') recoverySnapshots.load();
  if (request.message === 'notifyClosedItems') closedItems.load();
});

log.info('[recovery] store initialized');
