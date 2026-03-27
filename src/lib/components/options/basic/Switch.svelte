<script lang="ts">
  import { tooltip } from '@/lib/utils';

  export let title: string;
  export let checked = false;
  export let description = '';
</script>

<label
  class="flex max-w-max cursor-pointer items-center gap-3 rounded-lg text-sm font-medium text-on-surface hover:text-primary/90 transition-colors"
  use:tooltip={{ title: description }}
>
  <input
    type="checkbox"
    aria-hidden="true"
    bind:checked
    on:change
    class="hidden"
  />
  <span
    tabindex="0"
    role="switch"
    aria-checked={checked}
    aria-label={title}
    class="switch-track relative block h-6 w-11 rounded-full transition-colors duration-200 before:absolute before:left-0.5 before:top-0.5 before:block before:h-5 before:w-5 before:rounded-full before:bg-on-surface before:transition-transform before:duration-200 before:content-['']"
  />
  {title}
</label>

<style>
  .switch-track {
    background-color: rgba(212, 175, 55, 0.15);
  }

  input:checked + .switch-track {
    background-color: #d4af37;
  }

  input:checked + .switch-track:before {
    translate: 100% 0%;
    background-color: #1a1608;
  }
</style>
