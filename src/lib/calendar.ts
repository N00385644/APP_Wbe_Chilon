// Helpers puros para el calendario de tours (testeables, sin dependencias).

export const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const WEEKDAYS_ES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

/** Celda del grid: null = día fuera del mes. */
export type CalendarCell = { date: Date; iso: string } | null;

/** Convierte una fecha a clave ISO local 'YYYY-MM-DD' (sin saltos de zona horaria). */
export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Fecha de hoy en ISO (para resaltar el día actual). */
export function todayISO(): string {
  return toISODate(new Date());
}

/**
 * Construye el grid de un mes (6 semanas x 7 días, empezando en lunes).
 * @param year  año completo, ej. 2026
 * @param month índice 0-11 (igual que Date.getMonth())
 */
export function buildMonthGrid(year: number, month: number): CalendarCell[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay(): 0=domingo … 6=sábado → convertir a lunes=0 … domingo=6
  const startOffset = (first.getDay() + 6) % 7;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ date, iso: toISODate(date) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Navega un mes hacia atrás/adelante. Delta típico: -1 o +1. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** Formatea 'HH:MM[:SS]' (columna time de Postgres) a '7:00 a. m.' */
export function formatHoraEs(time: string | null | undefined): string {
  if (!time) return '—';
  const m = time.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return time;
  let h = parseInt(m[1], 10);
  const suffix = h >= 12 ? 'p. m.' : 'a. m.';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m[2]} ${suffix}`;
}

/** Etiqueta corta de fecha a partir de ISO 'YYYY-MM-DD', ej. 'sáb 18 oct'. */
export function formatFechaCortaEs(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  try {
    return new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
      .format(new Date(y, m - 1, d));
  } catch {
    return iso;
  }
}

/** Zona horaria oficial de la agencia (Perú, sin horario de verano). */
export const LIMA_TZ = 'America/Lima';

/** Valida y descompone una fecha ISO 'YYYY-MM-DD' (sin pasar por zonas horarias). */
function parseISODate(iso: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return { y, m, d };
}

/**
 * Días de calendario que faltan para `isoDate` respecto a `today`.
 * 0 = hoy, 1 = mañana, negativo = ya pasó. `null` si alguna fecha no es válida.
 * Se comparan fechas locales (no instantes), así que no afecta la hora del día.
 */
export function daysUntil(isoDate: string, today: Date | string = new Date()): number | null {
  const target = parseISODate(isoDate);
  if (!target) return null;

  const base = typeof today === 'string'
    ? parseISODate(today.slice(0, 10))
    : today instanceof Date && !Number.isNaN(today.getTime())
      ? { y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate() }
      : null;
  if (!base) return null;

  const diff = Date.UTC(target.y, target.m - 1, target.d) - Date.UTC(base.y, base.m - 1, base.d);
  return Math.round(diff / 86_400_000);
}

/** Etiqueta de cuenta atrás: 'Hoy', 'Mañana', 'Faltan 3 días'… */
export function countdownLabel(isoDate: string | null | undefined, today: Date | string = new Date()): string | null {
  if (!isoDate) return null;
  const days = daysUntil(isoDate, today);
  if (days === null) return null;
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days > 1) return `Faltan ${days} días`;
  if (days === -1) return 'Fue ayer';
  return `Hace ${Math.abs(days)} días`;
}

/** Fecha larga en español: 'sábado, 18 de octubre de 2026'. */
export function formatFechaLargaEs(iso: string | null | undefined): string {
  if (!iso) return 'Fecha por confirmar';
  const parsed = parseISODate(iso.slice(0, 10));
  if (!parsed) return iso;
  try {
    const text = new Intl.DateTimeFormat('es-PE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(parsed.y, parsed.m - 1, parsed.d));
    return text.charAt(0).toUpperCase() + text.slice(1);
  } catch {
    return iso;
  }
}

/** Escapado RFC 5545 para valores TEXT (comas, punto y coma, barras y saltos de línea). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Pliega líneas a 75 octetos UTF-8 (RFC 5545 §3.1) sin partir caracteres. */
function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    // Las líneas de continuación empiezan con un espacio, que cuenta en los 75.
    const limit = parts.length === 0 ? 75 : 74;
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Suma minutos a una fecha+hora local y devuelve sus componentes ya normalizados. */
function addMinutes(date: string, time: string, minutes: number) {
  const { y, m, d } = parseISODate(date)!;
  const [hh, mm, ss] = time.split(':').map(Number);
  const stamp = new Date(Date.UTC(y, m - 1, d, hh, mm, ss || 0) + minutes * 60_000);
  return {
    date: `${stamp.getUTCFullYear()}-${pad2(stamp.getUTCMonth() + 1)}-${pad2(stamp.getUTCDate())}`,
    time: `${pad2(stamp.getUTCHours())}:${pad2(stamp.getUTCMinutes())}:${pad2(stamp.getUTCSeconds())}`,
  };
}

/** Siguiente día de una fecha ISO (DTEND exclusivo de los eventos de día completo). */
function nextISODate(date: string): string {
  const { y, m, d } = parseISODate(date)!;
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}

/** 'YYYY-MM-DD' → 'YYYYMMDD' (formato de fecha compacto de iCalendar). */
function compactDate(iso: string): string {
  return iso.replace(/-/g, '');
}

/** 'HH:MM:SS' → 'HHMMSS'. */
function compactTime(time: string): string {
  return time.replace(/:/g, '');
}

/** Minutos válidos de una hora 'HH:MM[:SS]'; `null` si la hora no es válida. */
function parseHora(time: string | null | undefined): { h: number; m: number; s: number } | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = match[3] ? Number(match[3]) : 0;
  if (h > 23 || m > 59 || s > 59) return null;
  return { h, m, s };
}

export type IcsEventInput = {
  /** Identificador estable (id de la solicitud). */
  uid: string;
  title: string;
  /** Fecha local de Lima en ISO 'YYYY-MM-DD'. */
  date: string;
  /** Hora local 'HH:MM' o 'HH:MM:SS'. Sin hora = evento de día completo. */
  time?: string | null;
  /** Duración en minutos (por defecto 8 horas). */
  durationMinutes?: number;
  location?: string | null;
  description?: string | null;
  /** Enlace opcional a la ficha del tour. */
  url?: string | null;
  /** Instante de generación del archivo (DTSTAMP); inyectable en tests. */
  stamp?: Date;
};

/** Instante UTC compacto para DTSTAMP, ej. '20261028T130000Z'. */
function stampUTC(stamp: Date): string {
  return `${stamp.getUTCFullYear()}${pad2(stamp.getUTCMonth() + 1)}${pad2(stamp.getUTCDate())}` +
    `T${pad2(stamp.getUTCHours())}${pad2(stamp.getUTCMinutes())}${pad2(stamp.getUTCSeconds())}Z`;
}

/**
 * Genera un archivo .ics (RFC 5545) para un tour confirmado.
 * Con hora: DTSTART/DTEND en hora local de Lima; sin hora: evento de día completo.
 * Incluye dos recordatorios: 1 día y 2 horas antes.
 */
export function buildIcs(event: IcsEventInput): string {
  if (!parseISODate(event.date)) throw new Error(`Fecha inválida para el calendario: ${event.date}`);

  const hora = parseHora(event.time);
  const startDate = compactDate(event.date);
  const duration = event.durationMinutes && event.durationMinutes > 0 ? event.durationMinutes : 8 * 60;
  const stamp = stampUTC(event.stamp ?? new Date());
  const summary = escapeIcsText(event.title.trim() || 'Tour confirmado');

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cajamarca Tours//Agenda de viajes//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    `TZID:${LIMA_TZ}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0500',
    'TZNAME:PET',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(event.uid)}@cajamarcatours`,
    `DTSTAMP:${stamp}`,
  ];

  if (hora) {
    const start = `${startDate}T${pad2(hora.h)}${pad2(hora.m)}${pad2(hora.s)}`;
    const end = addMinutes(event.date, `${pad2(hora.h)}:${pad2(hora.m)}:${pad2(hora.s)}`, duration);
    lines.push(
      `DTSTART;TZID=${LIMA_TZ}:${start}`,
      `DTEND;TZID=${LIMA_TZ}:${compactDate(end.date)}T${compactTime(end.time)}`,
    );
  } else {
    lines.push(
      `DTSTART;VALUE=DATE:${startDate}`,
      `DTEND;VALUE=DATE:${compactDate(nextISODate(event.date))}`,
    );
  }

  lines.push(`SUMMARY:${summary}`);
  if (event.location?.trim()) lines.push(`LOCATION:${escapeIcsText(event.location.trim())}`);
  if (event.description?.trim()) lines.push(`DESCRIPTION:${escapeIcsText(event.description.trim())}`);
  if (event.url?.trim()) lines.push(`URL:${event.url.trim()}`);
  lines.push('STATUS:CONFIRMED');

  for (const trigger of ['-P1D', '-PT2H']) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${summary}`,
      `TRIGGER:${trigger}`,
      'END:VALARM',
    );
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

