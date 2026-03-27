<script lang="ts">
  import {
    filterOptions,
    finished,
    sessions,
    settings,
    tags
  } from '@/lib/stores';
  import { i18n } from 'webextension-polyfill';

  $: tagsFilter = $settings.tagsFilter;

  $: if (tagsFilter !== '__all__' && finished && !$tags[tagsFilter])
    settings.changeSetting('tagsFilter', '__all__');
</script>

<select
  name="tagsFilter"
  id="tagsFilter"
  class="appearance-none rounded-lg bg-surface-container-high/80 border border-outline-variant/30 px-2.5 py-1 text-xs font-medium text-on-surface-variant hover:border-primary/30 hover:text-on-surface focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all cursor-pointer max-w-[11rem]"
  bind:value={$filterOptions.tagsFilter}
  on:change={(ev) => {
    settings.changeSetting('tagsFilter', ev.currentTarget.value);
  }}
>
  <option value="__all__"
    >{i18n.getMessage('labelTagsAll')} ({$sessions?.length ?? 0})</option
  >
  {#each Object.keys($tags) as tag}
    <option value={tag}>{tag} ({$tags[tag]})</option>
  {/each}
</select>
