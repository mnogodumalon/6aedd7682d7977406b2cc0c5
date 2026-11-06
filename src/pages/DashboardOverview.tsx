import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { flowActionFor, countOf } from '@/config/plan';
import type { Interaktionen } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { tx, appLabel, dateFnsLocale } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatCard, StatCardRow } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { Button } from '@/components/ui/button';
import { ChartWidget, type ChartRow } from '@/components/widgets/ChartWidget';
import type { EnrichedAbschlussbewertungen } from '@/types/enriched';
import { IconPlus, IconQrcode, IconSparkles, IconStar, IconMessageCircle, IconPlayerPlay, IconRobot } from '@tabler/icons-react';

type Filter = 'all' | 'feedback';

const short = (s: string | undefined, n = 60) => {
  const v = (s ?? '').replace(/\s+/g, ' ').trim();
  return v.length > n ? `${v.slice(0, n - 1)}…` : v;
};

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { veranstaltungen, interaktionen, feedbacks, abschlussbewertungen, setInteraktionen, fetchAll } = data;
  const clock = useClock();
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  // ONE write path for "aktiv": exactly one active interaction per event
  const setActive = (rec: Interaktionen) => {
    if (rec.fields.aktiv) return;
    const ev = rec.fields.veranstaltung;
    const siblings = interaktionen.filter(i => i.fields.veranstaltung === ev && i.record_id !== rec.record_id && i.fields.aktiv);
    const patch = (list: Interaktionen[], activeId: string | null, offIds: string[]) =>
      list.map(i => i.record_id === activeId ? { ...i, fields: { ...i.fields, aktiv: true } }
        : offIds.includes(i.record_id) ? { ...i, fields: { ...i.fields, aktiv: false } } : i);
    const offIds = siblings.map(s => s.record_id);
    setInteraktionen(list => patch(list, rec.record_id, offIds));
    void (async () => {
      try {
        await LivingAppsService.updateInteraktionenEntry(rec.record_id, { aktiv: true });
        await Promise.all(offIds.map(id => LivingAppsService.updateInteraktionenEntry(id, { aktiv: false })));
      } catch { fetchAll(); }
    })();
    undoToast(tx`„${short(rec.fields.frage, 40)}“ ist jetzt aktiv`, () => {
      setInteraktionen(list => list.map(i => i.record_id === rec.record_id ? { ...i, fields: { ...i.fields, aktiv: false } }
        : offIds.includes(i.record_id) ? { ...i, fields: { ...i.fields, aktiv: true } } : i));
      void (async () => {
        try {
          await LivingAppsService.updateInteraktionenEntry(rec.record_id, { aktiv: false });
          await Promise.all(offIds.map(id => LivingAppsService.updateInteraktionenEntry(id, { aktiv: true })));
        } catch { fetchAll(); }
      })();
    });
  };

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type !== 'interaktionen') return undefined;
      const rec = interaktionen.find(i => i.record_id === top.record.record_id);
      if (!rec) return undefined;
      return rec.fields.aktiv
        ? { label: tx('QR-Code zeigen'), onClick: () => { window.open('#/ansicht/qr-code', '_blank', 'noopener'); } }
        : { label: tx('Aktiv setzen'), onClick: () => setActive(rec) };
    },
  });
  const enrichedAbschluss = crud.enriched.abschlussbewertungen;

  const eventsSorted = useMemo(() => {
    const now = clock.getTime();
    const ts = (s?: string) => (s ? new Date(s).getTime() : Number.POSITIVE_INFINITY);
    return [...veranstaltungen].sort((a, b) => Math.abs(ts(a.fields.termin) - now) - Math.abs(ts(b.fields.termin) - now));
  }, [veranstaltungen, clock]);
  const eventId = (selectedEvent && veranstaltungen.some(v => v.record_id === selectedEvent) ? selectedEvent : eventsSorted[0]?.record_id) ?? null;
  const event = veranstaltungen.find(v => v.record_id === eventId) ?? null;

  const fbCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of feedbacks) {
      const id = extractRecordId(f.fields.interaktion);
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [feedbacks]);

  const steps = useMemo(() => interaktionen
    .filter(i => extractRecordId(i.fields.veranstaltung) === eventId)
    .sort((a, b) => (a.fields.reihenfolge ?? 0) - (b.fields.reihenfolge ?? 0)), [interaktionen, eventId]);
  const visibleSteps = steps.filter(s => filter === 'all' || (fbCount.get(s.record_id) ?? 0) > 0);
  const active = steps.find(s => s.fields.aktiv) ?? null;
  const totalFb = steps.reduce((n, s) => n + (fbCount.get(s.record_id) ?? 0), 0);

  const eventRatings = useMemo(() => enrichedAbschluss.filter(b => extractRecordId(b.fields.veranstaltung) === eventId), [enrichedAbschluss, eventId]);
  const stars = (b: { fields: { sterne?: { key: string } } }) => Number((b.fields.sterne?.key ?? '').replace('stern_', '')) || 0;
  const avg = eventRatings.length ? eventRatings.reduce((n, b) => n + stars(b), 0) / eventRatings.length : null;
  const ratingRows = useMemo<ChartRow<EnrichedAbschlussbewertungen>[]>(
    () => eventRatings.map(b => ({ id: `bewertung:${b.record_id}`, data: b })), [eventRatings]);

  // cross-event: summary exists, AI answer still missing
  const awaitingKi = interaktionen.filter(i => (i.fields.zusammenfassung ?? '').trim() && !(i.fields.ki_antwort ?? '').trim());
  const evTitle = (url?: string) => veranstaltungen.find(v => v.record_id === extractRecordId(url))?.fields.titel ?? '';
  const kiAction = (rec: Interaktionen) => {
    const go = flowActionFor('interaktionen', 'ki_antwort', rec.record_id);
    return go ?? (() => crud.interaktionen.openEdit(rec));
  };

  const dayLabel = format(clock, 'EEEE, d. MMMM', { locale: dateFnsLocale() });
  let context: string;
  if (!event) context = tx`Lege deine erste Veranstaltung an, dann kannst du loslegen.`;
  else if (active) context = tx`Gerade aktiv: „${short(active.fields.frage, 50)}“ bei ${event.fields.titel ?? ''} — ${countOf('feedbacks', fbCount.get(active.record_id) ?? 0, appLabel('feedbacks'))}.`;
  else if (steps.length) context = tx`Bei ${event.fields.titel ?? ''} ist noch keine Interaktion aktiv — wähle unten den nächsten Schritt.`;
  else context = tx`${event.fields.titel ?? ''} hat noch keine Interaktionen — bereite den Ablauf vor.`;

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{dayLabel} · {context}</p>
      </div>
      {crud.veranstaltungen.canWrite && (
        <Button onClick={() => crud.veranstaltungen.openCreate({})} className="shrink-0">
          <IconPlus size={16} className="shrink-0" /> {tx('Neue Veranstaltung')}
        </Button>
      )}
    </div>
  );

  if (!event) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex flex-col items-center gap-3 overflow-hidden rounded-[27px] bg-card px-6 py-12 text-center shadow-lg">
          <IconQrcode size={48} className="text-muted-foreground" />
          <p className="max-w-md text-muted-foreground">{tx('Hier moderierst du: Veranstaltung anlegen, Interaktionen in Reihenfolge vorbereiten, Schritt aktivieren und den QR-Code zeigen.')}</p>
          {crud.veranstaltungen.canWrite && (
            <Button onClick={() => crud.veranstaltungen.openCreate({})}>{tx('Erste Veranstaltung anlegen')}</Button>
          )}
        </div>
        {crud.surfaces}
      </div>
    );
  }

  const primary = (
    <div className="overflow-hidden rounded-[27px] bg-card p-4 shadow-lg sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{tx('Ablauf')} — {event.fields.titel}</h2>
          <p className="text-sm text-muted-foreground">
            {[event.fields.termin ? formatDate(event.fields.termin) : '', event.fields.ort ?? ''].filter(Boolean).join(' · ')}
          </p>
        </div>
        {crud.interaktionen.canWrite && (
          <Button variant="outline" size="sm" onClick={() => crud.interaktionen.openCreate({ veranstaltung: event.record_id, reihenfolge: steps.length + 1 })}>
            <IconPlus size={16} className="shrink-0" /> {tx('Neue Interaktion')}
          </Button>
        )}
      </div>

      {veranstaltungen.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {eventsSorted.map(v => (
            <Button key={v.record_id} size="sm" variant={v.record_id === event.record_id ? 'default' : 'outline'}
              className="max-w-full" onClick={() => setSelectedEvent(v.record_id)}>
              <span className="truncate">{v.fields.titel}</span>
            </Button>
          ))}
        </div>
      )}

      <ol className="mt-4 space-y-3">
        {visibleSteps.map(s => {
          const n = fbCount.get(s.record_id) ?? 0;
          const isActive = !!s.fields.aktiv;
          return (
            <li key={s.record_id} className={`overflow-hidden rounded-2xl border p-3 sm:p-4 ${isActive ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">{s.fields.reihenfolge ?? '–'}</span>
                <div className="min-w-0 flex-1">
                  <button type="button" className="block w-full text-left" onClick={() => crud.interaktionen.openDetail(s)}>
                    <span className="line-clamp-2 font-medium">{s.fields.frage}</span>
                    {s.fields.erlaeuterung && <span className="mt-0.5 line-clamp-1 block text-sm text-muted-foreground">{s.fields.erlaeuterung}</span>}
                  </button>
                  <p className="mt-1 text-sm">
                    {isActive
                      ? <span className="font-medium text-emerald-600">{tx('Aktiv')}</span>
                      : <span className="text-muted-foreground">{tx('Wartet')}</span>}
                    <span className="text-muted-foreground"> · {countOf('feedbacks', n, appLabel('feedbacks'))}</span>
                    {(s.fields.ki_antwort ?? '').trim() && <span className="text-muted-foreground"> · {tx('KI-Antwort erfasst')}</span>}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {crud.interaktionen.canWrite || isActive ? (
                  <Button asChild size="sm" variant={isActive ? 'outline' : 'default'}>
                    <a href="#/ansicht/qr-code" target="_blank" rel="noopener" onClick={() => setActive(s)}>
                      {isActive ? <IconQrcode size={16} className="shrink-0" /> : <IconPlayerPlay size={16} className="shrink-0" />}
                      {isActive ? tx('QR-Code zeigen') : tx('Aktiv setzen')}
                    </a>
                  </Button>
                ) : null}
                <Button asChild size="sm" variant="outline">
                  <a href={`#/ansicht/zusammenfassung?record=${s.record_id}`} target="_blank" rel="noopener">
                    <IconSparkles size={16} className="shrink-0" /> {tx('Zusammenfassen')}
                  </a>
                </Button>
                {crud.interaktionen.canWrite && (
                  <Button size="sm" variant="ghost" onClick={kiAction(s)}>
                    <IconRobot size={16} className="shrink-0" /> {(s.fields.ki_antwort ?? '').trim() ? tx('KI-Antwort ändern') : tx('KI-Antwort eintragen')}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
        {visibleSteps.length === 0 && (
          <li className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {steps.length === 0 ? tx('Noch keine Interaktionen — lege den ersten Schritt an.') : tx('Noch keine Feedbacks eingegangen.')}
          </li>
        )}
      </ol>
    </div>
  );

  return (
    <div className="space-y-6">
      {header}
      <DashboardGrid
        variant="split"
        kpis={
          <StatCardRow>
            <StatCard
              title={tx('Aktive Interaktion')}
              value={active ? `#${active.fields.reihenfolge ?? '–'}` : tx('Keine')}
              description={active ? short(active.fields.frage, 40) : tx('Setze einen Schritt aktiv')}
              icon={<IconQrcode size={18} className="text-muted-foreground" />}
              tone={active ? 'primary' : 'default'}
              onClick={active ? () => crud.interaktionen.openDetail(active) : undefined}
            />
            <StatCard
              title={appLabel('feedbacks')}
              value={totalFb}
              description={filter === 'feedback' ? tx('Nur Schritte mit Feedback') : tx('Tippen: nur Schritte mit Feedback')}
              icon={<IconMessageCircle size={18} className="text-muted-foreground" />}
              onClick={() => setFilter(f => f === 'feedback' ? 'all' : 'feedback')}
              active={filter === 'feedback'}
            />
            <StatCard
              title={tx('Ø Bewertung')}
              value={avg === null ? tx('Noch offen') : `${avg.toFixed(1).replace('.', ',')} / 5`}
              description={countOf('abschlussbewertungen', eventRatings.length, appLabel('abschlussbewertungen'))}
              icon={<IconStar size={18} className="text-muted-foreground" />}
            />
          </StatCardRow>
        }
        aside={
          <>
            <WorkList
              title={tx('Antwort der KI offen')}
              items={awaitingKi.map(i => ({
                id: i.record_id,
                title: short(i.fields.frage, 50),
                secondLine: <span className="text-muted-foreground">{evTitle(i.fields.veranstaltung)} · {tx('Zusammenfassung liegt vor')}</span>,
                action: crud.interaktionen.canWrite ? { label: tx('Eintragen'), onClick: kiAction(i) } : undefined,
              }))}
              onItemClick={id => { const r = interaktionen.find(i => i.record_id === id); if (r) crud.interaktionen.openDetail(r); }}
              empty={{ text: tx('Alles erfasst — keine Zusammenfassung wartet auf eine KI-Antwort.') }}
            />
            {ratingRows.length > 0 && (
              <ChartWidget<EnrichedAbschlussbewertungen>
                title={tx('Abschlussbewertungen')}
                rows={ratingRows}
                dimension={{ kind: 'category', accessor: r => r.data.fields.sterne, label: tx('Sterne') }}
                interaction={{
                  mode: 'drill',
                  onSegmentClick: seg => {
                    const id = seg.rowIds[0]?.split(':')[1];
                    const rec = abschlussbewertungen.find(b => b.record_id === id);
                    if (rec) crud.abschlussbewertungen.openDetail(rec);
                  },
                }}
              />
            )}
          </>
        }
        primary={primary}
      />
      {crud.surfaces}
    </div>
  );
}
