<script lang="ts">
  import browser, { i18n } from 'webextension-polyfill';
  import type { ETab, EWindow } from '@/lib/types';
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  import { settings } from '@/lib/stores';
  import { TabItem } from '@/lib/components';
  import { tooltip, sendMessage } from '@/lib/utils';

  const dispatch = createEventDispatcher<{
    delete: ETab | undefined;
  }>();

  export let window: EWindow;

  export let current = false;
  export let fill = false;

  let collapsed = false;

  $: active = window?.focused ? 'text-primary' : '';
</script>

{#if window?.tabs?.length}
  <li
    class="rounded-xl overflow-hidden glass-panel {fill
      ? 'flex h-full min-h-0 flex-col'
      : ''}"
  >
    <div
      class="group flex items-center gap-3 px-4 py-3 w-full bg-surface-container-high/40 hover:bg-surface-container-high/70 transition-all"
      role="button"
      tabindex="0"
      aria-expanded={!collapsed}
      on:click|stopPropagation={() => (collapsed = !collapsed)}
      on:keydown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          collapsed = !collapsed;
        }
      }}
    >
      <span
        role="img"
        aria-label={window?.incognito ? 'Private window' : 'Window'}
        class="material-symbols-outlined text-[18px] {active || 'text-on-surface-variant'}"
      >
        {window?.incognito ? 'visibility_off' : 'web_asset'}
      </span>

      <button
        use:tooltip={{ title: i18n.getMessage('popupTipOpen') }}
        aria-label="Open in a New Window"
        class="{active} w-max max-w-[50%] cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-on-surface hover:text-primary transition-colors"
        on:click={() => {
          sendMessage({
            message: 'openInNewWindow',
            window,
            discarded: $settings.discarded
          });
        }}
      >
        {i18n.getMessage(
          window?.incognito ? 'labelPrivateWindow' : 'labelWindow'
        )}
      </button>

      <span
        class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-info/15 text-info"
      >
        {window?.tabs?.length}
        {i18n.getMessage(
          window?.tabs?.length ?? 0 > 1 ? 'labelTabs' : 'labelTab'
        )}
      </span>

      <div class="ml-auto flex items-center gap-1">
        <button
          use:tooltip={{
            title: i18n.getMessage(current ? 'labelClose' : 'labelDelete')
          }}
          class="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-all opacity-0 group-hover:opacity-100"
          title={i18n.getMessage(current ? 'labelClose' : 'labelDelete')}
          on:click|stopPropagation={() => {
            if (current && window.id) browser.windows.remove(window.id);
            else dispatch('delete');
          }}
        >
          <span class="material-symbols-outlined text-[18px]"
            >{current ? 'close' : 'delete'}</span
          >
        </button>

        <button
          use:tooltip={{
            title: i18n.getMessage(collapsed ? 'labelExpand' : 'labelCollapse')
          }}
          class="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all"
          title={i18n.getMessage(collapsed ? 'labelExpand' : 'labelCollapse')}
          on:click|stopPropagation={() => (collapsed = !collapsed)}
        >
          <span class="material-symbols-outlined text-[18px]"
            >{collapsed ? 'expand_more' : 'expand_less'}</span
          >
        </button>
      </div>
    </div>

    {#if !collapsed && window && window.tabs}
      <ul
        class="flex flex-col gap-0.5 p-2 {fill
          ? 'min-h-0 flex-1 overflow-y-auto'
          : ''}"
        transition:fade={{ duration: 200 }}
      >
        {#each window.tabs as tab}
          <TabItem {tab} on:delete {current} />
        {/each}
      </ul>
    {/if}
  </li>
{/if}
