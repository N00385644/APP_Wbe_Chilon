-- =============================================================
-- Tours Cajamarca — Migración 0008: selección y asignación de asientos
-- Asientos preferidos/solicitados por el cliente y confirmados por la agencia.
-- =============================================================

alter table public.tour_requests
  add column if not exists requested_seats text,
  add column if not exists confirmed_seats text;

-- Función segura para consultar asientos ocupados de una fecha/tour sin exponer datos personales
create or replace function public.get_occupied_seats(p_tour_id uuid default null, p_date date default null)
returns table(seat text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_date is null then
    return;
  end if;
  return query
  select distinct trim(s) as seat
  from public.tour_requests r,
       unnest(string_to_array(coalesce(r.confirmed_seats, r.requested_seats), ',')) as s
  where r.status in ('confirmed', 'pending', 'in_review')
    and (
      (p_tour_id is null or r.tour_id = p_tour_id)
      and (r.confirmed_date = p_date or (r.confirmed_date is null and r.preferred_date = p_date))
    )
    and coalesce(r.confirmed_seats, r.requested_seats) is not null
    and trim(s) <> '';
end;
$$;

grant execute on function public.get_occupied_seats(uuid, date) to anon, authenticated;

