<script lang="ts">
  import type { Icon } from '@/lib/types';
  import { tooltip } from '@/lib/utils';
  export let icon: Icon = 'default';
  export let title: string = '';
  export let role: 'button' | 'img' = 'button';

  export { className as class };
  let className = '';

  const materialMap: Record<string, string> = {
    default: 'article',
    copy: 'content_copy',
    check: 'check',
    save: 'save',
    rename: 'edit',
    delete: 'delete',
    open: 'open_in_new',
    close: 'close',
    incognito: 'visibility_off',
    window: 'web_asset',
    tab: 'tab',
    global: 'language',
    extension: 'extension',
    history: 'schedule',
    expand: 'expand_more',
    collapse: 'expand_less',
    tag: 'label',
    untag: 'label_off',
    search: 'search',
    settings: 'settings',
    donate: 'favorite'
  };

  $: materialIcon = materialMap[icon] ?? 'article';
</script>

<button
  use:tooltip={{
    title
  }}
  {role}
  class="inline-flex items-center justify-center cursor-pointer {role === 'img'
    ? 'pointer-events-none'
    : ''} {className}"
  on:click
>
  <span
    class="material-symbols-outlined select-none"
    style="font-size: 1em; line-height: 1;"
  >
    {materialIcon}
  </span>
</button>
