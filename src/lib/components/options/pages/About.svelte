<script>
  import { Donate, Section } from '@/lib/components';
  import { EXT_NAME, EXT_VER } from '@/lib/constants';
  import { i18n } from 'webextension-polyfill';
</script>

<Section title={i18n.getMessage('aboutPage')}>
  <div class="flex flex-wrap items-baseline gap-4 text-sm">
    <p class="font-semibold text-on-surface">
      {EXT_NAME}
      <span class="text-primary">{EXT_VER}</span>
    </p>
    <a
      class="text-primary hover:text-primary-focus transition-colors"
      href="https://github.com/navorite/sessionic/releases"
      target="_blank">{i18n.getMessage('aboutChangelogLabel')}</a
    >
    <a
      class="text-primary hover:text-primary-focus transition-colors"
      href="https://github.com/navorite/sessionic"
      target="_blank">{i18n.getMessage('aboutSourceCodeLabel')}</a
    >
    <a
      class="text-primary hover:text-primary-focus transition-colors"
      href="https://hosted.weblate.org/projects/sessionic"
      target="_blank">{i18n.getMessage('aboutTranslationsLabel')}</a
    >
    <a
      class="text-primary hover:text-primary-focus transition-colors"
      href="https://github.com/navorite/sessionic/blob/main/LICENSE"
      target="_blank">{i18n.getMessage('aboutLicenseLabel')}</a
    >
  </div>

  <h2 class="text-lg font-bold text-on-surface">
    {i18n.getMessage('aboutDonateHeading')}
  </h2>

  <Donate />
</Section>