/** URL de 'Google Calendar → Añadir evento' para el mismo tour. */
export function buildGoogleCalendarUrl(event: IcsEventInput): string {
  if (!parseISODate(event.date)) throw new Error(`Fecha inválida para el calendario: ${event.date}`);

  const hora = parseHora(event.time);
  const startDate = compactDate(event.date);
  const duration = event.durationMinutes && event.durationMinutes > 0 ? event.durationMinutes : 8 * 60;

  let dates: string;
  let ctz = '';
  if (hora) {
    const start = `${startDate}T${pad2(hora.h)}${pad2(hora.m)}${pad2(hora.s)}`;
    const end = addMinutes(event.date, `${pad2(hora.h)}:${pad2(hora.m)}:${pad2(hora.s)}`, duration);
    dates = `${start}/${compactDate(end.date)}T${compactTime(end.time)}`;
    ctz = `&ctz=${encodeURIComponent(LIMA_TZ)}`;
  } else {
    dates = `${startDate}/${compactDate(nextISODate(event.date))}`;
  }

  const params = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(event.title)}`,
    `dates=${dates}${ctz}`,
    event.location?.trim() ? `location=${encodeURIComponent(event.location.trim())}` : '',
    event.description?.trim() ? `details=${encodeURIComponent(event.description.trim())}` : '',
  ].filter(Boolean).join('&');

  return `https://calendar.google.com/calendar/render?${params}`;
}
