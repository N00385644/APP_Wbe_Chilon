const TIME_ZONE = 'America/Lima';

export type ReminderRow = {
  id: string;
  user_id: string;
  requested_destination: string | null;
  confirmed_date: string;
  departure_time: string | null;
  meeting_point: string | null;
  departure_notes: string | null;
  confirmed_seats: string | null;
  tours: { title: string | null; meeting_point: string | null } | null;
  profiles: { full_name: string | null } | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Fecha YYYY-MM-DD en Lima, desplazada `offset` días.
export function limaDate(offset: number, now = new Date()): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [y, m, d] = today.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10);
}

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function buildEmail(row: ReminderRow, siteUrl: string) {
  const tour = row.tours?.title || row.requested_destination || 'Tu tour en Cajamarca';
  const fields: [string, string][] = [
    ['Tour', tour],
    ['Fecha', formatDate(row.confirmed_date)],
    ['Hora de salida', row.departure_time ? row.departure_time.slice(0, 5) : 'Por confirmar'],
    ['Punto de encuentro', row.meeting_point || row.tours?.meeting_point || 'Por confirmar'],
  ];
  if (row.confirmed_seats) fields.push(['Asientos confirmados', row.confirmed_seats]);
  if (row.departure_notes) fields.push(['Indicaciones', row.departure_notes]);

  // full_name es texto libre del cliente: se recorta para el saludo.
  const name = row.profiles?.full_name?.trim().slice(0, 80).trim();
  const greeting = name ? `Hola ${name},` : 'Hola,';
  const calendarUrl = siteUrl.replace(/\/+$/, '') + '/calendario';
  const subject = `Recordatorio: ${tour} el ${formatDate(row.confirmed_date)}`;

  const text = [
    greeting,
    '',
    'Te recordamos los datos de tu viaje confirmado:',
    '',
    ...fields.map(([k, v]) => `${k}: ${v}`),
    '',
    `Ver en tu calendario: ${calendarUrl}`,
    '',
    'Cajamarca Tours',
  ].join('\n');

  const rowsHtml = fields
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;vertical-align:top">${escapeHtml(k)}</td>` +
        `<td style="padding:4px 0;white-space:pre-line">${escapeHtml(v)}</td></tr>`,
    )
    .join('');
  const html =
    `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222">` +
    `<p>${escapeHtml(greeting)}</p>` +
    `<p>Te recordamos los datos de tu viaje confirmado:</p>` +
    `<table>${rowsHtml}</table>` +
    `<p><a href="${escapeHtml(calendarUrl)}">Ver en tu calendario</a></p>` +
    `<p>Cajamarca Tours</p></div>`;

  return { subject, text, html };
}

