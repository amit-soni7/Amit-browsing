<script lang="ts">
  import type { ETab, EWindow } from '@/lib/types';
  import { sessions, currentSession } from '@/lib/stores';
  import { Window } from '@/lib/components';

  export { className as class };
  let className = '';
  export let viewMode: 'list' | 'card' = 'list';

  $: session = sessions.selection;

  $: current = $session === $currentSession;
  $: sessionWindows = Array.isArray($session?.windows) ? $session.windows : [];
  $: flattenedTabs = sessionWindows.flatMap((window) => window.tabs ?? []);
  $: displayWindow = {
    tabs: flattenedTabs,
    focused: true,
    incognito: false,
    alwaysOnTop: false
  } as EWindow;

  function deleteTab(tab: ETab) {
    if (!$session || !Array.isArray($session.windows)) return;

    let removed = false;

    for (let windowIndex = $session.windows.length - 1; windowIndex >= 0; windowIndex -= 1) {
      const window = $session.windows[windowIndex];
      if (!window?.tabs?.length) continue;

      const tabIndex = window.tabs.findIndex(
        (windowTab) =>
          windowTab === tab ||
          (tab.id && windowTab.id === tab.id) ||
          (windowTab.url === tab.url && windowTab.title === tab.title)
      );

      if (tabIndex === -1) continue;

      window.tabs.splice(tabIndex, 1);
      $session.tabsNumber = Math.max(0, $session.tabsNumber - 1);
      removed = true;

      if (!window.tabs.length) $session.windows.splice(windowIndex, 1);
      break;
    }

    if (!removed) return;

    sessions.put($session);

    if (!$session.windows.length || !$session.tabsNumber)
      session.select($currentSession);
  }
</script>

{#if sessionWindows.length && $session?.tabsNumber}
  <ul
    class="flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-x-hidden overflow-y-auto {className}"
  >
    <Window
      window={displayWindow}
      {current}
      {viewMode}
      windowIndex={0}
      fill={true}
      on:delete={(event) => {
        deleteTab(event.detail);
      }}
    />
  </ul>
{:else}
  <div class="flex flex-col items-center justify-center h-full gap-4">
    <span
      class="material-symbols-outlined text-[48px] text-on-surface-variant/20"
      >browser_updated</span
    >
    <h2 class="text-center text-base font-semibold text-on-surface-variant/50">
      Select a session or open some tabs
    </h2>
  </div>
{/if}
