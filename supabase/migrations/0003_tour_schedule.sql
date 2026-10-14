-- =============================================================
-- Tours Cajamarca — Migración 0003: logística confirmada del tour
-- Fecha/hora/punto de partida CONFIRMADOS por la agencia (admin).
-- El cliente solo lee estos campos (RLS existente: requests_select_own).
-- =============================================================

alter table public.tour_requests
  add column if not exists confirmed_date date,          -- fecha confirmada del tour
  add column if not exists departure_time time,          -- hora de salida
  add column if not exists meeting_point text,           -- punto de partida (si difiere del tour)
  add column if not exists departure_notes text;         -- instrucciones: recojo, qué llevar, etc.

create index if not exists tour_requests_schedule_idx
  on public.tour_requests (user_id, confirmed_date)
  where status = 'confirmed';

-- Coherencia: fecha confirmada solo tiene sentido si la reserva está confirmada
create or replace function public.check_confirmed_schedule()
returns trigger language plpgsql as $$
begin
  if new.status <> 'confirmed' and new.confirmed_date is not null then
    raise exception 'confirmed_date solo es válida cuando status = confirmed';
  end if;
  return new;
end $$;

drop trigger if exists tour_requests_schedule_check on public.tour_requests;
create trigger tour_requests_schedule_check
  before insert or update on public.tour_requests
  for each row execute function public.check_confirmed_schedule();
