import type { Config } from 'tailwindcss';

const themeColor = (token: string) => `rgb(var(--${token}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./src/**/*.{html,js,ts,svelte}'],
  theme: {
    extend: {
      colors: {
        primary: themeColor('primary'),
        'primary-focus': themeColor('primary-focus'),
        'on-primary': themeColor('on-primary'),
        secondary: themeColor('secondary'),
        'secondary-container': themeColor('secondary-container'),
        tertiary: themeColor('tertiary'),
        'on-tertiary': themeColor('on-tertiary'),
        'tertiary-container': themeColor('tertiary-container'),
        surface: themeColor('surface'),
        'surface-dim': themeColor('surface-dim'),
        'surface-bright': themeColor('surface-bright'),
        'surface-container': themeColor('surface-container'),
        'surface-container-low': themeColor('surface-container-low'),
        'surface-container-high': themeColor('surface-container-high'),
        'surface-container-highest': themeColor('surface-container-highest'),
        'surface-container-lowest': themeColor('surface-container-lowest'),
        'surface-variant': themeColor('surface-variant'),
        'surface-tint': themeColor('surface-tint'),
        background: themeColor('background'),
        'on-background': themeColor('on-background'),
        'on-surface': themeColor('on-surface'),
        'on-surface-variant': themeColor('on-surface-variant'),
        outline: themeColor('outline'),
        'outline-variant': themeColor('outline-variant'),
        error: themeColor('error'),
        'error-focus': themeColor('error-focus'),
        'on-error': themeColor('on-error'),
        'error-container': themeColor('error-container'),
        'on-error-container': themeColor('on-error-container'),
        info: themeColor('info'),
        'info-focus': themeColor('info-focus'),
        success: themeColor('success'),
        'success-focus': themeColor('success-focus'),
        warning: themeColor('warning'),
        'warning-focus': themeColor('warning-focus'),
        link: themeColor('link'),
        'link-focus': themeColor('link-focus'),
        tooltip: themeColor('tooltip'),
        'tooltip-content': themeColor('tooltip-content'),
        'primary-container': themeColor('primary-container'),
        'on-primary-container': themeColor('on-primary-container'),
        'inverse-surface': themeColor('inverse-surface'),
        'inverse-on-surface': themeColor('inverse-on-surface'),
        'inverse-primary': themeColor('inverse-primary')
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'Segoe UI', 'sans-serif'],
        headline: ['Noto Serif', 'Georgia', 'serif'],
        body: ['Manrope', 'Inter', 'sans-serif'],
        label: ['Manrope', 'Inter', 'sans-serif']
      }
    }
  },
  plugins: []
} satisfies Config;
