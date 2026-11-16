-- Preparación de despliegue: historial privado, preferencias sin bloqueo de
-- plazas y notas internas accesibles únicamente a administradores.
-- No modifica ni elimina registros existentes.

alter policy "conv_own" on public.conversations
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter policy "msg_own" on public.messages
  to authenticated
  using (
    auth.uid() = user_id and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- Los mensajes del asistente escritos por el servidor pueden carecer de user_id.
create policy "msg_read_own_conversation" on public.messages
  for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  ));

create or replace function public.get_occupied_seats(p_tour_id uuid default null, p_date date default null)
returns table(seat text)
language sql stable security definer set search_path = public
as $$
  select distinct trim(s) as seat
  from public.tour_requests r
  join public.tours t on t.id = r.tour_id and t.is_published
  cross join lateral unnest(string_to_array(r.confirmed_seats, ',')) as s
  where r.tour_id = p_tour_id
    and r.status = 'confirmed'
    and r.confirmed_date = p_date
    and trim(s) <> '';
$$;

revoke all on function public.get_occupied_seats(uuid, date) from public;
grant execute on function public.get_occupied_seats(uuid, date) to anon, authenticated;

-- RLS limita filas, no columnas: ocultar notas en React no protege la API.
revoke select on public.tour_requests from public, anon, authenticated;
grant select (
  id, user_id, tour_id, requested_destination, preferred_date, date_is_flexible,
  adults, children, travelers_count, contact_phone, additional_notes, status,
  created_at, updated_at, confirmed_date, departure_time, meeting_point,
  departure_notes, requested_seats, confirmed_seats, reminder_sent_at
) on public.tour_requests to authenticated;

create or replace function public.get_admin_request_notes(p_ids uuid[])
returns table(id uuid, admin_notes text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado: los comentarios internos son solo para administradores.'
      using errcode = '42501';
  end if;
  return query
    select r.id, r.admin_notes from public.tour_requests r where r.id = any(p_ids);
end;
$$;

revoke all on function public.get_admin_request_notes(uuid[]) from public, anon;
grant execute on function public.get_admin_request_notes(uuid[]) to authenticated;

-- Los triggers no son APIs: la aplicación no necesita invocarlos por RPC.
alter function public.touch_updated_at() set search_path = public;
alter function public.check_confirmed_schedule() set search_path = public;
revoke execute on function public.handle_new_user(), public.prevent_is_admin_self_change(),
  public.check_request_tour_published(), public.guard_reminder_sent_at(),
  public.guard_request_client_columns(), public.prevent_profile_email_change()
  from public, anon, authenticated;
