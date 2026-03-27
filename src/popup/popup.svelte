<script lang="ts">
  import { onDestroy } from 'svelte';
  import { EXT_NAME, isPopup } from '@/lib/constants';
  import { settings } from '@/lib/stores/';
  import { openFullView } from '@utils/extension';
  import { CommandPalette, Header, Sessions } from '@/lib/components';
  import { isInputTarget } from '@/lib/utils';

  if (isPopup) {
    document.documentElement.classList.add('extension-popup');
  }

  onDestroy(() => {
    document.documentElement.classList.remove('extension-popup');
  });

  shouldLoadPopup();

  async function shouldLoadPopup() {
    await settings.init();

    if (!isPopup) return;

    if (!$settings.popupView) {
      await openFullView();

      window.close();
    }
  }

  let open = false;
</script>

<svelte:head>
  <title>
    {EXT_NAME}
  </title>
</svelte:head>

<svelte:window
  on:keydown={(ev) => {
    if (
      (ev.target instanceof HTMLElement && isInputTarget(ev.target)) ||
      ev.repeat ||
      ev.shiftKey ||
      ev.altKey ||
      ev.metaKey
    )
      return;

    if (ev.code === 'KeyK' && ev.ctrlKey) {
      open = !open;
      ev.preventDefault();
    }
  }}
/>

<div class="popup-shell flex h-full w-full flex-col overflow-hidden bg-background">
  <Header />
  <Sessions />
</div>
<CommandPalette bind:open />

<style>
  :global(html, body) {
    overflow: hidden;
  }

  :global(html.extension-popup),
  :global(html.extension-popup body),
  :global(html.extension-popup body #root) {
    width: 800px;
    min-width: 800px;
    height: 520px;
    min-height: 520px;
  }
</style>
