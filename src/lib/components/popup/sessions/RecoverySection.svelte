<script lang="ts">
  import { closedItems, recoverySnapshots, settings } from '@/lib/stores';
  import type { EClosedItem, ESession } from '@/lib/types';
  import { getRelativeTime, sendMessage, tooltip } from '@/lib/utils';

  function restoreSnapshot(session: ESession) {
    sendMessage({
      message: 'openSession',
      session,
      discarded: $settings.discarded
    });
  }

  function restoreClosedItem(item: EClosedItem) {
    if (item.itemType === 'window' && item.session) {
      sendMessage({
        message: 'openSession',
        session: item.session,
        discarded: $settings.discarded
      });
      return;
    }

    if (item.tab) {
      sendMessage({
        message: 'createTab',
        tab: item.tab,
        discarded: $settings.discarded
      });
    }
  }
</script>

{#if $recoverySnapshots.length || $closedItems.length}
  <section class="mb-4 flex flex-col gap-3">
    <div class="px-1">
      <h3 class="font-headline text-sm font-bold text-primary">Recovery</h3>
      <p class="text-xs text-on-surface-variant">
        Recover recent workspaces, windows, and closed tabs.
      </p>
    </div>

    {#if $recoverySnapshots.length}
      <div class="flex flex-col gap-2">
        {#each $recoverySnapshots as snapshot}
          <button
            class="session-container text-left"
            on:click={() => restoreSnapshot(snapshot)}
          >
            <div class="session-info">
              <div class="session-name text-sm">
                {snapshot.title}
              </div>
              <span class="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {snapshot.kind}
              </span>
            </div>
            <div class="mt-1 flex items-center gap-2">
              <div class="session-card">
                <span class="material-symbols-outlined text-[13px]">web_asset</span>
                {snapshot.windows?.length ?? 0}
              </div>
              <div class="session-card">
                <span class="material-symbols-outlined text-[13px]">tab</span>
                {snapshot.tabsNumber}
              </div>
              <div
                class="session-card"
                use:tooltip={{
                  title: new Date(
                    snapshot.updatedAt ?? snapshot.dateSaved ?? Date.now()
                  ).toLocaleString()
                }}
              >
                <span class="material-symbols-outlined text-[13px]">schedule</span>
                {getRelativeTime(snapshot.updatedAt ?? snapshot.dateSaved ?? Date.now())}
              </div>
            </div>
          </button>
        {/each}
      </div>
    {/if}

    {#if $closedItems.length}
      <div class="flex flex-col gap-2">
        {#each $closedItems as item}
          <div class="session-container">
            <button class="session-info text-left" on:click={() => restoreClosedItem(item)}>
              <div class="session-name text-sm">{item.title}</div>
              <span class="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                {item.itemType === 'window' ? 'closed window' : 'closed tab'}
              </span>
            </button>
            <div class="mt-1 flex items-center gap-2">
              <div class="session-card">
                <span class="material-symbols-outlined text-[13px]">
                  {item.itemType === 'window' ? 'web_asset' : 'tab'}
                </span>
                {item.itemType === 'window'
                  ? item.session?.tabsNumber ?? 0
                  : 1}
              </div>
              <div
                class="session-card"
                use:tooltip={{ title: new Date(item.closedAt).toLocaleString() }}
              >
                <span class="material-symbols-outlined text-[13px]">history</span>
                {getRelativeTime(item.closedAt)}
              </div>
              <button
                class="ml-auto rounded-lg p-1 text-on-surface-variant transition-all hover:bg-error/10 hover:text-error"
                on:click={() => closedItems.remove(item)}
              >
                <span class="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
{/if}
