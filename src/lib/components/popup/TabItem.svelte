<script lang="ts">
  import browser, { i18n } from 'webextension-polyfill';
  import type { ETab } from '@/lib/types';
  import { createEventDispatcher } from 'svelte';
  import { filterOptions } from '@/lib/stores';
  import { getFavIcon, getFavIconType, markResult, tooltip } from '@/lib/utils';

  export let tab: ETab;
  export let current = false;
  export let viewMode: 'list' | 'card' = 'list';
  export let sourceSessionId = 'current';
  export let sourceWindowIndex = 0;
  export let sourceTabIndex = 0;

  const dispatch = createEventDispatcher<{ delete: ETab }>();
  let isDragging = false;

  $: active = tab.active ? 'text-primary' : '';

  $: favIconUrl = getFavIcon(tab.url, tab.favIconUrl);

  $: title =
    $filterOptions?.query.trim() && tab.title
      ? markResult(tab.title, $filterOptions?.query, {
          case_sensitive: false
        })
      : tab.title;

  $: hostname = (() => {
    try {
      return new URL(tab.url ?? '').hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  })();

  $: pathLabel = (() => {
    try {
      const url = new URL(tab.url ?? '');
      return `${url.hostname.replace(/^www\./, '')}${url.pathname === '/' ? '' : url.pathname}`;
    } catch {
      return tab.url ?? '';
    }
  })();

  $: cardLabel = (() => {
    switch (getFavIconType(tab.url ?? '')) {
      case 'extension':
        return 'Extension';
      case 'settings':
        return 'Settings';
      case 'history':
        return 'History';
      case 'global':
        return 'Website';
      default:
        return 'Saved tab';
    }
  })();

  const iconMap: Record<string, string> = {
    default: 'article',
    global: 'language',
    extension: 'extension',
    settings: 'settings',
    history: 'schedule'
  };

  function handleDragStart(event: DragEvent) {
    if (!event.dataTransfer) return;

    isDragging = true;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(
      'application/x-sessionic-tab',
      JSON.stringify({
        tab,
        sourceSessionId,
        sourceWindowIndex,
        sourceTabIndex
      })
    );
    event.dataTransfer.setData('text/plain', tab.title ?? tab.url ?? 'Tab');
  }

  function clearDraggingState() {
    isDragging = false;
  }
</script>

<svelte:window on:dragend={clearDraggingState} on:drop={clearDraggingState} />

{#if tab?.url}
  <li
    class="tab-container group relative min-w-0 {isDragging ? 'tab-container-dragging' : ''} {viewMode === 'card'
      ? 'h-full max-h-[17.5rem] w-full max-w-[17.5rem] flex-col items-start justify-between gap-4 overflow-hidden rounded-[1.6rem] border border-[rgba(229,193,133,0.45)] bg-[linear-gradient(180deg,rgba(var(--primary),0.09),rgba(var(--surface-container-low),0.96))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.16)]'
      : 'w-full'}"
    draggable={true}
    on:dragstart={handleDragStart}
    on:dragend={clearDraggingState}
  >
    {#if isDragging}
      <span
        class="tab-drag-badge {viewMode === 'card'
          ? 'tab-drag-badge-card right-4 top-4'
          : 'right-2 top-1/2 -translate-y-1/2'}"
        aria-hidden="true"
      >
        <span class="material-symbols-outlined text-[13px]">add</span>
      </span>
    {/if}

    {#if viewMode === 'card'}
      {#if isDragging}
        <div class="tab-card-drag-overlay" aria-hidden="true">
          <span class="tab-card-drag-pill">
            <span class="material-symbols-outlined text-[15px]">add</span>
            Drop into group
          </span>
        </div>
      {/if}

      <button
        use:tooltip={{
          title: i18n.getMessage(current ? 'labelClose' : 'labelDelete')
        }}
        class="absolute right-4 top-4 rounded-xl p-2 text-on-surface-variant/65 transition-all hover:bg-error/10 hover:text-error opacity-0 group-hover:opacity-100"
        title={i18n.getMessage(current ? 'labelClose' : 'labelDelete')}
        on:click={() => {
          if (current && tab.id) browser.tabs.remove(tab.id);
          else dispatch('delete', tab);
        }}
      >
        <span class="material-symbols-outlined text-[18px]"
          >{current ? 'close' : 'delete'}</span
        >
      </button>

      <a
        class="flex w-full flex-1 flex-col items-start gap-4 hover:text-primary transition-colors"
        href={tab.url}
        target="_blank"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          {#if favIconUrl}
            <img
              class="h-6 w-6 object-contain"
              src={favIconUrl}
              alt=""
              role="presentation"
            />
          {:else}
            <span
              class="material-symbols-outlined text-[22px] text-primary"
            >
              {iconMap[getFavIconType(tab.url)] ?? 'article'}
            </span>
          {/if}
        </div>

        <div class="flex w-full flex-col gap-1.5 overflow-hidden">
          <span
            class="line-clamp-2 text-[1.05rem] font-semibold leading-6 text-on-surface"
          >
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html title}
          </span>
          <span class="line-clamp-2 text-sm leading-5 text-on-surface-variant/85">
            {pathLabel}
          </span>
        </div>

        <div class="mt-auto flex w-full items-end justify-between gap-3 pt-2 overflow-hidden">
          <div class="flex min-w-0 items-center gap-2">
            <span
              class="rounded-full border border-primary/18 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
            >
              {cardLabel}
            </span>
            {#if current && tab.active}
              <span class="text-xs font-semibold text-info">Active</span>
            {/if}
          </div>
          <span class="truncate text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">
            {hostname}
          </span>
        </div>
      </a>
    {:else}
      <a
        class="flex min-w-0 max-w-full flex-1 items-center gap-3 overflow-hidden hover:text-primary transition-colors md:max-w-[512px]"
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
          class="block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium {active ||
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
    {/if}
  </li>
{/if}
