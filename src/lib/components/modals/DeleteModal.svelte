<script>
  import { createEventDispatcher } from 'svelte';
  import { Modal } from '@/lib/components';
  import { i18n } from 'webextension-polyfill';

  export let open = false;

  const dispatch = createEventDispatcher();
</script>

<Modal bind:open>
  <svelte:fragment slot="header">
    {i18n.getMessage('deleteModalTitle')}
  </svelte:fragment>

  <svelte:fragment slot="content">
    <p class="text-sm font-medium text-on-surface-variant">
      {i18n.getMessage('deleteModalContent')}
    </p>
  </svelte:fragment>

  <svelte:fragment slot="footer">
    <button
      type="button"
      class="rounded-xl bg-error px-5 py-2 text-sm font-bold text-white hover:bg-error-focus transition-all shadow-lg shadow-error/20"
      on:click={() => dispatch('deleteAction')}
    >
      {i18n.getMessage('labelDelete')}
    </button>
  </svelte:fragment>
</Modal>
