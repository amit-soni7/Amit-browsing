<script lang="ts">
  import type { ENotification } from '@/lib/types';
  import { slide } from 'svelte/transition';
  import { cubicInOut } from 'svelte/easing';

  export let detail: ENotification;

  export let slideDuration = 400;

  $: show = !!detail;

  let timeout: NodeJS.Timeout;

  let colorClasses: string;

  $: {
    if (detail?.type === 'info')
      colorClasses =
        'bg-info/20 text-info border-info/30';
    else if (detail?.type === 'success')
      colorClasses =
        'bg-success/20 text-success border-success/30';
    else if (detail?.type === 'warning')
      colorClasses =
        'bg-warning/20 text-warning border-warning/30';
    else
      colorClasses =
        'bg-error/20 text-error border-error/30';
  }

  $: if (show) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      show = false;
    }, detail?.duration ?? 4000);
  }
</script>

{#if show && detail}
  {#key detail}
    <div
      class="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold border backdrop-blur-xl shadow-2xl {colorClasses}"
      transition:slide|global={{ duration: slideDuration, easing: cubicInOut }}
    >
      <h2 class="whitespace-nowrap">
        {detail.msg}
      </h2>

      <button
        class="p-0.5 rounded-md hover:bg-black/20 transition-colors"
        on:click={() => (show = false)}
      >
        <span class="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  {/key}
{/if}
