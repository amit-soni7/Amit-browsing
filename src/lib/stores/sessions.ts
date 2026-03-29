import type { UUID } from 'crypto';
import type { ESession, EWindow } from '@/lib/types';
import { derived, get, writable, type Writable } from 'svelte/store';
import { sessionsDB } from '@utils/database';
import { settings, notification, filterOptions } from '@/lib/stores';
import {
  log,
  generateSession,
  sendMessage,
  filterTagsAndSort,
  createEmptySessionGroup,
  sanitizeSessionGroup
} from '@/lib/utils';
import browser, { i18n } from 'webextension-polyfill';
import { authStore } from '@/lib/stores/auth';

export let finished = false;

export const sessions = (() => {
  const { subscribe, set, update }: Writable<ESession[]> = writable([]);

  const selection: Writable<ESession> = writable();

  function cloneForCloud(session: ESession) {
    return sanitizeSessionGroup(session);
  }

  function pickPreferredSession(local: ESession | undefined, remote: ESession) {
    if (!local) return remote;

    const localHasWindows = Array.isArray(local.windows) && local.windows.length > 0;
    const remoteHasWindows =
      Array.isArray(remote.windows) && remote.windows.length > 0;
    const localUpdated =
      local.remoteUpdatedAt ??
      local.updatedAt ??
      local.dateModified ??
      local.createdAt ??
      local.dateSaved ??
      0;
    const remoteUpdated =
      remote.remoteUpdatedAt ??
      remote.updatedAt ??
      remote.dateModified ??
      remote.createdAt ??
      remote.dateSaved ??
      0;

    if (localHasWindows && !remoteHasWindows) {
      return sanitizeSessionGroup({
        ...remote,
        windows: local.windows,
        tabsNumber: local.tabsNumber || remote.tabsNumber
      });
    }

    return remoteUpdated >= localUpdated ? remote : local;
  }

  load();
  authStore.onSavedSessions(async (remoteSessions) => {
    const localSaved = await sessionsDB.loadSessions();
    const localById = new Map(localSaved.map((session) => [session.id, session]));
    const merged = remoteSessions.map((session) =>
      pickPreferredSession(localById.get(session.id), session)
    );

    await Promise.all(merged.map((session) => sessionsDB.upsertSession(session)));

    const mergedIds = new Set(merged.map((session) => session.id));
    const preservedLocal = localSaved.filter((session) => !mergedIds.has(session.id));

    set([...preservedLocal, ...merged]);
  });

  async function load() {
    const count = await sessionsDB.streamSessionsByKinds(['saved'], set);

    log.info(`[sessions.load] loaded ${count} session`);

    await settings.init(); // to fix inconsistent behaviour with FF and Chrome - need to check

    const { selectionId } = get(settings);

    selectById(selectionId);

    const { user } = get(authStore);
    if (user) {
      const localSaved = await sessionsDB.loadSessions();
      localSaved.forEach((session) => authStore.pushSavedSession(session));
    }

    finished = true;
  }

  async function add(session: ESession) {
    if (!session.windows.length || !session.tabsNumber)
      return notification.error(
        i18n.getMessage('notifySaveFailEmpty'),
        '[sessions.add]: session is empty'
      );

    const generated = generateSession(session);
    const cloudSession = cloneForCloud(generated);

    await sessionsDB.saveSession(generated);

    // Sync to cloud (non-blocking)
    authStore.pushSavedSession(cloudSession);

    update((sessions) => {
      generated.windows = { length: generated.windows.length } as EWindow[]; //unref the obj for GC

      sessions.push(generated);

      notify(sessions, generated.id);

      return sessions;
    });

    select(generated);

    notification.success(i18n.getMessage('notifySaveSuccess'));

    return generated.id;
  }

  async function addEmptyGroup(title = 'Untitled Group') {
    const group = createEmptySessionGroup(title);
    const cloudSession = cloneForCloud(group);

    await sessionsDB.saveSession(group);
    authStore.pushSavedSession(cloudSession);

    update((sessions) => {
      sessions.push(group);
      notify(sessions, group.id);
      return sessions;
    });

    await select(group);

    return group.id;
  }

  async function put(target: ESession) {
    const selectedIdBeforeSave = get(settings).selectionId;

    if (!Array.isArray(target.windows))
      target.windows = (await sessionsDB.loadSessionWindows(
        target.id as UUID
      ))!;

    const sanitized = sanitizeSessionGroup(target, {
      updatedAt: Date.now(),
      dateModified: Date.now()
    });
    const cloudSession = cloneForCloud(sanitized);

    await sessionsDB.updateSession(sanitized);

    // Sync update to cloud (non-blocking)
    authStore.pushSavedSession(cloudSession);

    update((sessions) => {
      sanitized.windows = {
        length: sanitized.windows.length
      } as EWindow[]; //unref the obj for GC

      sessions[sessions.findIndex((session) => session.id === sanitized.id)] =
        sanitized;

      notify(
        sessions,
        get(settings).selectionId === selectedIdBeforeSave
          ? (sanitized.id as UUID)
          : undefined
      );

      return sessions;
    });

    if (get(settings).selectionId === selectedIdBeforeSave)
      selectById(sanitized.id as UUID);

    notification.success_info(i18n.getMessage('notifyUpdateSuccess'));
  }

  let timeout: NodeJS.Timeout;

  async function filter(query: string) {
    if (timeout) clearTimeout(timeout);

    const result = await new Promise<ESession[]>((resolve, reject) => {
      timeout = setTimeout(async () => {
        if (!query) reject('There is no search query');

        const sessions = await sessionsDB.loadSessions();

        if (!sessions.length) reject('There are no saved sessions');

        const filtered: ESession[] = [];

        for (const session of sessions) {
          if (session?.title?.toLowerCase().includes(query)) {
            filtered.push(session);
            continue;
          }

          if (
            session.windows.some((window) =>
              window.tabs?.some((tab) =>
                tab.title?.toLowerCase().includes(query)
              )
            )
          ) {
            session.windows = { length: session.windows.length } as EWindow[];
            filtered.push(session);
          }
        }
        resolve(filtered); //subject to change;
      }, 250);
    });

    return result;
  }

  async function remove(target: ESession) {
    if (!target || !target.id || target.id === 'current')
      return notification.error(
        i18n.getMessage('notifyDeleteFailUndefined'),
        '[sessions.remove] error: removing undefined session'
      );

    update((sessions) => {
      const index = sessions.indexOf(target);

      if (index === -1) {
        notification.error(
          i18n.getMessage('notifyDeleteFailUndefined'),
          '[sessions.remove] error: removing undefined session'
        );

        return sessions;
      }

      sessionsDB.deleteSession(target);

      // Remove from cloud (non-blocking)
      authStore.removeSavedSession(target.id as string);

      sessions.splice(index, 1);

      notify(sessions);

      notification.success_warning(i18n.getMessage('notifyDeleteSuccess'));

      return sessions;
    });
  }

  async function getPersistedSession(target: ESession) {
    if (Array.isArray(target.windows)) return sanitizeSessionGroup(target);

    const windows =
      ((await sessionsDB.loadSessionWindows(target.id as UUID)) as EWindow[]) ??
      [];

    return sanitizeSessionGroup({
      ...target,
      windows
    });
  }

  async function moveTab(
    payload: {
      tab: browser.Tabs.Tab;
      sourceSessionId: 'current' | UUID | string;
      sourceWindowIndex: number;
      sourceTabIndex: number;
    },
    targetSessionId: UUID | string,
    targetWindowIndex?: number
  ) {
    if (!payload.tab.url || payload.sourceSessionId === targetSessionId) return;

    const targetSummary = get({ subscribe }).find(
      (session) => session.id === targetSessionId
    );

    if (!targetSummary) return;

    const createEmptyWindow = () =>
      ({
        tabs: [],
        focused: false,
        incognito: false,
        alwaysOnTop: false
      }) as EWindow;

    const target = await getPersistedSession(targetSummary);

    if (!target.windows.length) target.windows = [createEmptyWindow()];

    const resolvedTargetWindowIndex =
      typeof targetWindowIndex === 'number'
        ? targetWindowIndex
        : target.windows.findIndex((window) => window.focused);

    const targetWindow =
      target.windows[resolvedTargetWindowIndex] ??
      target.windows[0] ??
      createEmptyWindow();

    if (!target.windows.includes(targetWindow)) target.windows.push(targetWindow);

    targetWindow.tabs ??= [];

    const exists = targetWindow.tabs.some(
      (tab) => tab.url === payload.tab.url && tab.title === payload.tab.title
    );

    if (exists) return;

    targetWindow.tabs.push({
      ...payload.tab,
      active: false,
      highlighted: false
    });
    target.tabsNumber += 1;

    if (payload.sourceSessionId !== 'current') {
      const sourceSummary = get({ subscribe }).find(
        (session) => session.id === payload.sourceSessionId
      );

      if (sourceSummary) {
        const source = await getPersistedSession(sourceSummary);
        const sourceWindow = source.windows[payload.sourceWindowIndex];
        const sourceTab = sourceWindow?.tabs?.[payload.sourceTabIndex];

        if (sourceWindow?.tabs?.length && sourceTab) {
          sourceWindow.tabs.splice(payload.sourceTabIndex, 1);
          source.tabsNumber = Math.max(0, source.tabsNumber - 1);

          if (!sourceWindow.tabs.length) {
            source.windows.splice(payload.sourceWindowIndex, 1);
          }

          if (source.tabsNumber <= 0 || !source.windows.length) {
            await remove(sourceSummary);
          } else {
            await put(source);
          }
        }
      }
    }
    await put(target);
  }

  async function removeAll() {
    const length = get({ subscribe }).length;

    if (!length) {
      notification.error(
        i18n.getMessage('notifyDeleteAllFailUndefined'),
        '[sessions.removeAll] sessions are already empty'
      );
      return;
    }

    await sessionsDB.deleteSessions();

    set([]); //Empty the array, no longer needed

    select(get(currentSession));

    notification.success_warning(i18n.getMessage('notifyDeleteAllSuccess'));

    notify([]);
  }

  async function select(session: ESession) {
    settings.changeSetting('selectionId', session.id);
    await selectById(session.id);
  }

  // Without a call to changeSetting - this is used in certain area where we do not need to save storage.
  async function selectById(selectionId: 'current' | UUID) {
    const currentSelection = get(selection);

    if (
      currentSelection?.id === selectionId &&
      (selectionId === 'current' || Array.isArray(currentSelection?.windows))
    ) {
      if (selectionId === 'current') selection.set(get(currentSession));
      return;
    }

    clearSelection();

    if (selectionId === 'current') return selection.set(get(currentSession));

    const windowsPromise = sessionsDB.loadSessionWindows(selectionId as UUID);

    const sessions = get({ subscribe });

    for (const session of sessions) {
      if (session.id === selectionId) {
        //TODO: remove the ability to set
        const loadedWindows = await windowsPromise;
        session.windows = Array.isArray(loadedWindows) ? loadedWindows : [];

        selection.set(session);
        return;
      }
    }

    return select(get(currentSession));
  }

  function clearSelection() {
    const value = get(selection);

    if (
      value?.id !== 'current' &&
      Array.isArray(value?.windows) &&
      value.windows.length
    ) {
      value.windows = { length: value.windows.length } as EWindow[];
    }
  }

  function notify(sessions: ESession[], selectedId?: UUID | 'current') {
    log.info('[db.notify]: init');
    sendMessage({ message: 'notifyChangeDB', sessions, selectedId });
  }

  browser.runtime.onMessage.addListener((request) => {
    if (request.message === 'notifyChangeDB') {
      set(request.sessions);

      if (!request.selectedId) return;

      selectById(request.selectedId);
    }
  });

  return {
    subscribe,
    load,
    add,
    addEmptyGroup,
    put,
    filter,
    remove,
    removeAll,
    moveTab,
    selection: {
      subscribe: selection.subscribe,
      select,
      selectById,
      set: selection.set
    } //TODO: remove the ability to set
  };
})();

export const filtered = (() => {
  let currentQuery = '';
  let filteredList: ESession[] = [];

  const { subscribe } = derived(
    [sessions, filterOptions],
    ([$sessions, $filterOptions], set: (val: ESession[]) => void) => {
      const { query, tagsFilter, sortMethod } = $filterOptions;

      if (!query) {
        set(filterTagsAndSort($sessions, sortMethod, tagsFilter));
      } else if (currentQuery !== query) {
        currentQuery = query;

        sessions.filter(query.trim().toLowerCase()).then((val) => {
          filteredList = val;

          set(filterTagsAndSort(filteredList, sortMethod, tagsFilter));
        });
      } else set(filterTagsAndSort(filteredList, sortMethod, tagsFilter));
    }
  );

  return { subscribe };
})();

export const tags = derived(sessions, ($sessions) => {
  const tagsList: Record<string, number> = {};

  for (const session of $sessions) {
    if (session.tags) {
      tagsList[session.tags] = (tagsList[session.tags] ?? 0) + 1;
    }
  }

  return tagsList;
});

export const currentSession: Writable<ESession> = writable();
