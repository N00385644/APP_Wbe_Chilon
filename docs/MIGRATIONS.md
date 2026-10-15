# Historial de migraciones y reconciliación (Fase 1 — Problema 3)

No se renombró ningún fichero ya aplicado. No se borró historial. Esta nota
congela los nombres existentes y define el orden canónico + comprobaciones
de solo lectura antes de desplegar.

## Inventario (estado del repo, rama `fase1-correcciones-criticas`)

| Fichero | Crea / modifica | Depende de |
|---|---|---|
| `0001_schema.sql` | Tablas `profiles`, `tours`, `faqs`, `tour_requests`, `conversations`, `messages`, `unanswered_questions` + RLS + triggers `touch_updated_at`, `handle_new_user`, `is_admin()` | — |
| `0002_seed_demo.sql` | 2 tours `[DEMO]` (no publicados) + 6 FAQs | 0001 |
| `0003_tour_images.sql` | Tabla `tour_images` + RLS | 0001 |
| `0003_tour_schedule.sql` | Columnas `tour_requests.confirmed_date`, `departure_time`, `meeting_point`, `departure_notes` + índice parcial + trigger `check_confirmed_schedule` | 0001 |
| `0004_seed_chilon.sql` | 7 tours reales publicados + galería web/flyer en `tour_images` | 0001, ambos 0003 |
| `0005_whatsapp_photos.sql` | Tour `transporte-movilidades` + galería WhatsApp + captions + limpieza norte | 0004 |
| `0006_harden_profiles.sql` (Fase 1) | Trigger `profiles_is_admin_guard` + función `prevent_is_admin_self_change()` | 0001 |
| `0007_check_request_tour.sql` (Fase 1) | Trigger `tour_requests_tour_published_check`: `tour_id` solo a tours publicados (solo valida al cambiar el vínculo; NULL = destino libre) | 0001 |
| `0008_seat_selection.sql` | Columnas `requested_seats`, `confirmed_seats` + función RPC `get_occupied_seats` | 0001, 0003_tour_schedule |

Los dos ficheros `0003_*` son independientes entre sí (uno crea tabla nueva,
el otro altera `tour_requests`). El conflicto es solo de **numeración**:
algunas herramientas ordenan por nombre y el orden relativo de ambos 0003
queda ambiguo.

## Orden canónico de aplicación (entornos nuevos)

1. `0001_schema.sql`
2. `0002_seed_demo.sql`
3. `0003_tour_images.sql`
4. `0003_tour_schedule.sql`
5. `0004_seed_chilon.sql`
6. `0005_whatsapp_photos.sql`
7. `0006_harden_profiles.sql`
8. `0007_check_request_tour.sql`
9. `0008_seat_selection.sql`

Futuras migraciones usan `0009_*`, … Nunca reutilizar `0003`.

## Comprobaciones de solo lectura (antes de desplegar)

Ejecutar como lector (sin modificar datos). Todas deben pasar:

```sql
-- 1. Historial registrado (Supabase CLI / dashboard)
select version, name from supabase_migrations.schema_migrations order by version;

-- 2. Tabla tour_images existe (0003_tour_images)
select to_regclass('public.tour_images');

-- 3. Columnas de logística existen (0003_tour_schedule)
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'tour_requests'
and column_name in ('confirmed_date','departure_time','meeting_point','departure_notes');

-- 4. Trigger de coherencia existe
select tgname from pg_trigger where tgname = 'tour_requests_schedule_check';

-- 5. Trigger anti auto-admin existe (0006)
select tgname from pg_trigger where tgname = 'profiles_is_admin_guard';

-- 5b. Guarda de tour publicado existe (0007)
select tgname from pg_trigger where tgname = 'tour_requests_tour_published_check';

-- 6. Seeds aplicados
select slug, is_published from public.tours where slug in
  ('demo-cumbemayo','granja-porcon','cumbemayo','namora','ventanillas-otuzco',
   'hacienda-collpa','yanamarca-llacanora','playas-norte-5d4n','transporte-movilidades')
order by slug;
```

Si (2) falta pero (3) existe (o viceversa), el entorno aplicó solo uno de los
dos 0003: ir a reconciliación.

## Reconciliación de entornos con historiales distintos

Principios: comprobar primero en staging; nunca borrar filas de
`schema_migrations` sin respaldo; nunca renombrar ficheros ya aplicados sin
`supabase migration repair`.

1. **Backup**: snapshot del proyecto (dashboard → Backups) y `pg_dump` de
   `public.profiles`, `public.tours`, `public.tour_requests` como mínimo.
2. **Inventario**: guardar salida de las 6 comprobaciones en staging y prod.
3. **Casos**:
   - **Falta `tour_images`**: aplicar solo `0003_tour_images.sql` en staging,
     verificar (2), luego prod en ventana de mantenimiento.
   - **Faltan columnas de logística**: aplicar solo `0003_tour_schedule.sql`.
     Nota histórica: este fichero se aplicaba manualmente por SQL Editor
     (ver AGENTS.md previo a Fase 1); tras reconciliar, ambos 0003 deben
     quedar registrados.
   - **Historial CLI desincronizado** (fichero aplicado por SQL Editor pero no
     en `schema_migrations`): usar en staging
     `supabase migration repair --status applied --version <versión>` o
     `... --status reverted` según corresponda (ver `supabase migration repair --help`),
     re-verificar con (1)–(6), y solo entonces repetir en prod.
4. **Congelar**: tras reconciliar, todos los entornos deben mostrar el mismo
   set (1)–(6). A partir de ahí, solo `supabase db push` o SQL Editor con
   registro, nunca mezcla sin anotar.

## Reglas futuras

- Un número de versión, un fichero. El próximo es `0007_*`.
- Migraciones idempotentes cuando sea seed (`on conflict do nothing` con
  target explícito) y `if not exists` en DDL.
- Prohibido reescribir una migración ya aplicada en prod; cualquier corrección
  va en migración nueva.
- Cambios destructivos (`drop`, `delete`) requieren autorización explícita y
  van en migración separada con plan de rollback.
