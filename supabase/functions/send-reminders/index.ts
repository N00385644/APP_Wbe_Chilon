// Edge Function: send-reminders (Deno, Supabase).
// La invoca pg_cron una vez al día (migración 0009). Envía por Resend un
// recordatorio a cada solicitud confirmada cuyo viaje es mañana o pasado
// mañana (America/Lima) y marca reminder_sent_at solo si el envío fue OK.
// Auth propia: Authorization: Bearer <REMINDERS_CRON_SECRET> (verify_jwt = false).
// Sin RESEND_API_KEY -> modo dry-run: no envía ni marca, solo reporta.
import { createClient } from 'jsr:@supabase/supabase-js@2.118.0';

import { buildEmail, limaDate, type ReminderRow } from './email.ts';

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

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
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
  if (!dryRun) {
    try {
      const url = new URL(siteUrl);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error();
    } catch {
      return json({ error: 'SITE_URL must be the HTTPS address of the website' }, 500);
    }
  }

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

  for (const row of (data ?? []) as unknown as ReminderRow[]) {
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
          'Idempotency-Key': `reminder-${row.id}-${row.confirmed_date}`,
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
        .eq('id', row.id).eq('status', 'confirmed')
        .eq('confirmed_date', row.confirmed_date).is('reminder_sent_at', null);
      if (upErr) {
        failed++;
        details.push({ id: row.id, result: 'sent but marker failed: retry required' });
        console.error('mark failed', row.id, upErr.message);
        continue;
      }
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
