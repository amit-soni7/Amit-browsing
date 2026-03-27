<script lang="ts">
  import type { SortMethod } from '@/lib/types';
  import { settings } from '@/lib/stores';
  import { i18n } from 'webextension-polyfill';

  function changeSortMethod(val: string) {
    settings.changeSetting('sortMethod', val as SortMethod);
  }
</script>

<select
  name="sort-method"
  id="sort-method"
  class="appearance-none rounded-lg bg-surface-container-high/80 border border-outline-variant/30 px-2.5 py-1 text-xs font-medium text-on-surface-variant hover:border-primary/30 hover:text-on-surface focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all cursor-pointer"
  value={$settings.sortMethod}
  on:change={(ev) => changeSortMethod(ev.currentTarget.value)}
>
  <optgroup label={i18n.getMessage('labelSortDate')}>
    <option value="newest">{i18n.getMessage('labelSortNewest')}</option>
    <option value="oldest">{i18n.getMessage('labelSortOldest')}</option>
  </optgroup>
  <optgroup label={i18n.getMessage('labelSortName')}>
    <option value="az">{i18n.getMessage('labelSortAZ')}</option>
    <option value="za">{i18n.getMessage('labelSortZA')}</option>
  </optgroup>
</select>
