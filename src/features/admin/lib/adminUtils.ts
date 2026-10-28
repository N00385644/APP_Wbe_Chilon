// Lógica pura del panel administrativo (sin React ni Supabase).
// Todo se calcula con fechas de calendario en America/Lima: las columnas
// `confirmed_date`/`preferred_date` son DATE (sin hora) y no deben desplazarse
// al convertirlas a `Date` en un navegador con otra zona horaria.
import type { TourRequest } from '../../../lib/types';

export const LIMA_TIME_ZONE = 'America/Lima';

/** Solicitud con las relaciones que el panel pide a Supabase (admin puede leerlas por RLS). */
export type AdminRequest = TourRequest & {
  profiles?: { full_name: string | null; email: string | null } | null;
  tours?: { title: string | null } | null;
};

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateKey(value: string | null | undefined): { y: number; m: number; d: number } | null {
  const match = DATE_KEY.exec(String(value ?? '').slice(0, 10));
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return { y, m, d };
}

/** Clave 'YYYY-MM-DD' del día actual en America/Lima. */
export function limaDateKey(value: Date | string = new Date()): string {
  if (typeof value === 'string') {
    const direct = DATE_KEY.exec(value.slice(0, 10));
    if (direct) return value.slice(0, 10);
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LIMA_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Diferencia en días de calendario entre `isoDate` y hoy.
 * 0 = hoy, 1 = mañana, negativo = pasado. `null` si alguna fecha no es válida.
 */
export function dayOffset(isoDate: string | null | undefined, today: Date | string = new Date()): number | null {
  const target = parseDateKey(isoDate);
  const base = parseDateKey(limaDateKey(today));
  if (!target || !base) return null;
  const diff = Date.UTC(target.y, target.m - 1, target.d) - Date.UTC(base.y, base.m - 1, base.d);
  return Math.round(diff / 86_400_000);
}

/** Etiqueta legible de una fecha DATE, sin desplazamientos de zona horaria. */
export function formatDateLabel(isoDate: string | null | undefined): string {
  const parsed = parseDateKey(isoDate);
  if (!parsed) return String(isoDate ?? '—');
  try {
    const text = new Intl.DateTimeFormat('es-PE', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
    }).format(new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)));
    return text.charAt(0).toUpperCase() + text.slice(1);
  } catch {
    return String(isoDate);
  }
}

export type DepartureGroupKey = 'today' | 'tomorrow' | 'week';

export type DepartureGroup = {
  key: DepartureGroupKey;
  label: string;
  items: AdminRequest[];
};

/** Agrupa las salidas confirmadas de los próximos `horizonDays` días: hoy, mañana y resto de la semana. */
export function groupUpcomingDepartures(
  requests: AdminRequest[],
  today: Date | string = new Date(),
  horizonDays = 7,
): DepartureGroup[] {
  const groups: DepartureGroup[] = [
    { key: 'today', label: 'Hoy', items: [] },
    { key: 'tomorrow', label: 'Mañana', items: [] },
    { key: 'week', label: 'Resto de la semana', items: [] },
  ];
  const horizon = Math.max(1, horizonDays);

  for (const request of requests) {
    if (request.status !== 'confirmed' || !request.confirmed_date) continue;
    const offset = dayOffset(request.confirmed_date, today);
    if (offset === null || offset < 0 || offset >= horizon) continue;
    const index = offset === 0 ? 0 : offset === 1 ? 1 : 2;
    groups[index].items.push(request);
  }

  for (const group of groups) {
    group.items.sort((a, b) => {
      const dateCmp = String(a.confirmed_date ?? '').localeCompare(String(b.confirmed_date ?? ''));
      if (dateCmp !== 0) return dateCmp;
      const timeCmp = String(a.departure_time ?? '99:99').localeCompare(String(b.departure_time ?? '99:99'));
      if (timeCmp !== 0) return timeCmp;
      return String(a.id).localeCompare(String(b.id));
    });
  }

  return groups;
}

/** Campos de logística que faltan en una solicitud confirmada, en orden de importancia. */
export function missingLogistics(
  request: Pick<TourRequest, 'confirmed_date' | 'departure_time' | 'meeting_point'>,
): string[] {
  const missing: string[] = [];
  if (!request.confirmed_date) missing.push('fecha');
  if (!request.departure_time) missing.push('hora');
  if (!request.meeting_point?.trim()) missing.push('punto de encuentro');
  return missing;
}

