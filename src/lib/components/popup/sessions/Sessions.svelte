<script lang="ts">
  import browser, { i18n } from 'webextension-polyfill';
  import type { ESession, EWindow } from '@/lib/types';
  import { notification, currentSession, filtered, sessions, settings } from '@/lib/stores';
  import {
    VirtualList,
    Windows,
    InputModal,
    ActionModal,
    TagsModal,
    Session,
    CurrentSession
  } from '@/lib/components';
  import { isInputTarget, sendMessage, sessionsDB } from '@/lib/utils';
  import type { UUID } from 'crypto';

  $: selection = sessions.selection;

  $: if ($selection && typeof scrollToIndex !== 'undefined' && !isScrolled) {
    isScrolled = true;
    scrollToIndex($sessions.indexOf($selection));
  }

  let modalShow = false;
  let modalType: 'Save' | 'Rename' = 'Rename';

  let actionShow = false;
  let modalTarget: ESession | null = null;

  let scrollToIndex: (index: number) => void;

  let isScrolled = false;

  let tagsShow = false;
  let viewMode: 'list' | 'card' = 'list';
  const dashboardUrl = browser.runtime.getURL('src/popup/index.html?tab=true');

  $: selectedSavedSession = $selection?.id !== 'current' ? $selection : null;
  $: activeSessionTarget = modalTarget ?? selectedSavedSession;
  $: if (!modalShow && !actionShow && !tagsShow) modalTarget = null;

  async function saveSession(title: string) {
    $currentSession.title = title;

    const id = await sessions.add($currentSession);

    scrollToIndex($sessions.findIndex((session) => session.id === id));
  }

  export function saveAction() {
    modalType = 'Save';
    if ($settings.doNotAskForTitle)
      return saveSession(i18n.getMessage('labelUnnamedSession'));

    modalShow = true;
  }

  async function addGroup() {
    const id = await sessions.addEmptyGroup();
    scrollToIndex($sessions.findIndex((session) => session.id === id));
  }

  async function collapseCurrentWindowToOneTab() {
    const currentWindow = await browser.windows.getCurrent({ populate: true });
    const orderedTabs = [...(currentWindow.tabs ?? [])]
      .filter((tab) => typeof tab.id === 'number')
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const savableTabs = orderedTabs.filter((tab) => tab.url !== dashboardUrl);

    if (!savableTabs.length) {
      notification.error(i18n.getMessage('notifySaveFailEmpty'));
      return;
    }

    const firstTab = savableTabs[0]!;
    const title =
      firstTab.title?.trim() ||
      firstTab.url ||
      i18n.getMessage('labelUnnamedSession');

    const windowSnapshot = {
      ...currentWindow,
      tabs: savableTabs
    } as EWindow;

    const session = {
      title,
      windows: [windowSnapshot],
      tabsNumber: savableTabs.length,
      dateSaved: Date.now(),
      dateModified: Date.now()
    } as ESession;

    let id: string | undefined;

    try {
      id = await sessions.add(session);
    } catch (error) {
      notification.error(
        'Failed to save the current window. No tabs were closed.',
        `[sessions.oneTab] failed to save current window: ${error}`
      );
      return;
    }

    if (!id) return;

    if (typeof scrollToIndex !== 'undefined')
      scrollToIndex($sessions.findIndex((savedSession) => savedSession.id === id));

    const tabIdsToClose = savableTabs
      .slice(1)
      .map((tab) => tab.id)
      .filter((tabId): tabId is number => typeof tabId === 'number');

    if (!tabIdsToClose.length) {
      notification.success_info(`Saved "${title}". The current window already has one tab.`);
      return;
    }

    const results = await Promise.allSettled(
      tabIdsToClose.map((tabId) => browser.tabs.remove(tabId))
    );
    const failedCount = results.filter((result) => result.status === 'rejected').length;
    const closedCount = tabIdsToClose.length - failedCount;

    if (failedCount) {
      notification.warning(
        `Saved "${title}". Closed ${closedCount} tabs and kept the first tab open. ${failedCount} tabs could not be closed.`
      );
      return;
    }

    notification.success_info(
      `Saved "${title}" and closed ${closedCount} tabs. The first tab was kept open.`
    );
  }

  async function openSelectedGroup() {
    if (!$selection || $selection.id === 'current') return;

    if (!Array.isArray($selection.windows)) {
      $selection.windows =
        ((await sessionsDB.loadSessionWindows($selection.id as UUID)) as any) ??
        [];
    }

    sendMessage({
      message: 'openSession',
      session: $selection,
      discarded: $settings.discarded
    });
  }

  async function handleKeydown(ev: KeyboardEvent) {
    if (
      (ev.target instanceof HTMLElement && isInputTarget(ev.target)) ||
      ev.repeat ||
      ev.ctrlKey ||
      ev.shiftKey ||
      ev.altKey ||
      ev.metaKey
    )
      return;

    switch (ev.code) {
      case 'KeyS':
        saveAction();
        break;

      case 'KeyC':
        selection.select($currentSession);
        break;

      case 'KeyE': {
        const sessions = await $filtered;

        let index =
          sessions.findIndex((session) => session.id === $selection.id) + 1;

        if (index >= sessions.length || index <= 0) index = 0;

        selection.select(sessions[index]!);
        scrollToIndex(index);
        break;
      }

      case 'KeyD': {
        const sessions = await $filtered;

        let index =
          sessions.findIndex((session) => session.id === $selection.id) - 1;

        if (index <= -1) index = sessions.length - 1;

        selection.select(sessions[index]!);

        scrollToIndex(index);
        break;
      }

      case 'KeyR':
        modalTarget = selectedSavedSession;
        modalType = 'Rename';
        modalShow = !!selectedSavedSession;
        break;

      case 'Delete':
        if (selectedSavedSession) await sessions.remove(selectedSavedSession);
        break;

      default:
        return;
    }

    ev.preventDefault();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="mt-2 flex h-[90vh] gap-3 overflow-hidden px-5 pb-5">
  <div class="flex h-full max-w-xs flex-1 flex-col">
    <div class="mb-3 flex items-center gap-2">
      <button
        class="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-surface-container-high px-4 py-2.5 text-sm font-bold text-primary shadow-lg shadow-primary/10 transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary-focus"
        on:click={saveAction}
      >
        <span class="material-symbols-outlined text-[20px]">save</span>
        <span>{i18n.getMessage('labelSave')}</span>
      </button>

      <button
        class="inline-flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-2.5 text-sm font-bold text-on-surface transition-all hover:border-primary/30 hover:bg-surface-container-high hover:text-primary"
        on:click={addGroup}
      >
        <span class="material-symbols-outlined text-[20px]">add</span>
        <span>Add</span>
      </button>

      <button
        class="inline-flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-2.5 text-sm font-bold text-on-surface transition-all hover:border-primary/30 hover:bg-surface-container-high hover:text-primary"
        on:click={collapseCurrentWindowToOneTab}
      >
        <span class="material-symbols-outlined text-[20px]">tab</span>
        <span>One Tab</span>
      </button>
    </div>

    <CurrentSession />

    {#await $filtered}
      <p class="mt-2 text-center font-normal">Looking for sessions...</p>
    {:then filtered}
      {#if filtered}
        <VirtualList
          reversed={true}
          items={filtered}
          let:item
          class="flex-1"
          bind:scrollToIndex
        >
          <Session
            session={item}
            on:renameModal={(event) => {
              modalTarget = event.detail;
              modalType = 'Rename';
              modalShow = true;
            }}
            on:deleteModal={(event) => {
              modalTarget = event.detail;
              actionShow = true;
            }}
            on:tagsModal={(event) => {
              modalTarget = event.detail;
              tagsShow = true;
            }}
          />
        </VirtualList>
      {:else}
        <p class="mt-2 text-center font-normal">No sessions were found</p>
      {/if}
    {/await}
  </div>
  <div class="flex min-h-0 flex-1 flex-col gap-3">
    <div class="flex items-center gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3">
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-on-surface">
          {$selection?.id === 'current'
            ? i18n.getMessage('labelCurrentSession')
            : $selection?.title ?? 'Select a tab group'}
        </p>
        <p class="text-xs text-on-surface-variant">
          {$selection?.id === 'current'
            ? 'Currently open browser tabs'
            : 'Saved tabs preview'}
        </p>
      </div>

      {#if $selection?.id !== 'current'}
        <button
          class="rounded-lg border border-outline-variant/30 bg-surface-container px-3 py-2 text-xs font-semibold text-on-surface transition-all hover:border-primary/30 hover:text-primary"
          on:click={openSelectedGroup}
        >
          Open all
        </button>
      {/if}

      <div class="flex items-center gap-1 rounded-lg border border-outline-variant/25 bg-surface px-1 py-1">
        <button
          class="rounded-md px-2 py-1 transition-all {viewMode === 'list'
            ? 'bg-primary/15 text-primary'
            : 'text-on-surface-variant hover:bg-surface-container-high'}"
          on:click={() => (viewMode = 'list')}
        >
          <span class="material-symbols-outlined text-[18px]">view_list</span>
        </button>
        <button
          class="rounded-md px-2 py-1 transition-all {viewMode === 'card'
            ? 'bg-primary/15 text-primary'
            : 'text-on-surface-variant hover:bg-surface-container-high'}"
          on:click={() => (viewMode = 'card')}
        >
          <span class="material-symbols-outlined text-[18px]">grid_view</span>
        </button>
      </div>
    </div>

    <Windows class="flex-1" {viewMode} />
  </div>
</div>

<InputModal
  bind:open={modalShow}
  type={modalType}
  on:inputSubmit={async (event) => {
    if (
      modalType === 'Rename' &&
      activeSessionTarget &&
      activeSessionTarget.title !== event.detail
    ) {
      activeSessionTarget.title = event.detail;

      await sessions.put(activeSessionTarget);

      scrollToIndex(
        $sessions.findIndex((session) => session.id === activeSessionTarget?.id)
      );
    } else if (modalType === 'Save') {
      saveSession(event.detail);
    }

    modalTarget = null;
    modalShow = false;
  }}
/>

<ActionModal
  bind:open={actionShow}
  on:deleteAction={async () => {
    if (!activeSessionTarget) {
      actionShow = false;
      return;
    }

    await sessions.remove(activeSessionTarget);

    if ($selection?.id === activeSessionTarget.id) selection.select($currentSession);

    modalTarget = null;
    actionShow = false;
  }}
/>

<TagsModal
  bind:open={tagsShow}
  on:tagSubmit={(event) => {
    if (!activeSessionTarget) return;

    const tag = event.detail;

    activeSessionTarget.tags = tag;

    sessions.put(activeSessionTarget);
  }}
/>
