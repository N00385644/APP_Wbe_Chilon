# Runbook de integración contra staging (Fase 4)

ESTADO: **integración real PENDIENTE**. No existe proyecto staging configurado
(no hay CLI Supabase ni proyecto staging en el repo; `.env` apunta al proyecto
real y está prohibido usarlo para pruebas). Este documento es el procedimiento
reproducible + los datos de prueba. Ninguna prueba viva se ha ejecutado.

## Requisito previo: crear staging (sin tocar producción)

1. Crear proyecto `APP_Wbe_Chilon-staging` en el dashboard de Supabase.
2. Configurar Google OAuth con URIs de staging (ver `docs/GOOGLE_OAUTH.md`).
3. Registrar en `schema_migrations` aplicando en orden canónico
   (`docs/MIGRATIONS.md`): 0001, 0002, 0003_images, 0003_schedule, 0004,
   0005, 0006, 0007. Nunca aplicar a producción desde aquí.
4. Crear 3 usuarios de prueba: `anon` (sin login), `cliente-a@test.local`,
   `cliente-b@test.local`, `admin@test.local` (este último promovido por SQL
   privilegiado según `docs/SETUP_SUPABASE.md`).
5. Datos de prueba: 1 tour publicado (`slug=test-staging-cumbemayo`),
   1 tour NO publicado (`slug=test-staging-oculto`), 1 FAQ publicada.
   Nombres con prefijo `test-staging-` para borrarlos sin ambigüedad.

## 1. Migraciones y triggers (solo lectura primero)

```sql
select version, name from supabase_migrations.schema_migrations order by version;
select tgname from pg_trigger where tgname in
  ('profiles_is_admin_guard','tour_requests_tour_published_check','tour_requests_schedule_check');
select slug, is_published from public.tours where slug like 'test-staging-%';
```

## 2. Matriz RLS (ejecutar cada bloque con el JWT indicado)

```sql
-- Como cliente-a: inserción válida -> 1 fila pending, tour publicado
insert into public.tour_requests
  (user_id, tour_id, requested_destination, preferred_date, adults, children,
   travelers_count, contact_phone, status)
values
  (auth.uid(), (select id from public.tours where slug = 'test-staging-cumbemayo'),
   'Cumbemayo test', '2026-12-01', 2, 0, 2, '+51900000001', 'pending');

-- Como cliente-a: estado privilegiado -> DEBE FALLAR (RLS)
insert into public.tour_requests
  (user_id, requested_destination, adults, children, travelers_count, status)
values (auth.uid(), 'X', 1, 0, 1, 'confirmed');

-- Como cliente-a: auto-confirmar la propia -> DEBE FALLAR
update public.tour_requests set status = 'confirmed'
where user_id = auth.uid() and status = 'pending';

-- Como cliente-a: leer de cliente-b -> 0 filas
select * from public.tour_requests where user_id != auth.uid();

-- Como cliente-a: auto-admin -> DEBE FALLAR (trigger 0006)
update public.profiles set is_admin = true where id = auth.uid();

-- Como cliente-a: tour no publicado -> DEBE FALLAR (trigger 0007)
insert into public.tour_requests
  (user_id, tour_id, requested_destination, adults, children, travelers_count, status)
values (auth.uid(),
  (select id from public.tours where slug = 'test-staging-oculto'),
  'Oculto test', 1, 0, 1, 'pending');

-- Como cliente-a: tour inexistente -> DEBE FALLAR (FK/trigger 0007)
insert into public.tour_requests
  (user_id, tour_id, requested_destination, adults, children, travelers_count, status)
values (auth.uid(), '123e4567-e89b-12d3-a456-426614174000', 'Falso test', 1, 0, 1, 'pending');

-- Como cliente-a: destino libre (tour_id null) -> OK
insert into public.tour_requests
  (user_id, requested_destination, adults, children, travelers_count, status)
values (auth.uid(), 'Destino libre test', 1, 0, 1, 'pending');

-- Como admin: cambiar estado ajena pending -> confirmed -> OK
-- Como admin: promover a cliente-b -> OK; degradarse a sí mismo -> DEBE FALLAR
```

Registrar por caso: rol, sentencia, resultado esperado vs real, `SQLSTATE`.

## 3. Frontend contra staging

1. Apuntar build local a staging (`VITE_SUPABASE_URL` de staging en `.env.local`,
   jamás commitear valores).
2. Flujo chat completo con `test-staging-cumbemayo`: menú -> destino -> fecha
   futura -> rango `3-5` -> número exacto `4` -> omitir teléfono -> guardar web.
   Verificar `tour_id` resuelto y `requested_destination` intacto.
3. Doble clic en "También guardar en la web": debe crear **1 sola** fila
   (protección actual: solo frontend). Repetir con throttling de red
   (DevTools 3G) y anotar si aparece duplicado.
4. Modo offline al guardar: debe mostrar "Sin conexión", sin éxito falso y
   con datos conservados.
5. Contacto con fecha pasada: error comprensible, valores conservados.

## 4. Limpieza

```sql
delete from public.tour_requests where requested_destination like '%test%';
delete from public.tours where slug like 'test-staging-%';
```

## 5. Idempotencia en servidor (OPCIÓN DOCUMENTADA, NO IMPLEMENTADA)

Protección actual: solo frontend (guardia + botón deshabilitado + borrador
marcado). No cubre reintento con respuesta perdida (el servidor crea 2 filas).
Opción más segura si la empresa la aprueba (requiere migración nueva 0008,
probar primero en staging con datos existentes):

- Columna `client_request_id uuid NOT NULL DEFAULT gen_random_uuid()` +
  `UNIQUE (user_id, client_request_id)`; el cliente genera un UUID por
  borrador y lo reenvía en reintentos.
- Impacto: no destructiva (default cubre histórico), pero añade superficie
  (el cliente podría reutilizar claves). Alternativa: ventana de
  deduplicación (misma `user_id` + `requested_destination` + `preferred_date`
  en <60 s rechaza) — más mágica, menos predecible.
- Decisión pendiente de la empresa. Mientras tanto NO inventar columnas.

## 6. Registro de ejecución

| Fecha | Entorno | Casos | Resultado | Pendientes |
|---|---|---|---|---|
| — | — | — | No ejecutado (sin staging) | Todos los de §2–§3 |
