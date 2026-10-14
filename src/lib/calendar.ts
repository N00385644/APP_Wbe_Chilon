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
