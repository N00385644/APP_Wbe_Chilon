-- =============================================================
-- Migración 0010: columnas que solo escribe el admin (AUDIT_FASE6 S-1/S-2/S-3)
-- S-1: el cliente (JWT sin is_admin) solo crea su solicitud 'pending' sin
--      logística/asientos confirmados/notas internas, y solo puede cancelarla.
--      requested_seats se valida en servidor (formato 01-15, nº <= viajeros).
-- S-2: el cliente no cambia profiles.email (is_admin ya lo guarda 0006).
-- S-3: get_occupied_seats exige p_tour_id. NO se revoca a anon: el selector
--      de asientos del asistente (SeatPicker -> fetchOccupiedSeats) se usa
--      sin sesión. Ver docs/MIGRATIONS.md.
-- Contexto privilegiado (auth.uid() null / service_role / admin) no se
-- restringe, igual que 0006/0009. No reescribe migraciones. Idempotente.
-- Orden de triggers (alfabético): tour_requests_client_guard corre antes de
-- reminder_guard (0009), schedule_check (0003), touch y tour_published_check
-- (0007), así que al anular columnas en INSERT esas guardas ya no saltan.
-- =============================================================

-- ---------- S-1: guarda de columnas en tour_requests ----------
create or replace function public.guard_request_client_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seats text[];
  v_client boolean;
begin
  v_client := auth.uid() is not null
    and coalesce(auth.role(), '') <> 'service_role'
    and not public.is_admin();

  if v_client then
    if tg_op = 'INSERT' then
      -- Logística, asientos confirmados y notas internas son solo de la agencia.
      new.confirmed_seats := null;
      new.departure_time := null;
      new.meeting_point := null;
      new.departure_notes := null;
      new.admin_notes := null;
      new.confirmed_date := null;
      new.reminder_sent_at := null;
    else
      -- UPDATE: el cliente solo puede cambiar status, y solo a 'cancelled'.
      if (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
        raise exception 'No autorizado: solo puedes cancelar tu solicitud; los demás datos los gestiona la agencia.';
      end if;
      if new.status is distinct from old.status and new.status <> 'cancelled' then
        raise exception 'No autorizado: solo puedes cambiar el estado de tu solicitud a cancelada.';
      end if;
    end if;
  end if;

  -- requested_seats: validar al crear o al cambiar (filas históricas intactas).
  if tg_op = 'INSERT' or new.requested_seats is distinct from old.requested_seats then
    -- El asistente envía "01, 02": se normalizan espacios antes de validar.
    new.requested_seats := nullif(regexp_replace(coalesce(new.requested_seats, ''), '\s+', '', 'g'), '');
    if new.requested_seats is not null then
      if new.requested_seats !~ '^(0[1-9]|1[0-5])(,(0[1-9]|1[0-5]))*$' then
        raise exception 'Asientos no válidos: usa números del 01 al 15 separados por comas.';
      end if;
      v_seats := string_to_array(new.requested_seats, ',');
      if cardinality(v_seats) <> (select count(distinct s) from unnest(v_seats) as s) then
        raise exception 'Asientos no válidos: hay asientos repetidos.';
      end if;
      if cardinality(v_seats) > new.travelers_count then
        raise exception 'Asientos no válidos: eliges % asientos para % viajero(s).', cardinality(v_seats), new.travelers_count;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tour_requests_client_guard on public.tour_requests;
create trigger tour_requests_client_guard
  before insert or update on public.tour_requests
  for each row execute function public.guard_request_client_columns();

-- ---------- S-2: el cliente no cambia su email de perfil ----------
-- El email válido es el de auth.users (handle_new_user lo copia sin JWT).
create or replace function public.prevent_profile_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email
     and auth.uid() is not null
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
    raise exception 'No autorizado: el correo del perfil no se puede cambiar desde la app.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_email_guard on public.profiles;
create trigger profiles_email_guard
  before update on public.profiles
  for each row execute function public.prevent_profile_email_change();

-- ---------- S-3: get_occupied_seats exige tour ----------
-- Sin p_tour_id devolvía la ocupación de todos los tours del día; ahora vacío.
-- Se mantiene el grant a anon (selector de asientos sin sesión).
create or replace function public.get_occupied_seats(p_tour_id uuid default null, p_date date default null)
returns table(seat text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_date is null or p_tour_id is null then
    return;
  end if;
  return query
  select distinct trim(s) as seat
  from public.tour_requests r,
       unnest(string_to_array(coalesce(r.confirmed_seats, r.requested_seats), ',')) as s
  where r.status in ('confirmed', 'pending', 'in_review')
    and r.tour_id = p_tour_id
    and (r.confirmed_date = p_date or (r.confirmed_date is null and r.preferred_date = p_date))
    and coalesce(r.confirmed_seats, r.requested_seats) is not null
    and trim(s) <> '';
end;
$$;

grant execute on function public.get_occupied_seats(uuid, date) to anon, authenticated;
