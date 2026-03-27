import browser from 'webextension-polyfill';
import { createTab, openInNewWindow, openSession } from './utils/browser';
import { getSession, getWindowTabs } from '@/lib/utils/getSession';
import { sessionsDB } from '@/lib/utils/database';
import { generateSession } from '@/lib/utils/generateSession';
import { getStorage, setStorage } from '@/lib/utils/storage';
import { autoSaveDefaults } from '@/lib/constants/shared';
import type { ESession, ESettings } from '@/lib/types';
import { sendMessage } from '@/lib/utils/messages';
import {
  persistCurrentWorkspace,
  queueWorkspaceSnapshot,
  recordClosedEntity,
  refreshSessionCache
} from './utils/recovery';

async function createTimer() {
  const [settings, alarm] = await Promise.all([
    getStorage(autoSaveDefaults as ESettings),
    browser.alarms.get('auto-save')
  ]);

  if (
    settings.autoSave &&
    (typeof alarm === 'undefined' ||
      alarm.periodInMinutes !== settings.autoSaveTimer)
  )
    browser.alarms.create('auto-save', {
      periodInMinutes: settings.autoSaveTimer
    });
}

createTimer();
refreshSessionCache().then(() => persistCurrentWorkspace('startup-shutdown'));

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'auto-save') {
    const session = await getSession();
    session.title = 'Autosave';
    session.tags = 'Autosave';

    await sessionsDB.saveSession(
      generateSession(session, {
        kind: 'autosave',
        source: 'timer'
      })
    );

    const [count, { autoSaveMaxSessions, selectionId }] = await Promise.all([
      sessionsDB.getAutosavedCount(),
      getStorage({
        autoSaveMaxSessions: autoSaveDefaults.autoSaveMaxSessions,
        selectionId: 'current'
      } as ESettings)
    ]);

    if (count > autoSaveMaxSessions)
      sessionsDB.deleteLastAutosavedSession(count - autoSaveMaxSessions);

    sessionsDB.streamSessions('dateSaved', (sessions) => {
      sendMessage({
        message: 'notifyChangeDB',
        sessions,
        selectedId: selectionId
      });
    });

    sendMessage({ message: 'notifyRecoverySnapshots' });
  }
});

const queueTabSnapshot = () => queueWorkspaceSnapshot('startup-shutdown');

browser.windows.onCreated.addListener(queueTabSnapshot);
browser.windows.onRemoved.addListener(queueTabSnapshot);
browser.windows.onFocusChanged.addListener(queueTabSnapshot);
browser.tabs.onCreated.addListener(() => queueWorkspaceSnapshot('startup-shutdown'));
browser.tabs.onUpdated.addListener(() => queueWorkspaceSnapshot('startup-shutdown'));
browser.tabs.onActivated.addListener(() => queueWorkspaceSnapshot('startup-shutdown'));
browser.tabs.onMoved.addListener(() => queueWorkspaceSnapshot('startup-shutdown'));
browser.tabs.onAttached.addListener(() => queueWorkspaceSnapshot('startup-shutdown'));
browser.tabs.onDetached.addListener(() => queueWorkspaceSnapshot('startup-shutdown'));
browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  recordClosedEntity(tabId, removeInfo.windowId, removeInfo.isWindowClosing);
  queueWorkspaceSnapshot(removeInfo.isWindowClosing ? 'window-close' : 'tab-close');
});

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') setStorage({ updated: true });

  const contexts: browser.Menus.ContextType[] = ['page', 'action'];

  browser.contextMenus.create({ id: 'save', title: 'Save session', contexts });
  browser.contextMenus.create({
    id: 'save-window',
    title: 'Save window',
    contexts
  });

  //TODO
  // browser.contextMenus.create({
  //   id: 'save-left',
  //   title: 'Save all tabs to the left',
  //   contexts
  // });
  // browser.contextMenus.create({
  //   id: 'save-right',
  //   title: 'Save all tabs to the right',
  //   contexts
  // });
});

browser.contextMenus.onClicked.addListener(async ({ menuItemId }) => {
  const { excludePinned, urlFilterList: url } = await getStorage({
    excludePinned: true,
    urlFilterList: undefined
  } as ESettings);

  const pinned = excludePinned ? false : undefined;
  const title = browser.i18n.getMessage('labelUnnamedSession');

  switch (menuItemId) {
    case 'save':
      {
        const session = await getSession({
          pinned,
          url
        });

        if (!session.tabsNumber) return;

        session.title = title;

        sessionsDB.saveSession(generateSession(session));
      }
      break;
    case 'save-window':
      {
        const window = await browser.windows.getCurrent({ populate: false });
        window.tabs = await getWindowTabs({ pinned, url });

        if (!window.tabs?.length) return;

        const session = {
          title,
          windows: [window],
          tabsNumber: window.tabs.length
        } as ESession;

        sessionsDB.saveSession(generateSession(session));
      }
      break;
    // TODO
    // case 'save-left':
    //   break;
    // case 'save-right':
    //   break;
  }
});

browser.runtime.onMessage.addListener((request) => {
  switch (request.message) {
    case 'openInNewWindow': {
      openInNewWindow(request.window, request.discarded);
      break;
    }

    case 'createTab': {
      createTab(request.tab, undefined, request.discarded);
      break;
    }

    case 'openSession': {
      openSession(request.session, true, request.discarded);
      break;
    }

    case 'createTimer': {
      createTimer();
      break;
    }
  }
});
