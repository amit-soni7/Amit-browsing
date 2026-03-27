<script lang="ts">
  import browser, { i18n } from 'webextension-polyfill';
  import type { ETab } from '@/lib/types';
  import { createEventDispatcher } from 'svelte';
  import { filterOptions } from '@/lib/stores';
  import { getFavIcon, getFavIconType, markResult, tooltip } from '@/lib/utils';
  import { IconButton } from '@/lib/components';

  export let tab: ETab;
  export let current = false;

  const dispatch = createEventDispatcher<{ delete: ETab }>();

  $: active = tab.active ? 'text-primary' : '';

  $: favIconUrl = getFavIcon(tab.url, tab.favIconUrl);

  $: title =
    $filterOptions?.query.trim() && tab.title
      ? markResult(tab.title, $filterOptions?.query, {
          case_sensitive: false
        })
      : tab.title;

  const iconMap: Record<string, string> = {
    default: 'article',
    global: 'language',
    extension: 'extension',
    settings: 'settings',
    history: 'schedule'
  };

  function handleDragStart(event: DragEvent) {
    if (!current || !event.dataTransfer) return;

    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(
      'application/x-sessionic-tab',
      JSON.stringify(tab)
    );
    event.dataTransfer.setData('text/plain', tab.title ?? tab.url ?? 'Tab');
  }
</script>

{#if tab?.url}
  <li
    class="tab-container group"
    draggable={current}
    on:dragstart={handleDragStart}
  >
    <a
      class="flex items-center gap-3 w-max max-w-[88%] hover:text-primary transition-colors"
      href={tab.url}
      target="_blank"
    >
      {#if favIconUrl}
        <div
          class="w-5 h-5 min-w-[1.25rem] rounded overflow-hidden flex items-center justify-center"
        >
          <img
            class="w-4 h-4 object-contain"
            src={favIconUrl}
            alt=""
            role="presentation"
          />
        </div>
      {:else}
        <span
          class="material-symbols-outlined text-[18px] min-w-[1.25rem] {active ||
            'text-on-surface-variant'}"
        >
          {iconMap[getFavIconType(tab.url)] ?? 'article'}
        </span>
      {/if}
      <span
        class="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium {active ||
          'text-on-surface'}"
      >
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html title}
      </span>
    </a>

    <button
      use:tooltip={{
        title: i18n.getMessage(current ? 'labelClose' : 'labelDelete')
      }}
      class="ml-auto p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-all opacity-0 group-hover:opacity-100"
      title={i18n.getMessage(current ? 'labelClose' : 'labelDelete')}
      on:click={() => {
        if (current && tab.id) browser.tabs.remove(tab.id);
        else dispatch('delete', tab);
      }}
    >
      <span class="material-symbols-outlined text-[16px]"
        >{current ? 'close' : 'delete'}</span
      >
    </button>
  </li>
{/if}
