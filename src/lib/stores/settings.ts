import { i18n, storage, type Storage } from 'webextension-polyfill';
import type { ESettings, FilterOptions } from '@/lib/types';
import { get, writable, type Writable } from 'svelte/store';
import { notification, sessions } from '@/lib/stores';
import { authStore } from '@/lib/stores/auth';
import {
  getStorage,
  setStorage,
  applyTheme,
  bindSystemThemeListener,
  getSystemDarkMode,
  log,
  getStorageItem,
  resolveThemeMode
} from '@/lib/utils';
import { autoSaveDefaults } from '@/lib/constants';

export const filterOptions: Writable<FilterOptions> = writable({
  query: '',
  sortMethod: 'newest',
  tagsFilter: '__all__'
});

export const settings = (() => {
  let loaded: Promise<ESettings>;
  let applyingRemotePreferences = false;

  const defaultSettings: ESettings = {
    theme: 'system',
    popupView: true,
    dashboardEnabled: true,
    dashboardTabId: undefined,
    dashboardWindowId: undefined,
    dashboardLastWindowId: undefined,
    dashboardLastOpenedAt: undefined,
    darkMode: getSystemDarkMode(),
    selectionId: 'current',
    discarded: true,
    urlFilterList: undefined,
    autoSave: autoSaveDefaults.autoSave,
    autoSaveMaxSessions: autoSaveDefaults.autoSaveMaxSessions,
    autoSaveTimer: autoSaveDefaults.autoSaveTimer,
    tags: {},
    doNotAskForTitle: true,
    exportCompressed: true,
    excludePinned: true,
    sortMethod: 'newest',
    tagsFilter: '__all__'
  };

  const { subscribe, set, update } = writable(defaultSettings);

  authStore.onPreferences(async (preferences) => {
    if (!preferences) {
      await authStore.pushPreferences(get({ subscribe }));
      return;
    }

    const current = get({ subscribe });
    const patch: Partial<ESettings> = {};

    if (preferences.theme && preferences.theme !== current.theme)
      patch.theme = preferences.theme;

    if (preferences.sortGroupsBy && preferences.sortGroupsBy !== current.sortMethod)
      patch.sortMethod = preferences.sortGroupsBy;

    if (!Object.keys(patch).length) return;

    applyingRemotePreferences = true;
    await setStorage(patch);
    applyingRemotePreferences = false;
  });

  init();
  bindSystemThemeListener(() => currentThemeMode);

  storage.local.onChanged.addListener(onStorageChange);

  let currentThemeMode = defaultSettings.theme;

  async function init() {
    if (loaded) {
      await loaded;
      return;
    }

    log.info('[settings.init]');

    loaded = getStorage(defaultSettings);

    const settings = await loaded;
    const hasTheme =
      typeof (settings as Partial<ESettings>).theme === 'string';
    const theme = hasTheme
      ? settings.theme
      : settings.darkMode
        ? 'dark'
        : 'light';

    settings.theme = theme;
    settings.darkMode = resolveThemeMode(theme);
    currentThemeMode = theme;

    set(settings);

    applyTheme(theme, false);

    await authStore.pushPreferences(settings);

    if (!hasTheme) setStorage({ theme, darkMode: settings.darkMode });

    filterOptions.set({
      sortMethod: settings.sortMethod,
      tagsFilter: settings.tagsFilter,
      query: ''
    });

    loaded = Promise.resolve({} as ESettings);

    const updated = await getStorageItem('updated' as keyof ESettings, false);

    if (updated) {
      notification.set({
        msg: i18n.getMessage('notifyExtUpdate', __EXT_VER__),
        type: 'info'
      });

      setStorage({ updated: false });
    }
  }

  function onStorageChange(changes: Storage.StorageAreaOnChangedChangesType) {
    update((settings) => {
      for (const change in changes) {
        (settings[change as keyof ESettings] as ESettings[keyof ESettings]) =
          changes[change]?.newValue ??
          defaultSettings[change as keyof ESettings];

        if (change === 'theme') {
          currentThemeMode = settings.theme;
          settings.darkMode = resolveThemeMode(settings.theme);
          applyTheme(settings.theme, true);
        }

        if (change === 'darkMode' && !('theme' in changes))
          applyTheme(settings[change], true);

        if (change === 'selectionId')
          sessions.selection.selectById(settings[change]);

        if (change === 'sortMethod' || change === 'tagsFilter')
          filterOptions.update((val) => {
            (val[
              change as keyof FilterOptions
            ] as FilterOptions[keyof FilterOptions]) = settings[change];

            return val;
          });
      }
      return settings;
    });
  }

  function clear() {
    return storage.local.clear();
  }

  return {
    subscribe,
    init,
    changeSetting<K extends keyof ESettings>(key: K, value: ESettings[K]) {
      setStorage({ [key]: value });

      update((settings: ESettings) => {
        settings[key] = value;

        return settings;
      });

      if (!applyingRemotePreferences)
        authStore.pushPreferences(get({ subscribe }));
    },
    setTheme(theme: ESettings['theme']) {
      const darkMode = resolveThemeMode(theme);

      currentThemeMode = theme;
      applyTheme(theme, true);
      setStorage({ theme, darkMode });

      update((settings: ESettings) => {
        settings.theme = theme;
        settings.darkMode = darkMode;

        return settings;
      });

      if (!applyingRemotePreferences)
        authStore.pushPreferences(get({ subscribe }));
    },
    clear
  };
})();
