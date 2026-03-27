<script lang="ts">
  import { tick } from 'svelte';
  import { isInputTarget, tooltip } from '@/lib/utils';
  import { i18n } from 'webextension-polyfill';

  export let value: string;

  export { className as class };
  let className = '';

  let showInputBar = false;

  let inputEl: HTMLInputElement;

  async function handleInputBar(ev: FocusEvent) {
    if (ev?.type === 'focusin') {
      showInputBar = true;
      await tick();
      inputEl?.focus();
    } else if (
      ev?.type == 'focusout' &&
      !(ev?.currentTarget as Node).contains(ev?.relatedTarget as Node) &&
      value === ''
    )
      showInputBar = false;
  }

  function handleKeydown(ev: KeyboardEvent) {
    if (
      (ev.target instanceof HTMLElement && isInputTarget(ev.target)) ||
      ev.repeat ||
      ev.ctrlKey ||
      ev.shiftKey ||
      ev.altKey ||
      ev.metaKey
    )
      return;

    if (ev.code === 'KeyF') {
      handleInputBar({ type: 'focusin' } as FocusEvent);
      ev.preventDefault();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="flex items-center rounded-full transition-all duration-200 {showInputBar
    ? 'bg-surface-container-high/80 border border-primary/20 px-3 py-1 gap-2'
    : 'cursor-pointer'} {className}"
  on:focusin={handleInputBar}
  on:focusout={handleInputBar}
  tabindex="-1"
>
  {#if showInputBar}
    <span class="material-symbols-outlined text-on-surface-variant text-[18px]"
      >search</span
    >
    <input
      bind:this={inputEl}
      on:keydown={(event) => {
        if (event.key === 'Escape') showInputBar = false;
      }}
      spellcheck={false}
      type="text"
      placeholder={i18n.getMessage('labelSearchPlaceholder')}
      bind:value
      class="bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/50 w-28"
    />
    <button
      use:tooltip={{ title: i18n.getMessage('labelClose') }}
      class="p-0.5 text-on-surface-variant hover:text-error transition-colors rounded-full"
      on:click={() => {
        if (value === '') showInputBar = false;
        value = '';
      }}
    >
      <span class="material-symbols-outlined text-[16px]">close</span>
    </button>
  {:else}
    <button
      use:tooltip={{ title: i18n.getMessage('labelSearchPlaceholder') }}
      class="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors rounded-full"
    >
      <span class="material-symbols-outlined text-[20px]">search</span>
    </button>
  {/if}
</div>
