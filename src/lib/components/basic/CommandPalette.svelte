<script lang="ts">
  import { currentSession, sessions } from '@/lib/stores';
  import { Modal } from '@/lib/components';

  export let open = false;

  $: selected = sessions.selection;

  const commands = [
    {
      title: 'Save current session',
      icon: 'save',
      action: () => sessions.add($currentSession)
    },
    {
      title: 'Delete selected session',
      icon: 'delete',
      action: () => sessions.remove($selected)
    },
    { title: 'Delete all sessions', icon: 'delete_sweep', action: sessions.removeAll }
  ];
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<Modal bind:open>
  <ul slot="content" class="flex flex-col gap-1">
    {#each commands as command}
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <li
        class="flex items-center gap-3 cursor-pointer rounded-xl px-4 py-3 text-sm font-medium text-on-surface hover:bg-primary/10 hover:text-primary transition-all"
        on:click={() => {
          command.action();
          open = false;
        }}
      >
        <span class="material-symbols-outlined text-[20px] text-on-surface-variant"
          >{command.icon}</span
        >
        {command.title}
      </li>
    {/each}
  </ul>
</Modal>
