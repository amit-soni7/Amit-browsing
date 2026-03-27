<script lang="ts">
  import { settings } from '@/lib/stores';
  import { Switch, Section, TagEditor } from '@/lib/components';
  import {
    handleExport,
    handleFilterListChange,
    handleImport,
    sendMessage
  } from '@/lib/utils';
  import browser, { i18n } from 'webextension-polyfill';

  $: urlList = $settings.urlFilterList?.join('\n') ?? '';
</script>

<Section title={i18n.getMessage('settingsUserInterfaceHeading')}>
  <Switch
    title={i18n.getMessage('settingsPopupView')}
    checked={$settings.popupView}
    on:change={() => {
      settings.changeSetting('popupView', !$settings.popupView);
    }}
  />

  <Switch
    title={i18n.getMessage('settingsDarkMode')}
    checked={$settings.darkMode}
    on:change={() =>
      settings.setTheme($settings.darkMode ? 'light' : 'dark')}
  />
</Section>

<Section title={i18n.getMessage('settingsAutosaveHeading')}>
  <Switch
    title={i18n.getMessage('settingsAutosave')}
    checked={$settings.autoSave}
    on:change={() => {
      settings.changeSetting('autoSave', !$settings.autoSave);

      if ($settings.autoSave) sendMessage({ message: 'createTimer' });
      else browser.alarms.clear('auto-save');
    }}
  />
  <label class="max-w-max text-sm font-medium text-on-surface">
    <input
      type="number"
      class="mr-2 h-8 w-12 rounded-lg border border-outline-variant/40 bg-surface-container text-center text-sm text-on-surface outline-none focus:border-primary/50 disabled:opacity-40 transition-all"
      min="1"
      max="15"
      value={$settings.autoSaveMaxSessions}
      on:change={(event) => {
        if (Number(event.currentTarget.value) > 15)
          event.currentTarget.value = '15';
        if (Number(event.currentTarget.value) < 1)
          event.currentTarget.value = '1';

        settings.changeSetting(
          'autoSaveMaxSessions',
          Number(event.currentTarget.value)
        );
      }}
      disabled={!$settings.autoSave}
    />
    {i18n.getMessage('settingsAutosaveMax')}
  </label>
  <label class="max-w-max text-sm font-medium text-on-surface">
    <input
      type="number"
      class="mr-2 h-8 w-12 rounded-lg border border-outline-variant/40 bg-surface-container text-center text-sm text-on-surface outline-none focus:border-primary/50 disabled:opacity-40 transition-all"
      min="1"
      value={$settings.autoSaveTimer}
      on:change={(event) => {
        if (Number(event.currentTarget.value) < 1)
          event.currentTarget.value = '1';

        settings.changeSetting(
          'autoSaveTimer',
          Number(event.currentTarget.value)
        );

        sendMessage({ message: 'createTimer' });
      }}
      disabled={!$settings.autoSave}
    />
    {i18n.getMessage('settingsAutosaveInterval')}
  </label>
</Section>

<Section title={i18n.getMessage('settingsExtensionActionsHeading')}>
  <label class="flex flex-col gap-2 text-sm font-medium text-on-surface">
    {i18n.getMessage('settingsURLFilterList')}
    <textarea
      name="filter-list"
      id="filter-list"
      rows="8"
      placeholder={i18n.getMessage('settingsURLFilterListPlaceholder')}
      class="resize-none rounded-xl border border-outline-variant/40 bg-surface-container p-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 outline-none focus:border-primary/50 transition-all"
      inputmode="url"
      value={urlList}
      on:change={(ev) => handleFilterListChange(ev, urlList)}
    />
  </label>

  <Switch
    title={i18n.getMessage('settingsLazyload')}
    description={i18n.getMessage('settingsLazyloadDescription')}
    checked={$settings.discarded}
    on:change={() => settings.changeSetting('discarded', !$settings.discarded)}
  />

  <button
    type="button"
    class="max-w-fit rounded-xl bg-error/15 border border-error/20 px-5 py-2.5 text-sm font-bold text-error hover:bg-error/25 transition-all"
    on:click={settings.clear}
  >
    {i18n.getMessage('settingsResetAll')}
  </button>
</Section>

<Section title={i18n.getMessage('settingsSessionActionsHeading')}>
  <Switch
    title={i18n.getMessage('settingsDoNotAskForSessionName')}
    checked={$settings.doNotAskForTitle}
    on:change={() => {
      settings.changeSetting('doNotAskForTitle', !$settings.doNotAskForTitle);
    }}
  />

  <Switch
    title={i18n.getMessage('settingsExportSessionCompressed')}
    checked={$settings.exportCompressed}
    on:change={() => {
      settings.changeSetting('exportCompressed', !$settings.exportCompressed);
    }}
  />

  <Switch
    title={i18n.getMessage('settingsExcludePinnedTabs')}
    checked={$settings.excludePinned}
    on:change={() =>
      settings.changeSetting('excludePinned', !$settings.excludePinned)}
  />

  <TagEditor />

  <div class="flex gap-3">
    <label
      class="max-w-max cursor-pointer rounded-xl bg-surface-container-high border border-outline-variant/30 px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-highest hover:border-primary/20 transition-all"
    >
      {i18n.getMessage('settingsImportSessions')}
      <input
        type="file"
        class="hidden"
        on:change={handleImport}
        accept=".json, .ssf, .txt"
      />
    </label>

    <button
      class="max-w-max rounded-xl bg-surface-container-high border border-outline-variant/30 px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-highest hover:border-primary/20 transition-all"
      on:click={() => handleExport($settings.exportCompressed)}
      >{i18n.getMessage('settingsExportSessions')}</button
    >
  </div>
</Section>
