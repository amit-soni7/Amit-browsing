<script lang="ts">
  export let color: string;
</script>

<label class="flex min-w-0 flex-col gap-2 text-sm font-medium text-on-surface">
  <span class="text-on-surface-variant">
    <slot />
  </span>
  <span
    class="relative h-11 w-full cursor-pointer overflow-hidden rounded-xl border border-outline-variant/40 shadow-sm transition-colors hover:border-primary/40"
    style:background-color={color}
  >
    <input
      type="color"
      class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      bind:value={color}
      on:change
    />
  </span>
</label>
