<script lang="ts">
  import { tooltip } from '@/lib/utils';

  export let bgColor: string = 'royalblue';
  export let textColor: string = 'white';
  export let name: string;

  let className = '';
  export { className as class };
</script>

<div
  style:background-color={bgColor}
  style:color={textColor}
  class="flex min-h-full max-w-[7rem] flex-1 cursor-default items-center justify-center rounded-full {className}"
  use:tooltip={{ title: name }}
>
  <span
    class="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-wide"
    >{name}</span
  >
</div>
