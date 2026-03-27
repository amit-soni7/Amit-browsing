<script lang="ts">
  import { Clipboard } from '@/lib/components';

  export let srcIcon: string;
  export let src: string;
  export let title: string;

  export let address: string;
</script>

<div
  class="flex max-w-xs flex-col gap-4 rounded-xl glass-panel p-5"
>
  <h3 class="flex items-center gap-2 text-sm font-bold text-on-surface">
    <img class="h-5 w-5" src={srcIcon} alt={title} />
    {title}
  </h3>

  <div class="grid grid-cols-[auto_1fr] w-full gap-4 max-w-[14.5rem]">
    <img class="rounded-lg bg-white p-2" {src} alt="Donate using {title}" />

    <div>
      <h4 class="text-xs font-medium text-on-surface-variant">Address</h4>

      <div class="mt-1 flex items-center gap-2">
        <p class="break-all text-xs text-on-surface">{address}</p>
        <Clipboard value={address} />
      </div>
    </div>
  </div>
</div>
