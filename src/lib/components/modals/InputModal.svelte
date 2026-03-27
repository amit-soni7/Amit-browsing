<script lang="ts">
  import { Modal } from '@/lib/components';
  import { createEventDispatcher, tick } from 'svelte';
  import { i18n } from 'webextension-polyfill';

  export let type: 'Save' | 'Rename';

  export let value = '';

  export let minlength = 1;
  export let maxlength = 120;

  let disabled = true;
  let errMsg = '';

  export let open = false;

  $: if (value?.length < minlength || value?.length > maxlength) {
    disabled = true;
    errMsg = i18n.getMessage('inputModalErrorLength', [
      minlength.toString(),
      maxlength.toString()
    ]);
  } else if (/[<>]/.test(value)) {
    disabled = true;
    errMsg = i18n.getMessage('inputModalErrorChar');
  } else disabled = false;

  let inputEl: HTMLInputElement;

  $: if (open) {
    tick().then(() => {
      inputEl?.focus();
    });
  } else {
    value = '';
  }

  const dispatch = createEventDispatcher<{ inputSubmit: string }>();

  async function submit() {
    dispatch('inputSubmit', value);

    value = '';
  }
</script>

<Modal bind:open height="12rem">
  <svelte:fragment slot="header"
    >{i18n.getMessage(
      type === 'Save' ? 'saveModalTitle' : 'renameModalTitle'
    )}</svelte:fragment
  >
  <svelte:fragment slot="content">
    <input
      bind:this={inputEl}
      class="w-[24rem] rounded-xl border border-outline-variant/40 bg-surface-container px-4 py-2.5 text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/40 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
      type="text"
      name={type}
      id={type}
      placeholder={i18n.getMessage('inputModalPlaceholder')}
      title="Session name"
      spellcheck={false}
      {minlength}
      {maxlength}
      bind:value
    />

    {#if disabled}
      <p
        class="mx-auto w-max rounded-lg bg-error/15 border border-error/20 text-error px-3 py-1.5 text-xs font-semibold"
      >
        {errMsg}
      </p>
    {/if}
  </svelte:fragment>

  <button
    {disabled}
    title="{type} session"
    slot="footer"
    type="button"
    class="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-on-primary hover:bg-primary-focus disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-on-surface-variant/40 transition-all shadow-lg shadow-primary/20 disabled:shadow-none"
    on:click={submit}>{i18n.getMessage(`label${type}`)}</button
  >
</Modal>
