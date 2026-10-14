// Fuente única de validación y construcción de solicitudes.
// La usan el chat (ChatWidget/DraftCard) y el formulario de contacto:
// una sola regla, sin duplicar entre chat, formularios y admin.
//
// Principios:
// - Validar ANTES de guardar (mensajes comprensibles, sin SQL crudo).
// - Normalizar (trim + colapsar espacios) en lugar de rechazar de más.
// - Nombres: admiten tildes, apóstrofos, guiones y caracteres internacionales.
// - Teléfono opcional: vacío -> null; con contenido debe parecer un teléfono.
// - Fechas: YYYY-MM-DD estricta, comparada en America/Lima; el pasado se
//   rechaza en cliente (la empresa no confirmó regla de anticipación: ver docs).
// - Viajeros: enteros estrictos (sin decimales ni negativos); total = a + m.
// - Nunca inventar relaciones: tour_id no-UUID -> null (destino libre).
import type { BookingDraft } from '../features/chatbot/engine/chatTree';
import { coerceTourLink } from '../features/chatbot/engine/chatTree';
import type { CreateRequestInput } from '../services/requests';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const LIMITS = {
  destination: 200,
  name: 80,
  phone: 30,
  notes: 2000,
  adultsMax: 50,
  childrenMax: 50,
  // Debe respetar el CHECK travelers_coherent (total <= 100).
  totalMax: 100,
} as const;

export type FieldErrors = Partial<
  Record<'destination' | 'preferred_date' | 'adults' | 'children' | 'contact_phone' | 'full_name', string>
>;

/** Colapsa espacios y recorta. '' si queda vacío. */
export function normalizeText(v: unknown, max: number): string {
  return String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Regla única del total: adultos + menores. */
export function totalTravelers(adults: number, children: number): number {
  return adults + children;
}

/** Destino: obligatorio, no vacío ni solo espacios, máx 200. */
export function validateDestination(v: unknown): { value: string | null; error: string | null } {
  const value = normalizeText(v, LIMITS.destination);
  if (!value) return { value: null, error: 'Escribe o elige un destino (no puede quedar vacío).' };
  return { value, error: null };
}

/**
 * Nombre: 2–80 caracteres tras normalizar. Admite tildes, apóstrofos,
 * guiones y caracteres internacionales (no se restringe el alfabeto).
 */
export function validateName(v: unknown): { value: string | null; error: string | null } {
  const value = normalizeText(v, LIMITS.name);
  if ([...value].length < 2) return { value: null, error: 'Escribe tu nombre (mín. 2 caracteres).' };
  return { value, error: null };
}

/**
 * Teléfono opcional: vacío -> null (sigue siendo válido).
 * Con contenido: admite dígitos, +, espacios, guiones, paréntesis y puntos;
 * exige entre 7 y 20 dígitos. No se impone formato de país (sin regla comercial).
 */
export function validatePhoneOptional(v: unknown): { value: string | null; error: string | null } {
  const raw = String(v ?? '').trim().slice(0, LIMITS.phone);
  if (!raw) return { value: null, error: null };
  const value = raw.replace(/\s+/g, ' ');
  if (/[a-zA-Z]/.test(value)) {
    return { value: null, error: 'Ese teléfono tiene letras. Usa solo números (puedes incluir + al inicio).' };
  }
  if (!/^[+()\-.\s\d]+$/.test(value)) {
    return { value: null, error: 'Ese teléfono no parece válido. Revisa los caracteres.' };
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 20) {
    return { value: null, error: 'El teléfono debe tener entre 7 y 20 dígitos.' };
  }
  return { value, error: null };
}

/** Observaciones: opcionales, normalizadas, máx 2000. Vacías -> null. */
export function validateNotes(v: unknown): string | null {
  const value = normalizeText(v, LIMITS.notes);
  return value || null;
}

function isValidCalendarDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Hoy en America/Lima como YYYY-MM-DD (sin confusión UTC). */
export function todayLimaISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts; // YYYY-MM-DD
}

