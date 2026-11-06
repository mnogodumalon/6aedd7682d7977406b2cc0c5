import type { Abschlussbewertungen, Veranstaltungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface AbschlussbewertungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Abschlussbewertungen;
  /** N:1-Ziel „Veranstaltungen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  veranstaltungenList: Veranstaltungen[];
  /** Klick auf die Veranstaltungen-Relation → overlay.push auf dessen Detail. */
  onOpenVeranstaltungen?: (record: Veranstaltungen) => void;
}

export function AbschlussbewertungenDetails({
  record,
  veranstaltungenList,
  onOpenVeranstaltungen,
}: AbschlussbewertungenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const veranstaltungTarget = veranstaltungenList.find(r => r.record_id === extractRecordId(record.fields.veranstaltung));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('abschlussbewertungen', 'kuerzel')} value={record.fields.kuerzel} format="text" />
        <RecordField label={fieldLabel('abschlussbewertungen', 'sterne')} value={record.fields.sterne} format="pill" />
        <RecordField label={fieldLabel('abschlussbewertungen', 'kommentar')} value={record.fields.kommentar} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('abschlussbewertungen', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('abschlussbewertungen', 'einwilligung')} value={record.fields.einwilligung} format="bool" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('abschlussbewertungen', 'veranstaltung')}
          name={veranstaltungTarget?.fields.titel ?? '—'}
          meta={[veranstaltungTarget?.fields.ort].filter(Boolean).join(' · ') || undefined}
          onClick={veranstaltungTarget && onOpenVeranstaltungen ? () => onOpenVeranstaltungen!(veranstaltungTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ABSCHLUSSBEWERTUNGEN} recordId={record.record_id} readOnly={!perms.canWrite('abschlussbewertungen')} />
    </>
  );
}
