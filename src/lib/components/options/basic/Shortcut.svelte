<script lang="ts">
  export let keybind: string[];
  export let action: string;
</script>

<p class="flex items-center gap-1.5 text-sm text-on-surface">
  {#each keybind as key, i}
    <kbd
      class="min-w-[2rem] rounded-lg border border-outline-variant/40 bg-surface-container-high px-2.5 py-1 text-center text-xs font-mono font-semibold text-primary shadow-sm"
      >{key}</kbd
    >
    {#if i + 1 !== keybind.length}
      <span class="text-on-surface-variant text-xs">+</span>
    {/if}
  {/each}
  <span class="ml-2 text-on-surface-variant">{action}</span>
</p>
