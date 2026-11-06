// Auto-generated. Per-entity form-enhancements config for "Interaktionen".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [{"row": ["veranstaltung", "reihenfolge"], "cols": "2fr 1fr"}, "frage", "aktiv", "erlaeuterung", "vorprompt", "endprompt", "zusammenfassung", "ki_antwort"],
  defaults: {
    'aktiv': { kind: 'literal', value: true },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
