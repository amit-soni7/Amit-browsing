<script lang="ts">
  import type { ETab } from '@/lib/types';
  import { sessions, currentSession } from '@/lib/stores';
  import { Window } from '@/lib/components';

  export { className as class };
  let className = '';

  let ulEl: HTMLUListElement;

  $: session = sessions.selection;

  $: current = $session === $currentSession;

  function deleteTab(windowIndex: number, tab: ETab) {
    if (!$session || !$session.windows) return;

    const window = $session.windows[windowIndex];

    if (!window) return;

    if (window.tabs?.length) {
      if (tab) {
        const tabIndex = window.tabs.indexOf(tab);

        if (tabIndex === -1) return;

        window.tabs.splice(tabIndex, 1);

        $session.tabsNumber--;
      } else $session.tabsNumber -= window.tabs?.length;
    }

    if (!window.tabs?.length || (!tab && window))
      $session.windows.splice(windowIndex, 1);

    sessions.put($session);

    if (!$session.windows.length || !$session.tabsNumber)
      session.select($currentSession);
  }
</script>

{#if $session?.windows && $session?.tabsNumber}
  <ul
    bind:this={ulEl}
    class="flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-x-hidden overflow-y-auto {className}"
  >
    {#each $session.windows as window, windowIndex}
      <Window
        {window}
        {current}
        fill={$session.windows.length === 1}
        on:delete={(event) => {
          deleteTab(windowIndex, event.detail);
        }}
      />
    {/each}
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
