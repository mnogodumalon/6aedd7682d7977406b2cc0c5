/**
 * Field rules — GENERATED from the app metadata. Do not edit.
 *
 * The mechanical truth about every field: what kind it is, whether the
 * platform's base view marks it required, which lookup keys exist, where an
 * applookup points, what the label is. `useStepForm` validates against these
 * rules and phrases its messages with the real labels; `toWirePayload` uses
 * them to shape the create payload; `SHAPES` tells a page which input FORM
 * fits the data (a date pair wants a calendar, not two fields) — it is a
 * signal, not a gate.
 */
import { appLabel, fieldLabel, lookupLabel } from '@/i18n';
import { policyLabel } from './policy';
import { LOOKUP_OPTIONS } from '@/types/app';

export type EntityKey = 'veranstaltungen' | 'interaktionen' | 'feedbacks' | 'abschlussbewertungen';

/** The text fields of each entity — what a search may run over (generated;
 *  `never` for an entity without text of its own, e.g. a link table). */
export interface StringFields {
  "veranstaltungen": "titel" | "ort" | "beschreibung";
  "interaktionen": "frage" | "erlaeuterung" | "vorprompt" | "endprompt" | "zusammenfassung" | "ki_antwort";
  "feedbacks": "kuerzel" | "sendekennung" | "feedbacktext";
  "abschlussbewertungen": "kuerzel" | "kommentar" | "email";
}
export type StringFieldKey<E extends EntityKey> = E extends keyof StringFields ? StringFields[E] : never;

/** The applookup fields of each entity (generated). A pick stored through
 *  `form.set` on one of these must carry its display name — at compile time
 *  (`StepForm.set`), because the review would otherwise show the id. */
export interface RecordFields {
  "veranstaltungen": never;
  "interaktionen": "veranstaltung";
  "feedbacks": "interaktion";
  "abschlussbewertungen": "veranstaltung";
}
export type RecordFieldKey<E extends EntityKey> = E extends keyof RecordFields ? RecordFields[E] : never;

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'bool'
  | 'date'
  | 'datetime'
  | 'lookup'
  | 'multilookup'
  | 'record'
  | 'multirecord'
  | 'file'
  | 'geo';

export interface FieldRule {
  key: string;
  fulltype: string;
  kind: FieldKind;
  /** From the app's base view. A public page may override this per field. */
  required: boolean;
  /** Build-time label — `labelOf()` prefers the runtime i18n bundle. */
  label: string;
  /** Whether a journey may write it as a value. `file` is false: a file is UPLOADED
   *  (`form.file(key)` → FileField; the chosen file travels in the create as a data URL). */
  writable: boolean;
  maxLength?: number;
  /** lookup / multilookup: the ONLY valid write values. */
  options?: string[];
  /** record / multirecord: the target app (always) and its entity key (when inside this appgroup). */
  targetAppId?: string;
  targetEntity?: EntityKey;
  format?: 'currency';
  /** HTML autocomplete token derived from the field name (given-name, email, tel, …). */
  autoComplete?: string;
}

export interface EntityInfo {
  key: EntityKey;
  appId: string;
  label: string;
  /** PascalCase plural — `get<pascal>()` on the service. */
  pascal: string;
  /** The single-record suffix — `create<single>()` on the service. */
  single: string;
}

/** Input-form signals per entity: which data shape each field (pair) has.
 *  `range`  — two date fields that form a stay/period → AvailabilityRangePicker
 *  `choice` — a lookup with few options → ChoiceGroup pills instead of a select
 *  `record` — an applookup → EntitySelectStep with search, never a raw id field
 *  `stock`  — a quantity that has a stock/capacity counterpart → show it, warn on overshoot */
export type Shape =
  | { kind: 'range'; from: string; to: string }
  | { kind: 'choice'; field: string; count: number }
  | { kind: 'record'; field: string; targetEntity?: EntityKey }
  | { kind: 'stock'; field: string };