/** Cuenta asientos escritos como '03', '03, 04', '01-04' o '3 y 4'. */
export function countSeats(value: string | null | undefined): number {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const tokens = raw.split(/[,;]+|\s+y\s+/i).map((t) => t.trim()).filter(Boolean);
  let total = 0;
  for (const token of tokens) {
    const range = /^(\d{1,3})\s*[-–]\s*(\d{1,3})$/.exec(token);
    if (range) {
      total += Math.abs(Number(range[2]) - Number(range[1])) + 1;
    } else if (/\d/.test(token)) {
      total += 1;
    }
  }
  return total;
}

export type OverviewStats = {
  pending: number;
  inReview: number;
  unattended: number;
  confirmedNext7: number;
  weekTravelers: number;
  weekSeats: number;
  incompleteLogistics: AdminRequest[];
  upcoming: DepartureGroup[];
};

/** Contadores del resumen y aviso de logística incompleta. */
export function computeOverviewStats(
  requests: AdminRequest[],
  today: Date | string = new Date(),
  horizonDays = 7,
): OverviewStats {
  const horizon = Math.max(1, horizonDays);
  let pending = 0;
  let inReview = 0;
  let confirmedNext7 = 0;
  let weekTravelers = 0;
  let weekSeats = 0;
  const incompleteLogistics: AdminRequest[] = [];

  for (const request of requests) {
    if (request.status === 'pending') pending += 1;
    if (request.status === 'in_review') inReview += 1;

    if (request.status === 'confirmed') {
      if (missingLogistics(request).length > 0) incompleteLogistics.push(request);
      const offset = request.confirmed_date ? dayOffset(request.confirmed_date, today) : null;
      if (offset !== null && offset >= 0 && offset < horizon) {
        confirmedNext7 += 1;
        const travelers = Number(request.travelers_count);
        weekTravelers += Number.isFinite(travelers) && travelers > 0 ? travelers : 0;
        weekSeats += countSeats(request.confirmed_seats || request.requested_seats);
      }
    }
  }

  return {
    pending,
    inReview,
    unattended: pending + inReview,
    confirmedNext7,
    weekTravelers,
    weekSeats,
    incompleteLogistics,
    upcoming: groupUpcomingDepartures(requests, today, horizon),
  };
}

/**
 * Normaliza un teléfono peruano al formato internacional que exige wa.me.
 * '901 195 392' -> '51901195392'; '+51 901 195 392' se conserva.
 * Devuelve `null` si no hay dígitos suficientes.
 */
export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  digits = digits.replace(/^0+/, '');
  if (digits.length < 6) return null;
  if (digits.startsWith('51') && digits.length >= 11) return digits;
  return `51${digits}`;
}

/** URL de WhatsApp con el mensaje codificado, o `null` si el teléfono no sirve. */
export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/** Mensaje para el cliente con los datos del viaje ya confirmados o solicitados. */
export function buildTripWhatsAppMessage(request: AdminRequest): string {
  const destination = request.tours?.title?.trim() || request.requested_destination?.trim() || 'su tour';
  const date = request.confirmed_date || request.preferred_date;
  const seats = request.confirmed_seats || request.requested_seats;
  const lines = [
    'Hola, le escribimos de Turismo Chilán por su solicitud de tour.',
    '',
    `Tour: ${destination}`,
  ];

  if (date) lines.push(`Fecha: ${formatDateLabel(date)}`);
  if (request.departure_time) lines.push(`Hora de salida: ${request.departure_time.slice(0, 5)}`);
  if (request.meeting_point?.trim()) lines.push(`Punto de encuentro: ${request.meeting_point.trim()}`);
  if (seats) lines.push(`Asiento(s): ${seats}`);
  lines.push(`Viajeros: ${request.travelers_count}`);
  lines.push(`Referencia: #${request.id.slice(0, 8)}`);
  lines.push('', 'Cualquier duda, responda a este mensaje. ¡Buen viaje!');
  return lines.join('\n');
}
