import { prefsSchema, type Prefs, type WorkbenchState } from '@rwp2/contracts';

/**
 * prefs.reducer (04 §3): merge + validate, then mirror the active-context
 * copies (theme/density/persona) so a pref change propagates to guests via the
 * next `wb:contextChanged` push.
 */
export function setPref(state: WorkbenchState, patch: Partial<Prefs>): WorkbenchState {
  const merged: Prefs = { ...state.prefs, ...patch };
  const prefs = prefsSchema.parse(merged); // drops nonsense; throws only on type violations
  return {
    ...state,
    prefs,
    context: {
      ...state.context,
      theme: prefs.theme,
      density: prefs.density,
      persona: prefs.persona,
    },
  };
}