export const ENTITIES: Record<EntityKey, EntityInfo> = {
  "veranstaltungen": {
    "key": "veranstaltungen",
    "appId": "6aedd75179971dcf499c71b8",
    "label": "Veranstaltungen",
    "pascal": "Veranstaltungen",
    "single": "VeranstaltungenEntry"
  },
  "interaktionen": {
    "key": "interaktionen",
    "appId": "6aedd7555c1129e4339508ab",
    "label": "Interaktionen",
    "pascal": "Interaktionen",
    "single": "InteraktionenEntry"
  },
  "feedbacks": {
    "key": "feedbacks",
    "appId": "6aedd755736340a4dbed0878",
    "label": "Feedbacks",
    "pascal": "Feedbacks",
    "single": "Feedback"
  },
  "abschlussbewertungen": {
    "key": "abschlussbewertungen",
    "appId": "6aedd756c52af0bf20d243f6",
    "label": "Abschlussbewertungen",
    "pascal": "Abschlussbewertungen",
    "single": "AbschlussbewertungenEntry"
  }
};

export const FIELD_RULES: Record<EntityKey, Record<string, FieldRule>> = {
  "veranstaltungen": {
    "titel": {
      "key": "titel",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Titel",
      "writable": true,
      "maxLength": 4000
    },
    "termin": {
      "key": "termin",
      "fulltype": "date/datetimeminute",
      "kind": "datetime",
      "required": false,
      "label": "Datum und Uhrzeit",
      "writable": true
    },
    "ort": {
      "key": "ort",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Ort",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-level2"
    },
    "beschreibung": {
      "key": "beschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Beschreibung",
      "writable": true
    }
  },
  "interaktionen": {
    "veranstaltung": {
      "key": "veranstaltung",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Veranstaltung",
      "writable": true,
      "targetAppId": "6aedd75179971dcf499c71b8",
      "targetEntity": "veranstaltungen"
    },
    "reihenfolge": {
      "key": "reihenfolge",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Reihenfolge",
      "writable": true
    },
    "frage": {
      "key": "frage",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": true,
      "label": "Frage",
      "writable": true
    },
    "erlaeuterung": {
      "key": "erlaeuterung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Erläuterung",
      "writable": true
    },
    "vorprompt": {
      "key": "vorprompt",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Vorprompt",
      "writable": true
    },
    "endprompt": {
      "key": "endprompt",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Endprompt",
      "writable": true
    },
    "aktiv": {
      "key": "aktiv",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Aktiv",
      "writable": true
    },
    "zusammenfassung": {
      "key": "zusammenfassung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Zusammenfassungstext",
      "writable": true
    },
    "ki_antwort": {
      "key": "ki_antwort",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Antwort der KI",
      "writable": true
    }
  },
  "feedbacks": {
    "interaktion": {
      "key": "interaktion",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Interaktion",
      "writable": true,
      "targetAppId": "6aedd7555c1129e4339508ab",
      "targetEntity": "interaktionen"
    },
    "kuerzel": {
      "key": "kuerzel",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Kürzel",
      "writable": true,
      "maxLength": 4000
    },
    "sendekennung": {
      "key": "sendekennung",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Sendekennung",
      "writable": true,
      "maxLength": 4000
    },
    "feedbacktext": {
      "key": "feedbacktext",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": true,
      "label": "Dein Feedback",
      "writable": true
    }
  },
  "abschlussbewertungen": {
    "veranstaltung": {
      "key": "veranstaltung",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Veranstaltung",
      "writable": true,
      "targetAppId": "6aedd75179971dcf499c71b8",
      "targetEntity": "veranstaltungen"
    },
    "kuerzel": {
      "key": "kuerzel",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Kürzel",
      "writable": true,
      "maxLength": 4000
    },
    "sterne": {
      "key": "sterne",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Bewertung",
      "writable": true,
      "options": [
        "stern_1",
        "stern_2",
        "stern_3",
        "stern_4",
        "stern_5"
      ]
    },
    "kommentar": {
      "key": "kommentar",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Kommentar",
      "writable": true
    },
    "email": {
      "key": "email",
      "fulltype": "string/email",
      "kind": "email",
      "required": false,
      "label": "E-Mail-Adresse (freiwillig)",
      "writable": true,
      "autoComplete": "email"
    },
    "einwilligung": {
      "key": "einwilligung",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Ich willige ein, dass meine E-Mail-Adresse für eine persönliche Auswertung gespeichert wird",
      "writable": true
    }
  }
};

