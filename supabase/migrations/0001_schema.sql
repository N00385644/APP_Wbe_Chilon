-- =============================================================
-- Tours Cajamarca — Migración 0001: esquema + RLS + roles
-- Ejecutar en Supabase SQL Editor o con `supabase db push`.
-- Zona horaria de referencia: America/Lima (se formatea en frontend).
-- Moneda: PEN (soles).
-- =============================================================

-- Extensiones
create extension if not exists "pgcrypto";

-- ---------- Tabla profiles (1:1 con auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Tabla tours ----------
create table public.tours (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_description text,
  description text,
  destination text,
  duration text,
  price_from numeric(10,2),
  currency text not null default 'PEN',
  itinerary text,
  includes text,
  excludes text,
  meeting_point text,
  recommendations text,
  image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tours_price_check check (price_from is null or price_from >= 0),
  constraint tours_slug_check check (slug ~ '^[a-z0-9-]+$')
);
create index tours_published_idx on public.tours (is_published);
create index tours_destination_idx on public.tours (destination);

-- ---------- Tabla faqs ----------
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  question text not null,
  answer text not null,
  keywords text,
  is_published boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index faqs_published_idx on public.faqs (is_published);
create index faqs_search_idx on public.faqs
  using gin (to_tsvector('spanish', coalesce(question,'') || ' ' || coalesce(answer,'') || ' ' || coalesce(keywords,'')));

-- ---------- Tabla tour_requests (solicitudes, NO reservas confirmadas) ----------
create table public.tour_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tour_id uuid references public.tours(id) on delete set null,
  requested_destination text,
  preferred_date date,
  date_is_flexible boolean not null default false,
  adults int not null default 1,
  children int not null default 0,
  travelers_count int not null default 1,
  contact_phone text,
  additional_notes text,
  status text not null default 'pending'
    check (status in ('pending','in_review','contacted','confirmed','cancelled')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint travelers_coherent check (adults >= 1 and children >= 0 and travelers_count = adults + children and travelers_count <= 100)
);
create index tour_requests_user_idx on public.tour_requests (user_id, created_at desc);
create index tour_requests_status_idx on public.tour_requests (status);

-- ---------- Conversaciones y mensajes ----------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_user_idx on public.conversations (user_id, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  created_at timestamptz not null default now()
);
create index messages_conv_idx on public.messages (conversation_id, created_at);

-- ---------- Preguntas no respondidas (revisión admin) ----------
create table public.unanswered_questions (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  conversation_id uuid references public.conversations(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- updated_at automático ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger tours_touch before update on public.tours
  for each row execute function public.touch_updated_at();
create trigger faqs_touch before update on public.faqs
  for each row execute function public.touch_updated_at();
create trigger tour_requests_touch before update on public.tour_requests
  for each row execute function public.touch_updated_at();
create trigger conversations_touch before update on public.conversations
  for each row execute function public.touch_updated_at();

-- ---------- Crear perfil automáticamente al registrarse (Google OAuth) ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.email)
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    email = coalesce(excluded.email, public.profiles.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Helper: ¿soy admin? (evita recursión RLS) ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.tours enable row level security;
alter table public.faqs enable row level security;
alter table public.tour_requests enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.unanswered_questions enable row level security;

-- profiles: cada uno solo el suyo; nadie puede auto-darse admin
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);
-- Admin puede leer todos (panel)
create policy "profiles_admin_read" on public.profiles
  for select using (public.is_admin());

-- tours/faqs publicados: lectura pública (anon + authenticated)
create policy "tours_public_read" on public.tours
  for select using (is_published = true);
create policy "tours_admin_all" on public.tours
  for all using (public.is_admin()) with check (public.is_admin());

create policy "faqs_public_read" on public.faqs
  for select using (is_published = true);
create policy "faqs_admin_all" on public.faqs
  for all using (public.is_admin()) with check (public.is_admin());

-- tour_requests: dueño total excepto auto-confirmar; admin gestiona
create policy "requests_select_own" on public.tour_requests
  for select using (auth.uid() = user_id);
create policy "requests_insert_own" on public.tour_requests
  for insert with check (auth.uid() = user_id and status in ('pending'));
create policy "requests_cancel_own" on public.tour_requests
  for update using (auth.uid() = user_id and status in ('pending','in_review'))
  with check (
    auth.uid() = user_id
    and status in ('pending','cancelled')  -- el cliente solo puede cancelar, nunca confirmar
  );
create policy "requests_admin_all" on public.tour_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- conversations/messages: solo dueño; admin NO lee chats privados por defecto
create policy "conv_own" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id or user_id is null);
create policy "msg_own" on public.messages
  for all using (
    auth.uid() = user_id or
    exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_id = auth.uid() or c.user_id is null))
  ) with check (
    auth.uid() = user_id or user_id is null
  );

-- unanswered: solo admin lectura/escritura (el Edge Function usa service_role)
create policy "unanswered_admin" on public.unanswered_questions
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Primer administrador (contexto privilegiado) ----------
-- Asignar el primer admin desde SQL con service_role o dashboard, NUNCA desde el frontend:
--   update public.profiles set is_admin = true where email = 'tu-correo@gmail.com';
