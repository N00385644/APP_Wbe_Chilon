// Edge Function: send-reminders (Deno, Supabase).
// La invoca pg_cron una vez al día (migración 0009). Envía por Resend un
// recordatorio a cada solicitud confirmada cuyo viaje es mañana o pasado
// mañana (America/Lima) y marca reminder_sent_at solo si el envío fue OK.
// Auth propia: Authorization: Bearer <REMINDERS_CRON_SECRET> (verify_jwt = false).
// Sin RESEND_API_KEY -> modo dry-run: no envía ni marca, solo reporta.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const TIME_ZONE = 'America/Lima';

type Row = {
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Comparación en tiempo constante (sobre la longitud del secreto esperado).
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ (y[i] ?? 0);
  return diff === 0;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Fecha YYYY-MM-DD en Lima, desplazada `offset` días.
function limaDate(offset: number): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
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

function buildEmail(row: Row, siteUrl: string) {
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

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('REMINDERS_CRON_SECRET');
  const auth = req.headers.get('Authorization') ?? '';
  if (!cronSecret || !safeEqual(auth, `Bearer ${cronSecret}`)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' }, 500);
  }
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('REMINDER_FROM_EMAIL') ?? 'Cajamarca Tours <onboarding@resend.dev>';
  const siteUrl = Deno.env.get('SITE_URL') ?? '';
  const dryRun = !resendKey;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const from = limaDate(1);
  const to = limaDate(2);
  const { data, error } = await admin
    .from('tour_requests')
    .select(
      'id, user_id, requested_destination, confirmed_date, departure_time, meeting_point, departure_notes, confirmed_seats, tours(title, meeting_point), profiles(full_name)',
    )
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)
    .gte('confirmed_date', from)
    .lte('confirmed_date', to);
  if (error) {
    console.error('query failed', error.message);
    return json({ error: 'query failed' }, 500);
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const details: { id: string; result: string }[] = [];

  for (const row of (data ?? []) as unknown as Row[]) {
    // Destinatario: siempre el email verificado de auth.users, nunca
    // profiles.email (editable por el cliente, AUDIT_FASE6 S-2).
    const { data: u } = await admin.auth.admin.getUserById(row.user_id);
    const email = u?.user?.email_confirmed_at ? (u.user.email ?? null) : null;
    if (!email) {
      skipped++;
      details.push({ id: row.id, result: 'skipped: sin email' });
      continue;
    }

    const message = buildEmail(row, siteUrl);
    if (dryRun) {
      skipped++;
      details.push({ id: row.id, result: 'dry-run: no enviado' });
      continue;
    }

    // Resend free limita a ~2 peticiones/segundo.
    if (sent + failed > 0) await new Promise((r) => setTimeout(r, 600));
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `reminder-${row.id}-${from}`,
        },
        body: JSON.stringify({ from: fromEmail, to: [email], ...message }),
      });
      if (!res.ok) {
        failed++;
        details.push({ id: row.id, result: `failed: resend ${res.status}` });
        console.error('resend error', row.id, res.status, await res.text());
        continue;
      }
      const { error: upErr } = await admin
        .from('tour_requests')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', row.id);
      if (upErr) console.error('mark failed', row.id, upErr.message);
      sent++;
      details.push({ id: row.id, result: 'sent' });
    } catch (e) {
      failed++;
      details.push({ id: row.id, result: 'failed: network' });
      console.error('send error', row.id, e);
    }
  }

  return json({ sent, failed, skipped, dryRun, window: { from, to }, details });
});