export const SHAPES: Record<EntityKey, Shape[]> = {
  "veranstaltungen": [],
  "interaktionen": [
    {
      "kind": "record",
      "field": "veranstaltung",
      "targetEntity": "veranstaltungen"
    }
  ],
  "feedbacks": [
    {
      "kind": "record",
      "field": "interaktion",
      "targetEntity": "interaktionen"
    }
  ],
  "abschlussbewertungen": [
    {
      "kind": "choice",
      "field": "sterne",
      "count": 5
    },
    {
      "kind": "record",
      "field": "veranstaltung",
      "targetEntity": "veranstaltungen"
    }
  ]
};

/** The fields a record of this entity is recognised by (a person: first and
 *  last name; else its title-like text field) — the same choice the dashboard's
 *  enrichment makes for `<key>Name`. `useRecordSearch` resolves an applookup to
 *  this name (`ctx.ref('gast')` in `toItem`). */
export const DISPLAY_FIELDS: Record<EntityKey, string[]> = {
  "veranstaltungen": [
    "titel"
  ],
  "interaktionen": [
    "frage"
  ],
  "feedbacks": [
    "feedbacktext"
  ],
  "abschlussbewertungen": [
    "kommentar"
  ]
};

/** The display name of a record: its display fields joined, else the first
 *  non-empty text value, else ''. */
/** A display-field value as text: strings as they are, a lookup `{ key, label }`
 *  (either door hydrates lookups to objects) by its label — an entity whose
 *  only title-like field is a lookup/select otherwise had no name at all. */
function displayPart(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object' && 'label' in v) {
    const l = (v as { label?: unknown }).label;
    return l === null || l === undefined ? '' : String(l).trim();
  }
  return '';
}

export function displayNameOf(entity: EntityKey, fields: Record<string, unknown>): string {
  const parts = (DISPLAY_FIELDS[entity] ?? [])
    .map(k => displayPart(fields[k]))
    .filter(v => v !== '');
  if (parts.length > 0) return parts.join(' ');
  for (const [k, rule] of Object.entries(FIELD_RULES[entity] ?? {})) {
    if (rule.kind !== 'text' && rule.kind !== 'email') continue;
    const v = fields[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

export function ruleOf(entity: EntityKey, key: string): FieldRule | undefined {
  return FIELD_RULES[entity]?.[key];
}

/** The field label as the user sees it — the owner's policy label first (a
 *  public page's "Felder anpassen"), runtime bundle second, generated label last. */
export function labelOf(entity: EntityKey, key: string): string {
  const own = policyLabel(entity, key);
  if (own) return own;
  const fromBundle = fieldLabel(entity, key);
  if (fromBundle !== key) return fromBundle;
  return ruleOf(entity, key)?.label ?? key;
}

export function entityLabel(entity: EntityKey): string {
  const fromBundle = appLabel(entity);
  if (fromBundle !== entity) return fromBundle;
  return ENTITIES[entity]?.label ?? entity;
}

/** Lookup options with runtime labels — the only legitimate source of `{key,label}` pairs. */
export function optionsOf(entity: EntityKey, key: string): Array<{ key: string; label: string }> {
  const generated = (LOOKUP_OPTIONS as Record<string, Record<string, Array<{ key: string; label: string }>>>)[entity]?.[key];
  if (generated && generated.length) return generated.map(o => ({ key: o.key, label: o.label }));
  const keys = ruleOf(entity, key)?.options ?? [];
  return keys.map(k => ({ key: k, label: lookupLabel(entity, key, k) ?? k }));
}

/** „Nicht ausgefüllt“ for a required field, by its kind: a checkbox that is
 *  `false` is NOT filled — the person did not consent (live 03.11.2026: a
 *  consent page validated with the box unticked and the grant took it). Every
 *  other kind is isEmptyValue. */
export function isUnfilled(entity: EntityKey, key: string, v: unknown): boolean {
  if (ruleOf(entity, key)?.kind === 'bool') return v !== true;
  return isEmptyValue(v);
}

export function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object' && 'from' in (v as object) && 'to' in (v as object)) {
    const r = v as { from: unknown; to: unknown };
    return isEmptyValue(r.from) && isEmptyValue(r.to);
  }
  return false;
}
