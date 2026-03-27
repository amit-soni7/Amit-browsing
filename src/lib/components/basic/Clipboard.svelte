<script lang="ts">
  import { tooltip } from '@/lib/utils';

  export let value: string;

  let copied = false;

  let timeout: NodeJS.Timeout | null;
</script>

<button
  type="button"
  class="rounded-lg p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all"
  use:tooltip={{
    title: copied ? 'Copied' : 'Copy to clipboard'
  }}
  on:click={() => {
    if (timeout) return;

    navigator.clipboard.writeText(value);
    copied = true;

    timeout = setTimeout(() => {
      copied = false;
      timeout = null;
    }, 2000);
  }}
>
  <span class="material-symbols-outlined text-[18px]"
    >{copied ? 'check' : 'content_copy'}</span
  >
</button>
