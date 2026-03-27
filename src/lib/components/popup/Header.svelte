<script lang="ts">
  import { EXT_MODE, EXT_NAME, isPopup } from '@/lib/constants';
  import { filterOptions, notification, settings } from '@/lib/stores';
  import type { ThemeMode } from '@/lib/types';
  import {
    SearchBar,
    Notification,
    Modal,
    Donate,
    Sorting,
    TagFilter,
    AuthButton
  } from '@/lib/components';
  import { openFullView, openOptions } from '@utils/extension';
  import { tooltip } from '@/lib/utils';
  import { i18n } from 'webextension-polyfill';

  let showDonateModal = false;
  let showThemeMenu = false;

  const themeOptions: {
    value: ThemeMode;
    label: string;
    icon: string;
  }[] = [
    { value: 'system', label: 'System', icon: 'brightness_auto' },
    { value: 'dark', label: 'Dark', icon: 'dark_mode' },
    { value: 'light', label: 'Light', icon: 'light_mode' }
  ];

  $: currentTheme = $settings.theme ?? ($settings.darkMode ? 'dark' : 'light');
  $: currentThemeIcon =
    currentTheme === 'dark'
      ? 'dark_mode'
      : currentTheme === 'light'
        ? 'light_mode'
        : 'brightness_auto';
</script>

<svelte:window on:click={() => (showThemeMenu = false)} />

<header
  class="relative z-[80] flex h-14 items-center gap-3 border-b border-outline-variant/15 bg-surface/85 px-5 backdrop-blur-xl shadow-[0_10px_30px_rgba(27,28,25,0.04)]"
>
  <div class="flex items-center gap-2 mr-2">
    <span class="font-headline text-xl font-bold tracking-tight text-primary italic">
      {EXT_NAME}
    </span>
    {#if EXT_MODE}
      <span
        class="rounded-full border border-primary/20 bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary"
      >
        {EXT_MODE}
      </span>
    {/if}
  </div>

  <TagFilter />
  <Sorting />

  <Notification detail={$notification} />

  <div class="ml-auto flex items-center gap-1">
    <SearchBar bind:value={$filterOptions.query} />

    <AuthButton />

    <div class="relative">
      <button
        use:tooltip={{ title: `Theme: ${currentTheme}` }}
        class="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
        title={`Theme: ${currentTheme}`}
        on:click|stopPropagation={() => (showThemeMenu = !showThemeMenu)}
      >
        <span class="material-symbols-outlined text-[20px]">{currentThemeIcon}</span>
      </button>

      {#if showThemeMenu}
        <div
          role="menu"
          tabindex="-1"
          aria-label="Theme selection"
          class="absolute right-0 top-full z-[90] mt-2 flex w-36 flex-col rounded-xl border border-outline-variant/25 bg-surface-container-lowest p-1.5 shadow-xl"
          on:mousedown|stopPropagation
        >
          {#each themeOptions as option}
            <button
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all {currentTheme ===
              option.value
                ? 'bg-primary/15 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}"
              on:click={() => {
                settings.setTheme(option.value);
                showThemeMenu = false;
              }}
            >
              <span class="material-symbols-outlined text-[18px]">{option.icon}</span>
              {option.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    {#if isPopup}
      <button
        use:tooltip={{ title: i18n.getMessage('labelFullView') }}
        class="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
        title={i18n.getMessage('labelFullView')}
        on:click={async () => {
          await openFullView();
          window.close();
        }}
      >
        <span class="material-symbols-outlined text-[20px]">open_in_new</span>
      </button>
    {/if}

    <button
      use:tooltip={{ title: i18n.getMessage('labelDonate') }}
      class="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
      title={i18n.getMessage('labelDonate')}
      on:click={() => (showDonateModal = true)}
    >
      <span class="material-symbols-outlined text-[20px]">favorite</span>
    </button>

    <button
      use:tooltip={{ title: i18n.getMessage('labelSettings') }}
      class="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
      title={i18n.getMessage('labelSettings')}
      on:click={async () => {
        await openOptions();
        if (isPopup) window.close();
      }}
    >
      <span class="material-symbols-outlined text-[20px]">settings</span>
    </button>
  </div>
</header>

<Modal bind:open={showDonateModal} height="100%" width="100%">
  <svelte:fragment slot="header"
    >{i18n.getMessage('aboutDonateHeading')}</svelte:fragment
  >
  <svelte:fragment slot="content">
    <Donate />
  </svelte:fragment>
</Modal>
