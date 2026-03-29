import browser from 'webextension-polyfill';
import type { ESettings } from '@/lib/types';
import { getStorage, setStorage } from '@/lib/utils/storage';

const DASHBOARD_URL = browser.runtime.getURL('src/popup/index.html?tab=true');

const dashboardDefaults: Pick<
  ESettings,
  | 'dashboardEnabled'
  | 'dashboardTabId'
  | 'dashboardWindowId'
  | 'dashboardLastWindowId'
  | 'dashboardLastOpenedAt'
> = {
  dashboardEnabled: true,
  dashboardTabId: undefined,
  dashboardWindowId: undefined,
  dashboardLastWindowId: undefined,
  dashboardLastOpenedAt: undefined
};

let isEnforcing = false;

function normalizeMovedTab(result: browser.Tabs.Tab | browser.Tabs.Tab[]) {
  return Array.isArray(result) ? result[0] ?? null : result;
}

function isNormalWindowId(windowId?: number): windowId is number {
  return typeof windowId === 'number' && windowId >= 0;
}

async function getDashboardSettings() {
  return getStorage(dashboardDefaults);
}

async function updateDashboardState(
  patch: Partial<
    Pick<
      ESettings,
      | 'dashboardTabId'
      | 'dashboardWindowId'
      | 'dashboardLastWindowId'
      | 'dashboardLastOpenedAt'
    >
  >
) {
  await setStorage<ESettings>(patch);
}

async function getDashboardTabs() {
  return browser.tabs.query({ url: DASHBOARD_URL });
}

async function getBestWindowId(preferredWindowId?: number) {
  if (isNormalWindowId(preferredWindowId)) return preferredWindowId;

  const { dashboardLastWindowId } = await getDashboardSettings();

  if (isNormalWindowId(dashboardLastWindowId)) {
    try {
      const win = await browser.windows.get(dashboardLastWindowId, {
        populate: false
      });
      if (win.type === 'normal') return win.id;
    } catch {
      // stale window id
    }
  }

  try {
    const focused = await browser.windows.getLastFocused({ populate: false });
    if (focused.type === 'normal') return focused.id;
  } catch {
    // no focused window
  }

  const windows = await browser.windows.getAll({ populate: false });
  return windows.find((win) => win.type === 'normal')?.id;
}

async function persistDashboardTab(tab: browser.Tabs.Tab) {
  await updateDashboardState({
    dashboardTabId: tab.id,
    dashboardWindowId: tab.windowId,
    dashboardLastWindowId: tab.windowId,
    dashboardLastOpenedAt: Date.now()
  });
}

async function createDashboardTab(windowId?: number) {
  const targetWindowId = await getBestWindowId(windowId);
  if (!isNormalWindowId(targetWindowId)) return null;

  const tab = await browser.tabs.create({
    url: DASHBOARD_URL,
    windowId: targetWindowId,
    index: 0,
    active: true,
    pinned: true
  });

  await persistDashboardTab(tab);
  return tab;
}

async function enforceDashboardTab(
  tab: browser.Tabs.Tab,
  preferredWindowId?: number
) {
  if (!tab.id) return null;
  const settings = await getDashboardSettings();
  if (!settings.dashboardEnabled) return tab;

  const targetWindowId = await getBestWindowId(preferredWindowId ?? tab.windowId);
  if (!isNormalWindowId(targetWindowId)) return tab;

  isEnforcing = true;

  try {
    let currentTab = tab;

    if (currentTab.windowId !== targetWindowId) {
      const moved = normalizeMovedTab(
        await browser.tabs.move(currentTab.id, {
          windowId: targetWindowId,
          index: 0
        })
      );
      currentTab = moved ?? currentTab;
    }

    if (currentTab.index !== 0) {
      const moved = normalizeMovedTab(
        await browser.tabs.move(currentTab.id, { index: 0 })
      );
      currentTab = moved ?? currentTab;
    }

    if (!currentTab.pinned) {
      currentTab = await browser.tabs.update(currentTab.id, {
        pinned: true
      });
    }

    currentTab = await browser.tabs.update(currentTab.id, {
      active: true,
      highlighted: true
    });

    await persistDashboardTab(currentTab);
    return currentTab;
  } catch {
    return null;
  } finally {
    setTimeout(() => {
      isEnforcing = false;
    }, 50);
  }
}

export async function openDashboardTab(preferredWindowId?: number) {
  const { dashboardEnabled } = await getDashboardSettings();
  const tabs = await getDashboardTabs();
  const existing = tabs[0];

  if (!dashboardEnabled) {
    if (existing?.id) {
      return browser.tabs.update(existing.id, { active: true, highlighted: true });
    }

    return browser.tabs.create({
      url: DASHBOARD_URL,
      active: true,
      windowId: await getBestWindowId(preferredWindowId)
    });
  }

  if (!existing) return createDashboardTab(preferredWindowId);

  await Promise.all(
    tabs
      .filter((tab) => tab.id !== existing.id && typeof tab.id === 'number')
      .map((tab) => browser.tabs.remove(tab.id!).catch(() => undefined))
  );

  return enforceDashboardTab(existing, preferredWindowId);
}

export async function rememberFocusedWindow(windowId: number) {
  if (!isNormalWindowId(windowId)) return;

  try {
    const win = await browser.windows.get(windowId, { populate: false });
    if (win.type !== 'normal') return;
  } catch {
    return;
  }

  await updateDashboardState({ dashboardLastWindowId: windowId });
}

export async function handleDashboardTabRemoved(tabId: number) {
  const settings = await getDashboardSettings();
  if (settings.dashboardTabId !== tabId || !settings.dashboardEnabled) return;

  await updateDashboardState({
    dashboardTabId: undefined,
    dashboardWindowId: undefined
  });

  await createDashboardTab(
    settings.dashboardWindowId ?? settings.dashboardLastWindowId
  );
}

export async function handleDashboardTabChanged(
  tabId: number,
  maybeTab?: browser.Tabs.Tab
) {
  if (isEnforcing) return;

  const settings = await getDashboardSettings();
  if (!settings.dashboardEnabled) return;

  const tab =
    maybeTab ?? (await browser.tabs.get(tabId).catch(() => null));
  if (!tab) return;

  const isDashboard = tab.url === DASHBOARD_URL || settings.dashboardTabId === tabId;
  if (!isDashboard) return;

  if (tab.url !== DASHBOARD_URL) {
    if (settings.dashboardTabId === tabId) {
      await updateDashboardState({
        dashboardTabId: undefined,
        dashboardWindowId: undefined
      });
    }
    return;
  }

  await enforceDashboardTab(tab, tab.windowId);
}
