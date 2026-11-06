import type { Abschlussbewertungen, Feedbacks, Interaktionen } from './app';

export type EnrichedInteraktionen = Interaktionen & {
  veranstaltungName: string;
};

export type EnrichedFeedbacks = Feedbacks & {
  interaktionName: string;
};

export type EnrichedAbschlussbewertungen = Abschlussbewertungen & {
  veranstaltungName: string;
};
