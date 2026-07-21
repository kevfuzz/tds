/*
 * @rwp2/ui — Tailwind v4 preset (02 §2).
 *
 * Maps Tailwind utilities onto the same `--p-*` runtime tokens defined in
 * tokens.css, so `bg-surface-card`, `text-primary`, `border-content`, etc.
 * follow the shell's theme + density automatically (light/dark, compact/comfy).
 *
 * Usage (app or shell global stylesheet, Tailwind v4 CSS-first config):
 *   @import '@rwp2/ui/tokens.css';
 *   @import 'tailwindcss';
 *   @config '@rwp2/ui/tailwind-preset.js';
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--p-primary-color)',
          50: 'var(--p-primary-50)',
          100: 'var(--p-primary-100)',
          200: 'var(--p-primary-200)',
          300: 'var(--p-primary-300)',
          400: 'var(--p-primary-400)',
          500: 'var(--p-primary-500)',
          600: 'var(--p-primary-600)',
          700: 'var(--p-primary-700)',
          800: 'var(--p-primary-800)',
          900: 'var(--p-primary-900)',
          950: 'var(--p-primary-950)',
          contrast: 'var(--p-primary-contrast-color)',
        },
        surface: {
          0: 'var(--p-surface-0)',
          50: 'var(--p-surface-50)',
          100: 'var(--p-surface-100)',
          200: 'var(--p-surface-200)',
          300: 'var(--p-surface-300)',
          400: 'var(--p-surface-400)',
          500: 'var(--p-surface-500)',
          600: 'var(--p-surface-600)',
          700: 'var(--p-surface-700)',
          800: 'var(--p-surface-800)',
          900: 'var(--p-surface-900)',
          950: 'var(--p-surface-950)',
          ground: 'var(--p-surface-ground)',
          card: 'var(--p-surface-card)',
        },
        content: {
          DEFAULT: 'var(--p-content-background)',
          fg: 'var(--p-content-color)',
        },
        muted: 'var(--p-text-muted-color)',
      },
      textColor: {
        DEFAULT: 'var(--p-text-color)',
        muted: 'var(--p-text-muted-color)',
      },
      borderColor: {
        DEFAULT: 'var(--p-surface-border)',
        content: 'var(--p-content-border-color)',
      },
      backgroundColor: {
        content: 'var(--p-content-background)',
        card: 'var(--p-surface-card)',
        ground: 'var(--p-surface-ground)',
      },
      ringColor: {
        DEFAULT: 'var(--p-focus-ring-color)',
      },
      // Density-driven spacing scale (tokens.css swaps values per .density-*).
      spacing: {
        density: 'var(--p-density-gap)',
        'density-y': 'var(--p-density-padding-y)',
        'density-x': 'var(--p-density-padding-x)',
      },
      fontSize: {
        density: 'var(--p-density-font-size)',
      },
      height: {
        'density-row': 'var(--p-density-row-height)',
      },
    },
  },
};
