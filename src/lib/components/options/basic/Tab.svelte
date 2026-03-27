<script lang="ts">
  export let path: string;
  export let title: string;

  export let group: string = window?.location?.href.split('#')[1] ?? 'general';

  let selected = false;

  function getLocation() {
    if (window?.location?.href?.endsWith(`#${path}`)) group = path;
  }

  $: selected = group === path;
</script>

<svelte:window on:hashchange={getLocation} />

<a
  href="#{path}"
  class="px-4 py-2 rounded-lg text-sm font-semibold transition-all {selected
    ? 'bg-primary text-on-primary shadow-lg shadow-primary/20'
    : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'}"
  >{title}</a
>