/**
 * Fecha preferida concreta. Acepta null/'' (ausente) y la marca flexible.
 * Exige formato YYYY-MM-DD + fecha de calendario real.
 * Rechaza fechas pasadas en America/Lima (comparación por día, no por instante).
 * No inventa anticipación mínima: la empresa no confirmó esa regla.
 */
export function validatePreferredDate(
  v: unknown,
  opts?: { flexible?: boolean; now?: Date },
): { value: string | null; flexible: boolean; error: string | null } {
  const raw = String(v ?? '').trim();
  if (!raw) return { value: null, flexible: !!opts?.flexible, error: null };
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    return { value: null, flexible: false, error: 'Usa el formato de fecha AAAA-MM-DD (ej. 2026-11-20) o elige fecha flexible.' };
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!isValidCalendarDate(y, mo, d)) {
    return { value: null, flexible: false, error: 'Esa fecha no existe en el calendario. Revísala.' };
  }
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  if (iso < todayLimaISO(opts?.now)) {
    return { value: null, flexible: false, error: 'Esa fecha ya pasó. Elige hoy o una fecha futura, o marca fecha flexible.' };
  }
  return { value: iso, flexible: false, error: null };
}

function parseStrictInt(v: unknown): number | null {
  if (typeof v === 'number') {
    return Number.isInteger(v) ? v : null;
  }
  if (typeof v === 'string') {
    const t = v.trim();
    if (!/^-?\d+$/.test(t)) return null;
    const n = Number(t);
    return Number.isSafeInteger(n) ? n : null;
  }
  return null;
}

/**
 * Viajeros con enteros estrictos (rechaza decimales, negativos y basura).
 * Adultos >= 1, menores >= 0, total 1..100 (respeta el CHECK de la BD).
 */
export function validateTravelers(
  adultsIn: unknown,
  childrenIn: unknown,
): { adults: number; children: number; errors: Pick<FieldErrors, 'adults' | 'children'> } {
  const errors: Pick<FieldErrors, 'adults' | 'children'> = {};
  const a = parseStrictInt(adultsIn);
  const c = parseStrictInt(childrenIn ?? 0);
  let adults = 1;
  let children = 0;
  if (a === null || a < 1) {
    errors.adults = 'Adultos debe ser un número entero de 1 o más.';
  } else if (a > LIMITS.adultsMax) {
    errors.adults = `Adultos: máximo ${LIMITS.adultsMax} por solicitud. Para grupos mayores, contáctanos por WhatsApp.`;
  } else {
    adults = a;
  }
  if (c === null || c < 0) {
    errors.children = 'Menores debe ser un número entero de 0 o más.';
  } else if (c > LIMITS.childrenMax) {
    errors.children = `Menores: máximo ${LIMITS.childrenMax} por solicitud.`;
  } else {
    children = c;
  }
  if (!errors.adults && !errors.children && totalTravelers(adults, children) > LIMITS.totalMax) {
    errors.children = `El total no puede pasar de ${LIMITS.totalMax} viajeros (límite de la base de datos).`;
  }
  return { adults, children, errors };
}

/** Compatibilidad: acota sin fallar (solo para rutas legacy que no validan). */
export function clampTravelers(adultsIn: unknown, childrenIn: unknown): { adults: number; children: number } {
  const adults = Math.max(1, Math.min(LIMITS.adultsMax, Math.floor(Number(adultsIn ?? 1)) || 1));
  const children = Math.max(0, Math.min(LIMITS.childrenMax, Math.floor(Number(childrenIn ?? 0)) || 0));
  return { adults, children };
}

/**
 * Guardia anti doble envío (prevención de duplicados por doble clic).
 * tryStart() devuelve false si ya hay un envío en curso; finish() libera.
 * Tras un error se llama finish() para permitir el reintento; tras éxito
 * el llamador marca el borrador como enviado en lugar de liberar.
 */
