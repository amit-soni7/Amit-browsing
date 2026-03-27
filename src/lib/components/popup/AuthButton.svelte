<script lang="ts">
  import { authStore } from '@/lib/stores/auth';
  import { isFirebaseConfigured } from '@/lib/firebase';
  import { tooltip } from '@/lib/utils';

  $: ({ user, loading, syncStatus, error } = $authStore);

  const syncLabel: Record<string, string> = {
    syncing: '\u2191',
    synced: '\u2713',
    error: '\u2715',
    idle: '',
    offline: '\u25CB'
  };
</script>

{#if isFirebaseConfigured}
  {#if loading}
    <button
      use:tooltip={{ title: 'Loading...' }}
      class="w-8 h-8 rounded-full flex items-center justify-center border border-outline-variant/30 text-on-surface-variant"
      disabled
      title="Loading..."
    >
      <span class="material-symbols-outlined text-[16px] animate-spin"
        >progress_activity</span
      >
    </button>
  {:else if user}
    <div class="relative flex items-center">
      {#if user.photoURL}
        <button
          use:tooltip={{ title: `${user.displayName ?? user.email} - click to sign out` }}
          class="w-8 h-8 rounded-full overflow-hidden border border-primary/20 hover:border-primary/50 transition-colors"
          title="{user.displayName ?? user.email} — click to sign out"
          on:click={() => authStore.logout()}
        >
          <img
            src={user.photoURL}
            alt={user.displayName ?? 'User'}
            class="w-full h-full object-cover"
          />
        </button>
      {:else}
        <button
          use:tooltip={{ title: `${user.email} - click to sign out` }}
          class="w-8 h-8 rounded-full flex items-center justify-center bg-primary/15 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/25 transition-colors"
          title="{user.email} — click to sign out"
          on:click={() => authStore.logout()}
        >
          {user.email?.[0]?.toUpperCase() ?? '?'}
        </button>
      {/if}

      {#if syncStatus !== 'idle'}
        <span
          class="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-3 h-3 rounded-full text-[7px] text-white font-bold leading-none
            {syncStatus === 'syncing'
            ? 'bg-warning'
            : syncStatus === 'error'
              ? 'bg-error'
              : 'bg-success'}"
          title="Sync: {syncStatus}"
        >
          {syncLabel[syncStatus]}
        </span>
      {/if}
    </div>
  {:else}
    <button
      use:tooltip={{ title: 'Sign in with Google to sync tabs across devices' }}
      class="p-2 rounded-full text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
      title="Sign in with Google to sync tabs across devices"
      on:click={() => authStore.login()}
    >
      <span class="material-symbols-outlined text-[20px]">login</span>
    </button>
  {/if}

  {#if error}
    <span
      class="text-error text-xs font-bold"
      title={error}>!</span
    >
  {/if}
{/if}
