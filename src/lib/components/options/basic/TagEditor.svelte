<script lang="ts">
  import { settings } from '@/lib/stores';
  import { ColorInput, IconButton, Tag } from '@/lib/components';
  import { i18n } from 'webextension-polyfill';

  $: tags = $settings.tags;

  let addedTag = { name: '', bgColor: 'royalblue', textColor: 'white' };

  function onInput(
    ev: Event & {
      currentTarget: EventTarget & HTMLInputElement;
    },
    tagName: keyof typeof tags
  ) {
    const value = ev.currentTarget.value;

    if (value.length < 1 || value.length > 15)
      return (ev.currentTarget.value = tags[tagName]!.name!);

    tags[tagName]!.name = value;
  }

  function onChange(
    ev: Event & {
      currentTarget: EventTarget & HTMLInputElement;
    },
    tagName: keyof typeof tags
  ) {
    const value = ev.currentTarget.value;

    tags[value] = tags[tagName]!;

    delete tags[tagName];

    settings.changeSetting('tags', tags);
  }
</script>

<div class="overflow-x-auto rounded-xl">
  <table class="w-full table-fixed">
    <thead>
      <tr
        class="border-b border-outline-variant/20 text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider"
      >
        <td class="p-3">{i18n.getMessage('settingsTagsTag')}</td>
        <td class="p-3">{i18n.getMessage('settingsTagsBackground')}</td>
        <td class="p-3">{i18n.getMessage('settingsTagsText')}</td>
        <td class="p-3">{i18n.getMessage('settingsTagsPreview')}</td>
        <td class="p-3">{i18n.getMessage('settingsTagsAction')}</td>
      </tr>
    </thead>
    <tbody>
      {#each Object.keys(tags) as tagName}
        <tr
          class="border-b border-outline-variant/10 last:border-b-0 hover:bg-white/[0.03] transition-colors"
        >
          <td class="p-3">
            <input
              type="text"
              value={tagName}
              minlength="1"
              maxlength="12"
              on:input={(ev) => onInput(ev, tagName)}
              on:change={(ev) => onChange(ev, tagName)}
              class="w-full rounded-lg border border-outline-variant/40 bg-surface-container px-2.5 py-1.5 text-sm text-on-surface text-center outline-none focus:border-primary/50 transition-all"
            />
          </td>
          <td class="p-3">
            <ColorInput
              bind:color={tags[tagName].bgColor}
              on:change={() => settings.changeSetting('tags', tags)}
            />
          </td>
          <td class="p-3">
            <ColorInput
              bind:color={tags[tagName].textColor}
              on:change={() => settings.changeSetting('tags', tags)}
            />
          </td>
          <td class="p-3">
            <Tag
              name={tags[tagName].name || tagName}
              bgColor={tags[tagName]?.bgColor}
              textColor={tags[tagName]?.textColor}
            />
          </td>
          <td class="p-3">
            <button
              class="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-all"
              title="Delete tag"
              on:click={() => {
                delete tags[tagName];
                settings.changeSetting('tags', tags);
              }}
            >
              <span class="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </td>
        </tr>
      {/each}

      <tr
        class="border-b border-outline-variant/10 last:border-b-0 hover:bg-white/[0.03] transition-colors"
      >
        <td class="p-3">
          <input
            type="text"
            bind:value={addedTag.name}
            minlength="1"
            maxlength="12"
            class="w-full rounded-lg border border-outline-variant/40 bg-surface-container px-2.5 py-1.5 text-sm text-on-surface text-center outline-none focus:border-primary/50 transition-all"
          />
        </td>
        <td class="p-3">
          <ColorInput
            bind:color={addedTag.bgColor}
            on:change={() => settings.changeSetting('tags', tags)}
          />
        </td>
        <td class="p-3">
          <ColorInput
            bind:color={addedTag.textColor}
            on:change={() => settings.changeSetting('tags', tags)}
          />
        </td>
        <td class="p-3">
          <Tag
            name={addedTag.name || 'Preview'}
            bgColor={addedTag.bgColor}
            textColor={addedTag.textColor}
          />
        </td>
        <td class="p-3">
          <button
            class="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-on-primary hover:bg-primary-focus transition-all shadow-sm shadow-primary/20"
            on:click={() => {
              if (addedTag.name.length < 1 || addedTag.name.length > 15) return;

              tags[addedTag.name] = {
                bgColor: addedTag.bgColor,
                textColor: addedTag.textColor
              };

              settings.changeSetting('tags', tags);

              addedTag = { name: '', bgColor: 'royalblue', textColor: 'white' };
            }}>{i18n.getMessage('labelAddTag')}</button
          >
        </td>
      </tr>
    </tbody>
  </table>
</div>
