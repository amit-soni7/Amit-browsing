<script>
  import { DonateCard } from '@/lib/components';
  import { i18n } from 'webextension-polyfill';
</script>

<div>
  <p class="mb-5 text-sm text-on-surface-variant leading-relaxed">
    {i18n.getMessage('aboutDonateText')}
  </p>

  <div class="flex flex-wrap gap-5">
    <div class="flex h-16 w-full justify-center gap-4">
      <a
        href="https://ko-fi.com/navorite"
        target="_blank"
        class="h-full hover:opacity-90 transition-opacity"
        ><img
          class="h-full rounded-lg"
          src="../../images/donate_kofi.webp"
          alt="Donate using Ko-fi.com"
        /></a
      >
      <a
        href="https://www.patreon.com/navorite"
        target="_blank"
        class="flex h-full items-center gap-2 rounded-xl bg-[#f96854] px-4 font-bold text-sm text-black hover:opacity-90 transition-opacity"
        ><img
          class="h-7"
          src="../../images/donate_patreon.png"
          alt="Donate using Patreon.com"
        />BECOME A PATRON</a
      >
    </div>

    <div class="flex w-full justify-center gap-5">
      <DonateCard
        title="Bitcoin (BTC)"
        src="../../images/btc-qr.png"
        srcIcon="../../images/btc-icon.png"
        address="1Dsu6EHhQxZwtBN3RE4nXLVQrzTCKoMn2p"
      />
      <DonateCard
        title="Ethereum (ETH)"
        src="../../images/eth-qr.png"
        srcIcon="../../images/eth-icon.png"
        address="0xa088a54b3048a97d799b6455a7608f50cb4721e3"
      />
    </div>
  </div>
</div>
