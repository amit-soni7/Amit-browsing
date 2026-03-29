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
    getRelativeTime,
    normalizeTimestampValue
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
  $: savedAt = normalizeTimestampValue(session?.dateSaved);

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

    const droppedTab = JSON.parse(rawTab) as {
      tab: ETab;
      sourceSessionId: 'current' | UUID | string;
      sourceWindowIndex: number;
      sourceTabIndex: number;
    };

    await sessions.moveTab(droppedTab, session.id as UUID | string);
  }
</script>

<li class="mb-3 last:mb-0">
  <div
    class="session-container group {$selected?.id === session.id
      ? '!bg-primary/15 !border-primary/30 shadow-[0_0_12px_rgba(212,175,55,0.06)]'
      : ''} {isDropTarget ? '!border-primary !bg-primary/10' : ''}"
    role="button"
    tabindex="0"
    on:click={() => selected.select(session)}
    on:keydown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selected.select(session);
      }
    }}
    on:dragenter={(event) => {
      if (!event.dataTransfer?.types.includes('application/x-sessionic-tab'))
        return;
      isDropTarget = true;
    }}
    on:dragover={(event) => {
      if (!event.dataTransfer?.types.includes('application/x-sessionic-tab'))
        return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      isDropTarget = true;
    }}
    on:dragleave={() => {
      isDropTarget = false;
    }}
    on:drop={handleDrop}
  >
    <div class="session-info">
      <div class="session-name">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html title}
      </div>

      <div
        class="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <button
          use:tooltip={{ title: i18n.getMessage('popupTipOpen') }}
          class="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all"
          title={i18n.getMessage('popupTipOpen')}
          on:click|stopPropagation={openSession}
        >
          <span class="material-symbols-outlined text-[16px]">open_in_new</span>
        </button>

        <button
          use:tooltip={{ title: i18n.getMessage('labelRename') }}
          class="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all"
          title={i18n.getMessage('labelRename')}
          on:click|stopPropagation={() => dispatch('renameModal', session)}
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
            if (!session?.tags) return dispatch('tagsModal', session);
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
          on:click|stopPropagation={() => dispatch('deleteModal', session)}
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

      {#if savedAt}
        <div
          class="session-card"
          use:tooltip={{
            title: `${i18n.getMessage('labelSavedAt')} ${new Date(
              savedAt
            ).toLocaleString(navigator.language, {
              dateStyle: 'short',
              timeStyle: 'short'
            })}`
          }}
        >
          <span class="material-symbols-outlined text-[13px]">schedule</span>
          {getRelativeTime(savedAt)}
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
  </div>
</li>
