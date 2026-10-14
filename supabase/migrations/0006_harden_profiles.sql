-- =============================================================
-- Migración 0006: endurecer profiles.is_admin contra auto-promoción
-- Un usuario normal actualiza nombre/teléfono, pero nunca su propio rol.
-- Solo un admin cambia is_admin de OTRO usuario; nadie cambia el propio
-- por UPDATE ordinario (evita pérdida accidental). Bootstrap y cambios
-- privilegiados se hacen en contexto sin JWT (service_role / SQL Editor
-- como owner), documentado en docs/SETUP_SUPABASE.md.
-- No reescribe migraciones aplicadas. Idempotente (or replace + drop if exists).
-- Sin recursión RLS: usa public.is_admin() (security definer, bypasea RLS).
-- =============================================================

create or replace function public.prevent_is_admin_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    -- Contexto privilegiado sin JWT (service_role / postgres en SQL Editor):
    -- permite bootstrap del primer admin y operaciones autorizadas de soporte.
    if auth.uid() is null then
      return new;
    end if;
    -- Solo un admin puede tocar is_admin, y nunca el propio.
    if not public.is_admin() then
      raise exception 'No autorizado: is_admin solo puede ser modificado por un administrador.';
    end if;
    if new.id = auth.uid() then
      raise exception 'No autorizado: un usuario no puede modificar su propio rol (is_admin).';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_is_admin_guard on public.profiles;
create trigger profiles_is_admin_guard
  before update on public.profiles
  for each row execute function public.prevent_is_admin_self_change();
