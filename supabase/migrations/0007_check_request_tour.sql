-- =============================================================
-- Migración 0007: tour_requests.tour_id solo a tours publicados
-- El chat resuelve slug -> id contra tours publicados; esta guarda impide
-- que un cliente asigne un tour arbitrario o no publicado por API directa.
-- Compatible con histórico: solo valida cuando tour_id cambia (INSERT o
-- UPDATE con tour_id distinto); cambios de estado/notas no se bloquean.
-- tour_id NULL sigue válido (destino libre). Idempotente.
-- =============================================================

create or replace function public.check_request_tour_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_published boolean;
begin
  if new.tour_id is null then
    return new;
  end if;
  -- Solo validar si el vínculo cambia (compatibilidad con filas históricas).
  if tg_op = 'UPDATE' and new.tour_id is not distinct from old.tour_id then
    return new;
  end if;
  select t.is_published into v_published
  from public.tours t where t.id = new.tour_id;
  if not found then
    raise exception 'tour_id no existe en el catálogo.';
  end if;
  if not coalesce(v_published, false) then
    raise exception 'tour_id debe referenciar un tour publicado.';
  end if;
  return new;
end;
$$;

drop trigger if exists tour_requests_tour_published_check on public.tour_requests;
create trigger tour_requests_tour_published_check
  before insert or update on public.tour_requests
  for each row execute function public.check_request_tour_published();
