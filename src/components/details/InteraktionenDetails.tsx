import type { Interaktionen, Veranstaltungen, Feedbacks } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface InteraktionenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Interaktionen;
  /** N:1-Ziel „Veranstaltungen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  veranstaltungenList: Veranstaltungen[];
  /** Klick auf die Veranstaltungen-Relation → overlay.push auf dessen Detail. */
  onOpenVeranstaltungen?: (record: Veranstaltungen) => void;
  /** 1:N „Feedbacks" (interaktion): VOLLE Liste — der Block filtert auf diesen Record. */
  feedbacksList: Feedbacks[];
  /** Zeilen-Klick → overlay.push auf das Feedbacks-Detail (nie der Edit-Dialog). */
  onOpenFeedbacks: (record: Feedbacks) => void;
  /** Kontextuelles „+": öffnet den Feedbacks-Dialog mit diesem Record vorgesetzt. */
  onAddFeedbacks?: () => void;
}

export function InteraktionenDetails({
  record,
  veranstaltungenList,
  onOpenVeranstaltungen,
  feedbacksList,
  onOpenFeedbacks,
  onAddFeedbacks,
}: InteraktionenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const veranstaltungTarget = veranstaltungenList.find(r => r.record_id === extractRecordId(record.fields.veranstaltung));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('interaktionen', 'reihenfolge')} value={record.fields.reihenfolge} format="text" />
        <RecordField label={fieldLabel('interaktionen', 'frage')} value={record.fields.frage} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('interaktionen', 'erlaeuterung')} value={record.fields.erlaeuterung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('interaktionen', 'vorprompt')} value={record.fields.vorprompt} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('interaktionen', 'endprompt')} value={record.fields.endprompt} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('interaktionen', 'aktiv')} value={record.fields.aktiv} format="bool" />
        <RecordField label={fieldLabel('interaktionen', 'zusammenfassung')} value={record.fields.zusammenfassung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('interaktionen', 'ki_antwort')} value={record.fields.ki_antwort} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('interaktionen', 'veranstaltung')}
          name={veranstaltungTarget?.fields.titel ?? '—'}
          meta={[veranstaltungTarget?.fields.ort].filter(Boolean).join(' · ') || undefined}
          onClick={veranstaltungTarget && onOpenVeranstaltungen ? () => onOpenVeranstaltungen!(veranstaltungTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('feedbacks')}
        items={feedbacksList.filter(r => extractRecordId(r.fields.interaktion) === record.record_id)}
        map={r => ({ name: r.fields.kuerzel ?? appLabel('feedbacks'), meta: undefined })}
        onOpen={onOpenFeedbacks}
        onAdd={onAddFeedbacks}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.INTERAKTIONEN} recordId={record.record_id} readOnly={!perms.canWrite('interaktionen')} />
    </>
  );
}
