<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Modal, ColorInput, Tag } from '@/lib/components';
  import { getStorageItem } from '@/lib/utils';
  import { settings } from '@/lib/stores';
  import { i18n } from 'webextension-polyfill';

  export let open = false;

  let tags: Record<string, { bgColor: string; textColor: string }>;

  let selectVal = 'createANewTag';

  const defualtNewTag = { name: '', bgColor: 'royalblue', textColor: 'white' };

  let tag = defualtNewTag;

  $: tag =
    selectVal === 'createANewTag'
      ? defualtNewTag
      : {
          name: selectVal,
          bgColor: $settings.tags[selectVal]?.bgColor ?? 'royalblue',
          textColor: $settings.tags[selectVal]?.textColor ?? 'white'
        };

  $: if (open) {
    getStorageItem('tags', {}).then((value) => {
      tags = value;
    });
  } else {
    tag = defualtNewTag;
  }

  const dispatch = createEventDispatcher<{ tagSubmit: string }>();
</script>

<Modal bind:open height="full">
  <svelte:fragment slot="header"
    >{i18n.getMessage('labelAddTag')}</svelte:fragment
  >
  <svelte:fragment slot="content">
    <form
      class="flex h-full w-full flex-col gap-5"
      on:submit|preventDefault={() => {
        if (selectVal === 'createANewTag') {
          if (tag.name.trim()) {
            const tags = $settings.tags;
            tags[tag.name] = {
              bgColor: tag.bgColor,
              textColor: tag.textColor
            };

            settings.changeSetting('tags', tags);

            dispatch('tagSubmit', tag.name);
          }
        } else dispatch('tagSubmit', selectVal);

        open = false;
      }}
    >
      <label class="flex flex-col gap-2 text-sm font-medium text-on-surface">
        <span class="text-on-surface-variant">
          {i18n.getMessage('tagsModalSelectTag')}
        </span>
        <select
          name="tags"
          id="tags"
          class="w-full rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-2 text-sm text-on-surface outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          bind:value={selectVal}
        >
          <option value={'createANewTag'}>{i18n.getMessage('labelAddTag')}</option>
          {#if tags}
            {#each Object.keys(tags) as tag}
              <option value={tag}>{tag}</option>
            {/each}
          {/if}
        </select>
      </label>

      {#if selectVal === 'createANewTag'}
        <div class="flex flex-col gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
          <label class="flex flex-col gap-2 text-sm font-medium text-on-surface">
            <span class="text-on-surface-variant">
              {i18n.getMessage('labelSortName')}
            </span>
            <input
              type="text"
              minlength="1"
              maxlength="15"
              placeholder={i18n.getMessage('tagPlaceholder')}
              class="w-full rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-2 text-sm text-on-surface outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              value={tag.name}
              on:input={(event) => {
                const value = event.currentTarget.value;

                if (value.length > 15)
                  return (event.currentTarget.value = tag.name);

                tag.name = value;
              }}
            />
          </label>

          <div class="grid grid-cols-2 gap-3">
            <ColorInput bind:color={tag.bgColor}
              >{i18n.getMessage('settingsTagsBackground')}</ColorInput
            >
            <ColorInput bind:color={tag.textColor}
              >{i18n.getMessage('settingsTagsText')}</ColorInput
            >
          </div>
        </div>
      {/if}

      <div class="flex flex-col gap-2 text-sm font-medium text-on-surface">
        <span class="text-on-surface-variant">
          {i18n.getMessage('settingsTagsPreview')}
        </span>
        <Tag
          class="min-h-[2rem] max-w-[12rem] bg-surface-container-high"
          bind:name={tag.name}
          bind:bgColor={tag.bgColor}
          bind:textColor={tag.textColor}
        />
      </div>

      <button
        class="mt-auto rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:bg-primary-focus disabled:bg-surface-container-high disabled:text-on-surface-variant/40 disabled:shadow-none"
        disabled={!tag.name.trim()}>{i18n.getMessage('labelAddTag')}</button
      >
    </form>
  </svelte:fragment>
</Modal>
