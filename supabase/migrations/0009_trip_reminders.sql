-- =============================================================
-- Migración 0009: recordatorios de viaje por email (coste cero)
-- pg_cron (diario) -> pg_net -> Edge Function send-reminders -> Resend.
-- tour_requests.reminder_sent_at la escribe solo el servidor (service_role)
-- o un admin. El cliente puede hacer UPDATE de su fila (requests_cancel_own,
-- 0001) e INSERT (requests_insert_own), así que se añade una guarda
-- (patrón 0006). URL y secreto de invocación se leen de Supabase Vault en
-- cada ejecución: nada hardcodeado. Idempotente.
-- Ver docs/RECORDATORIOS.md.
-- =============================================================

alter table public.tour_requests
  add column if not exists reminder_sent_at timestamptz null;

-- Búsqueda diaria de la Edge Function (confirmadas sin recordatorio).
create index if not exists tour_requests_reminder_idx
  on public.tour_requests (confirmed_date)
  where status = 'confirmed' and reminder_sent_at is null;

-- ---------- Guarda: el cliente no escribe reminder_sent_at ----------
create or replace function public.guard_reminder_sent_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Si el admin reprograma la fecha, el viaje merece un recordatorio nuevo.
  if tg_op = 'UPDATE'
     and new.confirmed_date is distinct from old.confirmed_date
     and new.reminder_sent_at is not distinct from old.reminder_sent_at then
    new.reminder_sent_at := null;
  end if;

  if (tg_op = 'INSERT' and new.reminder_sent_at is not null)
     or (tg_op = 'UPDATE' and new.reminder_sent_at is distinct from old.reminder_sent_at) then
    -- Contexto privilegiado sin JWT de usuario (service_role / SQL Editor).
    if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then
      return new;
    end if;
    if not public.is_admin() then
      raise exception 'No autorizado: reminder_sent_at solo lo modifica el sistema o un administrador.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tour_requests_reminder_guard on public.tour_requests;
create trigger tour_requests_reminder_guard
  before insert or update on public.tour_requests
  for each row execute function public.guard_reminder_sent_at();

-- ---------- Extensiones ----------
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- ---------- Job diario: 13:00 UTC = 08:00 America/Lima ----------
-- Los secretos se leen de vault.decrypted_secrets al ejecutar el job; si aún
-- no existen ('project_url', 'reminders_cron_secret') el SELECT no devuelve
-- filas y no se llama a nada. Si pg_cron no está disponible (p. ej. entorno
-- local sin la extensión) la migración no falla: solo avisa.
do $do$
begin
  perform cron.schedule(
    'send-trip-reminders',
    '0 13 * * *',
    $job$
    select net.http_post(
      url := u.decrypted_secret || '/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || s.decrypted_secret
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    )
    from vault.decrypted_secrets u, vault.decrypted_secrets s
    where u.name = 'project_url'
      and s.name = 'reminders_cron_secret';
    $job$
  );
exception when others then
  raise warning 'send-trip-reminders no programado (%). Ver docs/RECORDATORIOS.md.', sqlerrm;
end
$do$;
