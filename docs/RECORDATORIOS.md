# Recordatorios de viaje por email (coste cero)

El cliente recibe un email 1–2 días antes de su viaje **confirmado** con tour,
fecha, hora de salida, punto de encuentro, indicaciones, asientos y un enlace a
`/calendario`. Sin IA y sin coste: Supabase free (pg_cron + pg_net + Edge
Functions) + Resend free.

```
pg_cron (diario 13:00 UTC = 08:00 Lima)
  └─ pg_net: POST <project_url>/functions/v1/send-reminders
       Authorization: Bearer <reminders_cron_secret>   (ambos desde Vault)
         └─ Edge Function send-reminders (service_role, solo servidor)
              ├─ tour_requests status='confirmed', confirmed_date ∈ [hoy+1, hoy+2] (Lima),
              │  reminder_sent_at is null
              ├─ Resend API -> email HTML + texto
              └─ reminder_sent_at = now() solo si Resend respondió OK
```

Piezas en el repo:

- `supabase/migrations/0009_trip_reminders.sql`: columna `reminder_sent_at`,
  trigger `tour_requests_reminder_guard` (el cliente no puede escribirla; si
  el admin cambia `confirmed_date` se reinicia para enviar otro recordatorio),
  extensiones `pg_cron`/`pg_net` y job `send-trip-reminders`.
- `supabase/functions/send-reminders/index.ts`: la Edge Function.
- `supabase/config.toml`: `[functions.send-reminders] verify_jwt = false`
  (la autenticación es el secreto propio `REMINDERS_CRON_SECRET`).

Ninguno de estos secretos va al frontend ni usa prefijo `VITE_`.

## 1. Cuenta Resend (gratis)

1. Crear cuenta en <https://resend.com> (sin tarjeta).
2. **API Keys → Create API Key** con permiso *Sending access*. Copiar la clave
   (`re_...`); solo se muestra una vez.
3. Remitente:
   - **Pruebas:** usar `onboarding@resend.dev`. Sin dominio verificado, Resend
     solo entrega a **tu propio email** (el de la cuenta Resend).
   - **Producción:** **Domains → Add Domain** (p. ej. `cajamarcatours.pe`),
     añadir en el DNS los registros SPF/DKIM (y opcional DMARC) que indica
     Resend y esperar a *Verified*. Luego usar algo como
     `Cajamarca Tours <reservas@cajamarcatours.pe>`.

## 2. Secretos de la Edge Function

Generar un secreto aleatorio para el cron (guárdalo, se usa también en Vault):

```bash
openssl rand -hex 32
```

```bash
supabase login
supabase link --project-ref <PROJECT_REF>

supabase secrets set \
  RESEND_API_KEY=re_xxxxxxxx \
  REMINDER_FROM_EMAIL="Cajamarca Tours <onboarding@resend.dev>" \
  SITE_URL=https://tu-sitio.vercel.app \
  REMINDERS_CRON_SECRET=<el-secreto-generado>
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase
automáticamente en las Edge Functions; no hay que definirlos.

Sin `RESEND_API_KEY` la función trabaja en **dry-run**: busca, construye los
emails, no envía, no marca `reminder_sent_at` y devuelve `"dryRun": true`.

## 3. Desplegar la función

```bash
supabase functions deploy send-reminders
```

`verify_jwt = false` se toma de `supabase/config.toml` (equivale a
`--no-verify-jwt`).

## 4. Aplicar la migración

```bash
supabase db push
```

o pegar `0009_trip_reminders.sql` en el SQL Editor. Si `pg_cron` no estuviera
disponible, la migración no falla: emite un `WARNING` y el job se puede crear
después re-ejecutando el bloque `do $do$ ... $do$` del fichero.

## 5. Secretos en Vault (para el job de pg_cron)

El job lee la URL del proyecto y el secreto en **cada ejecución** desde
`vault.decrypted_secrets`. Si faltan, el job no llama a nada (no falla).
En el SQL Editor:

```sql
select vault.create_secret('https://<PROJECT_REF>.supabase.co', 'project_url');
select vault.create_secret('<el-secreto-generado>', 'reminders_cron_secret');
```

Para rotar el secreto (y repetir `supabase secrets set REMINDERS_CRON_SECRET=...`):

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'reminders_cron_secret'),
  '<nuevo-secreto>'
);
```

Comprobar:

```sql
select name from vault.decrypted_secrets
where name in ('project_url', 'reminders_cron_secret');
select jobname, schedule, active from cron.job where jobname = 'send-trip-reminders';
```

## 6. Probar

Llamada manual (sustituye valores):

```bash
curl -i -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders" \
  -H "Authorization: Bearer <el-secreto-generado>" \
  -H "Content-Type: application/json" -d '{}'
```

Respuesta esperada:

```json
{ "sent": 1, "failed": 0, "skipped": 0, "dryRun": false,
  "window": { "from": "2026-10-29", "to": "2026-10-30" }, "details": [...] }
```

- Sin header o secreto incorrecto → `401`.
- Para tener un caso: en el panel admin confirmar una solicitud propia con
  fecha de mañana (y, si usas `onboarding@resend.dev`, que el usuario tenga el
  mismo email que la cuenta Resend).
- Reenviar a una fila ya marcada (solo pruebas, SQL Editor):
  `update public.tour_requests set reminder_sent_at = null where id = '<id>';`
- Ejecutar el job sin esperar a las 08:00: copiar el `select net.http_post(...)`
  del job y ejecutarlo en el SQL Editor; la respuesta queda en
  `select * from net._http_response order by created desc limit 5;`.
- Historial del cron: `select * from cron.job_run_details order by start_time desc limit 10;`.
- Logs de la función: Dashboard → Edge Functions → send-reminders → Logs.

## 7. Límites del plan gratuito

| Servicio | Límite free | Uso de esta función |
|---|---|---|
| Resend | 3 000 emails/mes, 100 emails/día, 1 dominio | 1 email por viaje confirmado |
| Supabase Edge Functions | 500 000 invocaciones/mes | 1 invocación/día (~30/mes) |
| pg_cron / pg_net | incluidos | 1 job diario |

- Más de 100 viajes confirmados para el mismo par de días superan el límite
  diario de Resend: los que fallen quedan con `reminder_sent_at` nulo y se
  reintentan al día siguiente si siguen dentro de la ventana (hoy+1..hoy+2).
- Los proyectos Supabase free se pausan tras ~1 semana sin actividad; un
  proyecto pausado no ejecuta el cron.
- Límites sujetos a cambios del proveedor; revisar sus páginas de precios.

## 8. Desactivar

```sql
select cron.unschedule('send-trip-reminders');
```
