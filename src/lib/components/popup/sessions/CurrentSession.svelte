<script lang="ts">
  import browser, { i18n } from 'webextension-polyfill';
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { settings, sessions, currentSession as session } from '@/lib/stores';
  import { tooltip, getSession, isExtensionViewed } from '@/lib/utils';

  const dispatch = createEventDispatcher();

  let timeout: NodeJS.Timeout;

  $: selection = sessions.selection;

  $: selected = $selection === $session;

  document.addEventListener('visibilitychange', handleVisibility);

  settings.init().then(handleVisibility);

  onDestroy(() => {
    removeEvents();

    document.removeEventListener('visibilitychange', handleVisibility);
  });

  function handleVisibility() {
    if (isExtensionViewed()) {
      handleUpdate();
      addEvents();
      return;
    }

    removeEvents();
  }

  function addEvents() {
    browser.windows.onFocusChanged.addListener(handleUpdate);
    browser.tabs.onCreated.addListener(handleUpdate);
    browser.tabs.onUpdated.addListener(handleUpdate);
    browser.tabs.onActivated.addListener(handleUpdate);
    browser.tabs.onMoved.addListener(handleUpdate);
    browser.tabs.onDetached.addListener(handleUpdate);
    browser.tabs.onRemoved.addListener(handleRemoval);
  }

  function removeEvents() {
    browser.windows.onFocusChanged.removeListener(handleUpdate);
    browser.tabs.onCreated.removeListener(handleUpdate);
    browser.tabs.onUpdated.removeListener(handleUpdate);
    browser.tabs.onActivated.removeListener(handleUpdate);
    browser.tabs.onMoved.removeListener(handleUpdate);
    browser.tabs.onDetached.removeListener(handleUpdate);
    browser.tabs.onRemoved.removeListener(handleRemoval);
  }

  function handleRemoval(
    tabId: number,
    removeInfo: browser.Tabs.OnRemovedRemoveInfoType
  ) {
    const window_index = $session.windows.findIndex(
      (window) => window.id === removeInfo.windowId
    );

    if (window_index === -1) return;

    const window = $session.windows[window_index]!;

    let length = 1;

    if (!removeInfo.isWindowClosing && window.tabs?.length) {
      const tab_index = window.tabs.findIndex((tab) => tab.id === tabId);

      if (tab_index === -1) return;

      window.tabs.splice(tab_index, 1);
    }

    if (removeInfo.isWindowClosing || !window.tabs?.length) {
      length = window.tabs?.length || length;

      $session.windows.splice(window_index, 1);
    }

    $session.tabsNumber -= length;

    if ($settings.selectionId === 'current') selection.selectById('current');
  }

  async function handleUpdate() {
    clearTimeout(timeout);

    timeout = setTimeout(async () => {
      $session = await getSession({
        pinned: $settings.excludePinned ? false : undefined,
        url: $settings.urlFilterList
      });

      if ($settings.selectionId === 'current')
        selection.selectById($session.id);
    }, 50);
  }
</script>

<div class="mb-3 flex flex-col gap-3">
  <button
    use:tooltip={{ title: i18n.getMessage('labelSave') }}
    class="inline-flex w-fit items-center gap-2 rounded-xl border border-primary/20 bg-surface-container-high px-4 py-2.5 text-sm font-bold text-primary shadow-lg shadow-primary/10 transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary-focus"
    title={i18n.getMessage('labelSave')}
    on:click|stopPropagation={() => dispatch('save')}
  >
    <span class="material-symbols-outlined text-[22px]">save</span>
    <span>{i18n.getMessage('labelSave')}</span>
  </button>

  <div
    class="group flex w-full items-center gap-3 rounded-xl border p-3 pr-12 transition-all duration-200 {selected
      ? 'bg-primary/15 border-primary/30 shadow-[0_0_15px_rgba(212,175,55,0.08)]'
      : 'bg-surface-container/60 border-transparent hover:bg-surface-container-high/60 hover:border-primary/10'}"
    role="button"
    tabindex="0"
    on:click={() => selection.select($session)}
    on:keydown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selection.select($session);
      }
    }}
  >
    <div class="flex items-center gap-2">
      <span class="relative flex h-2 w-2">
        <span
          class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"
        ></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-primary"
        ></span>
      </span>
      <p
        class="max-w-max flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-on-surface"
      >
        {i18n.getMessage('labelCurrentSession')}
      </p>
    </div>

    <div class="ml-auto flex items-center gap-2">
      <div
        class="session-card"
        use:tooltip={{
          title: `${$session?.windows?.length} ${i18n.getMessage(
            $session?.windows?.length > 1 ? 'labelWindows' : 'labelWindow'
          )}`
        }}
      >
        <span class="material-symbols-outlined text-[14px]">web_asset</span>
        {$session?.windows?.length ?? 0}
      </div>

      <div
        class="session-card"
        use:tooltip={{
          title: `${$session?.tabsNumber} ${i18n.getMessage(
            $session?.tabsNumber > 1 ? 'labelTabs' : 'labelTab'
          )}`
        }}
      >
        <span class="material-symbols-outlined text-[14px]">tab</span>
        {$session?.tabsNumber ?? 0}
      </div>
    </div>
  </div>
</div>
