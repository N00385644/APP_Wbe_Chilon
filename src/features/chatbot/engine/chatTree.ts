// Árbol de decisiones del chat — conversación guiada estilo WhatsApp.
// Estructura: intents fijos por botones + texto libre con búsqueda local
// en tours/faqs publicados + escalamiento a WhatsApp. Sin IA ni servicios externos.

export type ChatOption = { value: string; label: string };

export type BookingDraft = {
  requested_destination?: string;
  preferred_date?: string | null;
  /** true = el visitante eligió fecha flexible (distinto de "sin fecha"). */
  date_is_flexible?: boolean;
  adults?: number;
  children?: number;
  /** Rango elegido en el árbol ('1' | '2' | '3-5' | '6+'), si aplica. */
  pax_range?: string;
  /** true cuando el número de viajeros ya es exacto (no un rango). */
  pax_confirmed?: boolean;
  contact_phone?: string;
  additional_notes?: string;
  tour_id?: string | null;
  tour_slug?: string | null;
  ready_to_confirm?: boolean;
  missing?: string[];
  /** Asiento(s) elegido(s) o preferido(s) en el minibús (ej. '03, 04'). */
  requested_seats?: string | null;
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

export const PAX_RANGE_LABEL: Record<string, string> = {
  '1': '1 viajero',
  '2': '2 viajeros',
  '3-5': '3 a 5 viajeros',
  '6+': '6 o más',
};

/** Solo '1' y '2' son cantidades exactas; los rangos exigen confirmación. */
export function isExactPax(v: string): boolean {
  return v === '1' || v === '2';
}

/**
 * Sanea un tour_id candidato: solo acepta UUID válido, nunca un slug.
 * Un slug jamás equivale a un UUID: si llega un slug u otro texto,
 * devuelve null (la solicitud sigue válida como destino libre).
 */
export function coerceTourLink(tourId: string | null | undefined): string | null {
  if (!tourId) return null;
  const v = tourId.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v : null;
}

/** Hoy en America/Lima como YYYY-MM-DD (comparación por día, sin confusión UTC). */
export function todayLimaISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function isValidCalendarDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Paso de reserva -> valida qué falta para confirmar (misma regla que el guardado web).
 * - Destino con solo espacios cuenta como falta.
 * - Fecha flexible (date_is_flexible) cubre la fecha; sin ella se exige
 *   YYYY-MM-DD válida y no pasada en America/Lima.
 * - Rangos de viajeros exigen el número exacto antes de confirmar.
 * - Viajeros con enteros estrictos (sin decimales ni negativos).
 */
export function bookingMissing(d: BookingDraft, now: Date = new Date()): string[] {
  const missing: string[] = [];
  const dest = String(d.requested_destination ?? '').replace(/\s+/g, ' ').trim();
  if (!dest) missing.push('destino');
  const flex = !!d.date_is_flexible;
  const raw = String(d.preferred_date ?? '').trim();
  if (!raw && !flex) {
    missing.push('fecha (o fecha flexible)');
  } else if (raw) {
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m || !isValidCalendarDate(Number(m[1]), Number(m[2]), Number(m[3]))) {
      missing.push('fecha inválida (usa AAAA-MM-DD)');
    } else if (raw < todayLimaISO(now)) {
      missing.push('fecha pasada (elige hoy, futuro o fecha flexible)');
    }
  }
  if (d.pax_range && !d.pax_confirmed && !isExactPax(d.pax_range)) {
    missing.push('número exacto de viajeros');
  }
  const a = typeof d.adults === 'number' && Number.isInteger(d.adults) ? d.adults : NaN;
  const c = typeof d.children === 'number' && Number.isInteger(d.children) ? d.children : NaN;
  const total = (Number.isNaN(a) ? 0 : a) + (Number.isNaN(c) ? 0 : c);
  if (!Number.isInteger(total) || total < 1 || a < 1 || c < 0 || total > 100) {
    missing.push('número de viajeros');
  }
  return missing;
}

/**
 * Resumen con los mismos valores normalizados que irán a Supabase.
 * finishBooking normaliza el borrador antes de llamar aquí y de construir
 * el payload, así resumen y payload coinciden por construcción.
 */
export function bookingSummary(d: BookingDraft): string {
  const dest = String(d.requested_destination ?? '').replace(/\s+/g, ' ').trim() || '—';
  const raw = String(d.preferred_date ?? '').trim();
  const fecha = raw || (d.date_is_flexible ? 'flexible' : '—');
  const adults = typeof d.adults === 'number' && Number.isInteger(d.adults) ? d.adults : 1;
  const children = typeof d.children === 'number' && Number.isInteger(d.children) ? d.children : 0;
  const total = adults + children;
  return (
    `Resumen de tu solicitud:\n` +
    `• Destino: ${dest}\n` +
    `• Fecha: ${fecha}\n` +
    `• Viajeros: ${total} (adultos: ${adults}, menores: ${children})\n` +
    (d.requested_seats ? `• Asiento(s) elegido(s): ${d.requested_seats}\n` : '') +
    (d.contact_phone ? `• Teléfono: ${d.contact_phone}\n` : '') +
    `Revísalo y confirma abajo. Es una solicitud pendiente, no un pago.`
  );
}
