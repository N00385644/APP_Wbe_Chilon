// Árbol de decisiones del chat — conversación guiada estilo WhatsApp.
// Estructura: intents fijos (70-90% de casos) + texto libre como fallback a la IA
// (Edge Function con grounding en tours/faqs) + escalamiento a humano.

export type ChatOption = { value: string; label: string };

export type BookingDraft = {
  requested_destination?: string;
  preferred_date?: string | null;
  adults?: number;
  children?: number;
  contact_phone?: string;
  additional_notes?: string;
  tour_id?: string | null;
  tour_slug?: string | null;
  ready_to_confirm?: boolean;
  missing?: string[];
};

export const MAIN_MENU_OPTIONS: ChatOption[] = [
  { value: 'tours', label: 'Ver tours disponibles' },
  { value: 'prices', label: 'Consultar precios y horarios' },
  { value: 'booking', label: 'Quiero reservar / solicitar' },
  { value: 'faqs', label: 'Preguntas frecuentes' },
  { value: 'help', label: 'Hablar con un asesor' },
];

export const START_TEXT =
  '¿Qué te gustaría hacer hoy?\nPara empezar, toca Menú principal y elige una de las opciones.';

export const FAQ_OPTIONS: ChatOption[] = [
  { value: 'faq:pagos', label: 'Pagos y precios' },
  { value: 'faq:cancel', label: 'Cancelaciones y cambios' },
  { value: 'faq:punto', label: 'Punto de encuentro y horarios' },
  { value: 'faq:dura', label: 'Duración y qué llevar' },
  { value: 'faq:otra', label: 'Otra pregunta (escribir)' },
];

export const BOOKING_DATE_OPTIONS: ChatOption[] = [
  { value: 'flexible', label: 'Fecha flexible' },
  { value: 'finde', label: 'Este fin de semana' },
  { value: 'semana', label: 'La próxima semana' },
];

export const BOOKING_PAX_OPTIONS: ChatOption[] = [
  { value: '1', label: '1 viajero' },
  { value: '2', label: '2 viajeros' },
  { value: '3-5', label: '3 a 5 viajeros' },
  { value: '6+', label: '6 o más' },
];

export type MinimalTour = { slug: string; title: string; destination?: string | null };

export function tourOptions(tours: MinimalTour[]): ChatOption[] {
  const opts = tours.slice(0, 6).map((t) => ({ value: `tour:${t.slug}`, label: t.title }));
  opts.push({ value: 'menu', label: '⬅ Volver al menú' });
  return opts;
}

export function destinationOptions(tours: MinimalTour[]): ChatOption[] {
  const seen = new Map<string, string>();
  for (const t of tours) {
    const d = (t.destination ?? t.title).trim();
    if (d && !seen.has(d.toLowerCase())) seen.set(d.toLowerCase(), d);
    if (seen.size >= 5) break;
  }
  return [...seen.values()].map((d) => ({ value: `dest:${d}`, label: d }));
}

const FALLBACKS = ['Cumbemayo', 'Baños del Inca', 'Granja Porcón', 'Ventanillas de Otuzco'];
export function fallbackDestinations(): ChatOption[] {
  return FALLBACKS.map((d) => ({ value: `dest:${d}`, label: d }));
}

export function paxToNumbers(v: string): { adults: number; children: number } {
  if (v === '1') return { adults: 1, children: 0 };
  if (v === '2') return { adults: 2, children: 0 };
  if (v === '3-5') return { adults: 3, children: 0 };
  return { adults: 6, children: 0 };
}

/** Paso de reserva -> valida qué falta para confirmar (misma regla que la Edge Function). */
export function bookingMissing(d: BookingDraft): string[] {
  const missing: string[] = [];
  if (!d.requested_destination) missing.push('destino');
  if (!d.preferred_date) missing.push('fecha preferida');
  const total = Number(d.adults ?? 0) + Number(d.children ?? 0);
  if (total < 1) missing.push('número de viajeros');
  return missing;
}

export function bookingSummary(d: BookingDraft): string {
  const total = Number(d.adults ?? 1) + Number(d.children ?? 0);
  return (
    `Resumen de tu solicitud:\n` +
    `• Destino: ${d.requested_destination ?? '—'}\n` +
    `• Fecha: ${d.preferred_date ?? 'flexible'}\n` +
    `• Viajeros: ${total}\n` +
    (d.contact_phone ? `• Teléfono: ${d.contact_phone}\n` : '') +
    `Revísalo y confirma abajo. Es una solicitud pendiente, no un pago.`
  );
}
