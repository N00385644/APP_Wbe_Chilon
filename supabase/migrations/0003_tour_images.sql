-- =============================================================
-- Migración 0003: galería de imágenes de referencia por tour
-- Un tour tiene 1 portada (tours.image_url) + N imágenes (tour_images).
-- El admin las gestiona desde el panel (por URL o bundled /tours/).
-- =============================================================

create table public.tour_images (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  image_url text not null check (char_length(image_url) between 1 and 2000),
  caption text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
create index tour_images_tour_idx on public.tour_images (tour_id, display_order);

alter table public.tour_images enable row level security;

-- Lectura pública solo de imágenes de tours publicados
create policy "tour_images_public_read" on public.tour_images
  for select using (
    exists (select 1 from public.tours t where t.id = tour_id and t.is_published = true)
  );

-- Solo admin puede crear/editar/eliminar (el panel exige sesión admin)
create policy "tour_images_admin_all" on public.tour_images
  for all using (public.is_admin()) with check (public.is_admin());