export function createSubmitGuard(): { tryStart(): boolean; finish(): void; readonly active: boolean } {
  let active = false;
  return {
    tryStart() {
      if (active) return false;
      active = true;
      return true;
    },
    finish() {
      active = false;
    },
    get active() {
      return active;
    },
  };
}

export type DraftValidation =
  | { ok: true; payload: Omit<CreateRequestInput, 'user_id' | 'tour_id'> }
  | { ok: false; errors: FieldErrors };

/**
 * Valida un borrador completo y devuelve el payload normalizado
 * (los mismos valores que verá el resumen y que irán a Supabase).
 * No resuelve tour_id: el llamador lo aporta ya validado.
 */
export function validateBookingDraft(d: BookingDraft, dateNow?: Date): DraftValidation {
  const errors: FieldErrors = {};
  const dest = validateDestination(d.requested_destination);
  if (dest.error) errors.destination = dest.error;
  const date = validatePreferredDate(d.preferred_date, { flexible: d.date_is_flexible, now: dateNow });
  if (date.error) errors.preferred_date = date.error;
  if (!date.value && !date.flexible) {
    errors.preferred_date = 'Falta la fecha: escribe AAAA-MM-DD o elige fecha flexible.';
  }
  const t = validateTravelers(d.adults, d.children);
  if (t.errors.adults) errors.adults = t.errors.adults;
  if (t.errors.children) errors.children = t.errors.children;
  const phone = validatePhoneOptional(d.contact_phone);
  if (phone.error) errors.contact_phone = phone.error;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    payload: {
      requested_destination: dest.value,
      preferred_date: date.value,
      date_is_flexible: date.flexible,
      adults: t.adults,
      children: t.children,
      travelers_count: totalTravelers(t.adults, t.children),
      contact_phone: phone.value,
      additional_notes: validateNotes(d.additional_notes),
      status: 'pending',
    },
  };
}

/**
 * Construye el payload de INSERT con un tour_id ya validado.
 * El llamador debe resolver slug->id contra tours publicados antes
 * (ver services/tours.ts). Aquí solo se sanea: un tour_id no-UUID
 * se descarta a null en lugar de inventar relaciones.
 * Normaliza destino/notas/teléfono igual que el resumen.
 */
export function buildTourRequestPayload(args: {
  userId: string;
  draft: BookingDraft;
  tourId: string | null;
  dateIsFlexible?: boolean;
}): CreateRequestInput {
  const draft: BookingDraft = {
    ...args.draft,
    date_is_flexible: args.draft.date_is_flexible ?? args.dateIsFlexible ?? false,
  };
  const checked = validateBookingDraft(draft);
  // Ruta legacy tolerante: si el borrador no pasa la validación estricta,
  // se envía saneado (clamp) para no romper flujos antiguos; los flujos
  // nuevos (chat/contacto) validan antes y nunca llegan aquí con errores.
  const { adults, children } = clampTravelers(draft.adults, draft.children);
  const tour_id = args.tourId && UUID_RE.test(args.tourId.trim()) ? args.tourId : coerceTourLink(args.tourId);
  const base = checked.ok
    ? checked.payload
    : {
        requested_destination: normalizeText(draft.requested_destination, LIMITS.destination) || null,
        preferred_date: typeof draft.preferred_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(draft.preferred_date)
          ? draft.preferred_date
          : null,
        date_is_flexible: draft.date_is_flexible ?? false,
        adults,
        children,
        travelers_count: totalTravelers(adults, children),
        contact_phone: String(draft.contact_phone ?? '').trim().slice(0, LIMITS.phone) || null,
        additional_notes: validateNotes(draft.additional_notes),
        status: 'pending' as const,
      };
  return { user_id: args.userId, tour_id, ...base };
}
