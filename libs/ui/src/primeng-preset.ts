import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

/**
 * @rwp2/ui — PrimeNG 21 theme preset (02 §2, D9).
 *
 * Aura with an Emerald primary ramp. Pair with `tokens.css` (which supplies the
 * `--p-*` semantic surface/content variables and the `.light` + `.density-*`
 * overrides) so PrimeNG components, Tailwind utilities, and the shell chrome
 * all resolve to one palette.
 *
 * Usage (app.config.ts):
 *   providePrimeNG({ theme: { preset: rwp2AuraPreset, options: { darkModeSelector: '.dark' } } })
 */
export const rwp2AuraPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      950: '#022c22',
    },
  },
});
