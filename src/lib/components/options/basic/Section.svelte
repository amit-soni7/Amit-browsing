<script lang="ts">
  export let title: string | undefined | null = undefined;
</script>

<section class="rounded-2xl glass-panel p-6 soft-glow">
  {#if title}
    <h2 class="mb-4 text-lg font-bold text-primary">{title}</h2>
  {/if}
  <div class="flex flex-col gap-4">
    <slot />
  </div>
</section>
