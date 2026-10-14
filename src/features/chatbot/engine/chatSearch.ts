// Motor de búsqueda local del menú guiado (puro, testeable).
// Extraído de ChatWidget.answerLocal: misma regla, sin JSX ni estado.
// Normaliza tildes para que "cumbemayo" matchee "Cumbemayo".
import type { MinimalTour } from './chatTree';

export type TourHit = MinimalTour & {
  short_description?: string | null;
  meeting_point?: string | null;
};

export type FaqHit = { category: string; question: string; answer: string };

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function keywords(text: string): string[] {
  return norm(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
}

/**
 * Busca primero en tours publicados y luego en FAQs.
 * Devuelve el primer match por palabra clave (regla histórica del chat).
 */
export function searchCatalog(
  tours: TourHit[],
  faqs: FaqHit[],
  text: string,
): { kind: 'tour'; tour: TourHit } | { kind: 'faq'; faq: FaqHit } | { kind: 'none' } {
  const q = norm(text);
  const tourHit = tours.find((t) =>
    keywords(`${t.title} ${t.destination ?? ''} ${t.short_description ?? ''}`).some((w) => q.includes(w)),
  );
  if (tourHit) return { kind: 'tour', tour: tourHit };
  const faqHit = faqs.find((f) =>
    keywords(`${f.question} ${f.answer} ${f.category}`).some((w) => q.includes(w)),
  );
  if (faqHit) return { kind: 'faq', faq: faqHit };
  return { kind: 'none' };
}
