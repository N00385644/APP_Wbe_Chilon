export const TIME_ZONE = 'America/Lima';
export const CURRENCY = 'PEN';

export function formatPEN(value: number | null | undefined): string {
  if (value == null) return 'Precio a confirmar';
  try {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: CURRENCY }).format(value);
  } catch {
    return `S/ ${value.toFixed(2)}`;
  }
}

export function formatFechaLima(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: TIME_ZONE, year: 'numeric', month: 'long', day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatFechaHoraLima(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: TIME_ZONE, year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
