<script lang="ts">
  import type { ESession, ETab, EWindow } from '@/lib/types';
  import { createEventDispatcher } from 'svelte';
  import { settings, filterOptions, sessions } from '@/lib/stores';
  import { Tag } from '@/lib/components';
  import {
    tooltip,
    sendMessage,
    markResult,
    sessionsDB,
    getRelativeTime
  } from '@/lib/utils';
  import type { UUID } from 'crypto';
  import { i18n } from 'webextension-polyfill';

  export let session: ESession;

  $: selected = sessions.selection;

  const dispatch = createEventDispatcher();

  $: title = $filterOptions?.query.trim()
    ? markResult(session?.title, $filterOptions?.query, {
        case_sensitive: false
      })
    : session?.title;

  let isDropTarget = false;

  async function openSession() {
    if (!session.windows[0]?.tabs?.length)
      session.windows = (await sessionsDB.loadSessionWindows(
        session.id as UUID
      )) as EWindow[];

    sendMessage({
      message: 'openSession',
      session,
      discarded: $settings.discarded
    });

    session.windows = { length: session.windows.length } as EWindow[];
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDropTarget = false;

    const rawTab = event.dataTransfer?.getData('application/x-sessionic-tab');
    if (!rawTab) return;

    const droppedTab = JSON.parse(rawTab) as ETab;
    if (!droppedTab.url || session.id === 'current') return;

    if (!Array.isArray(session.windows)) {
      session.windows = (await sessionsDB.loadSessionWindows(
        session.id as UUID
      )) as EWindow[];
    }

    if (!session.windows?.length) {
      session.windows = [{ tabs: [] } as EWindow];
    }

    const targetWindow =
      session.windows.find((window) => window.focused) ?? session.windows[0];

    if (!targetWindow) return;

    targetWindow.tabs ??= [];

    const tabExists = targetWindow.tabs.some(
      (tab) => tab.url === droppedTab.url && tab.title === droppedTab.title
    );

    if (tabExists) return;

    targetWindow.tabs.push({
      ...droppedTab,
      active: false,
      highlighted: false,
      selected: false
    });
    session.tabsNumber += 1;

    await sessions.put(session);
  }
</script>

<li class="mb-3 last:mb-0">
  <button
    class="session-container group {$selected?.id === session.id
      ? '!bg-primary/15 !border-primary/30 shadow-[0_0_12px_rgba(212,175,55,0.06)]'
      : ''} {isDropTarget ? '!border-primary !bg-primary/10' : ''}"
    on:click={() => selected.select(session)}
    on:dragenter={(event) => {
      if (!event.dataTransfer?.types.includes('application/x-sessionic-tab'))
        return;
      isDropTarget = true;
    }}
    on:dragover={(event) => {
      if (!event.dataTransfer?.types.includes('application/x-sessionic-tab'))
        return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      isDropTarget = true;
    }}
    on:dragleave={() => {
      isDropTarget = false;
    }}
    on:drop={handleDrop}
  >
    <div class="session-info">
      <button
        use:tooltip={{ title: i18n.getMessage('popupTipOpen') }}
        class="session-name"
        on:click|stopPropagation={openSession}
      >
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html title}
      </button>

      <div
        class="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <button
          use:tooltip={{ title: i18n.getMessage('labelRename') }}
          class="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all"
          title={i18n.getMessage('labelRename')}
          on:click|stopPropagation={() => dispatch('renameModal')}
        >
          <span class="material-symbols-outlined text-[16px]">edit</span>
        </button>

        <button
          use:tooltip={{
            title: i18n.getMessage(
              session.tags ? 'labelRemoveTag' : 'labelAddTag'
            )
          }}
          class="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all"
          title={i18n.getMessage(
            session.tags ? 'labelRemoveTag' : 'labelAddTag'
          )}
          on:click|stopPropagation={() => {
            if (!session?.tags) return dispatch('tagsModal');
            delete session.tags;
            sessions.put(session);
          }}
        >
          <span class="material-symbols-outlined text-[16px]"
            >{session?.tags ? 'label_off' : 'label'}</span
          >
        </button>

        <button
          use:tooltip={{ title: i18n.getMessage('labelDelete') }}
          class="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-all"
          title={i18n.getMessage('labelDelete')}
          on:click|stopPropagation={() => dispatch('deleteModal')}
        >
          <span class="material-symbols-outlined text-[16px]">delete</span>
        </button>
      </div>
    </div>

    <div class="mt-1 flex w-full flex-1 items-center gap-2">
      <div
        class="session-card"
        use:tooltip={{
          title: `${session?.windows?.length} ${i18n.getMessage(
            session?.windows?.length > 1 ? 'labelWindows' : 'labelWindow'
          )}`
        }}
      >
        <span class="material-symbols-outlined text-[13px]">web_asset</span>
        {session?.windows?.length}
      </div>

      <div
        class="session-card"
        use:tooltip={{
          title: `${session?.tabsNumber} ${i18n.getMessage(
            session?.tabsNumber > 1 ? 'labelTabs' : 'labelTab'
          )}`
        }}
      >
        <span class="material-symbols-outlined text-[13px]">tab</span>
        {session?.tabsNumber}
      </div>

      {#if session?.dateSaved}
        <div
          class="session-card"
          use:tooltip={{
            title: `${i18n.getMessage('labelSavedAt')} ${new Date(
              session.dateSaved
            ).toLocaleString(navigator.language, {
              dateStyle: 'short',
              timeStyle: 'short'
            })}`
          }}
        >
          <span class="material-symbols-outlined text-[13px]">schedule</span>
          {getRelativeTime(session.dateSaved)}
        </div>
      {/if}

      {#if session.tags}
        {@const tag = $settings.tags[session.tags]}
        <Tag
          name={session.tags}
          bgColor={tag?.bgColor}
          textColor={tag?.textColor}
          class="ml-auto"
        />
      {/if}
    </div>
  </button>
</li>
