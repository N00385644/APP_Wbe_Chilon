# Auditoría Fase 6 — Seguridad RLS, UX cliente, accesibilidad y rendimiento

> **Solo informe.** No se modificó código. Fecha: 2026-10-28.
>
> **Revisión auditada:** la rama del worktree (`team/audit`, `4db1000`) todavía no
> contiene `0009_trip_reminders.sql`, `supabase/functions/send-reminders/` ni la
> tarjeta "Tu próximo viaje"/`.ics`. Por eso se auditó el estado integrado de
> `fase6-ui-ux` (`b1f1192`, merges de `team/reminders`, `team/deploy` y
> `team/cliente-ux`), leído con `git show b1f1192:<ruta>`. **Los números de línea
> corresponden a `b1f1192`.**
>
> Severidad: **Alta** = explotable por un cliente autenticado normal o rompe el
> flujo principal; **Media** = riesgo real con condiciones o fricción notable;
> **Baja** = endurecimiento / pulido.

---

## 1. Seguridad

### 1.1 Mapa de políticas RLS por tabla

| Tabla | anon | cliente autenticado | admin (`is_admin()`) | Otros controles |
|---|---|---|---|---|
| `profiles` | — | SELECT/UPDATE **su fila** (`profiles_select_own`, `profiles_update_own`, 0001:164-168). Sin INSERT/DELETE. | SELECT todas (`profiles_admin_read`, 0001:170). UPDATE solo la propia (no hay política de UPDATE admin sobre otras filas). | Trigger `profiles_is_admin_guard` (0006): `is_admin` solo cambia sin JWT o por admin sobre otra fila. Perfil creado por `handle_new_user` (definer). |
| `tours` | SELECT `is_published` | SELECT `is_published` | ALL (`tours_admin_all`) | `tours_slug_check`, `tours_price_check`. |
| `faqs` | SELECT `is_published` | SELECT `is_published` | ALL | — |
| `tour_images` | SELECT si el tour está publicado | ídem | ALL (0003_tour_images) | — |
| `tour_requests` | — | SELECT propias; INSERT propias con `status='pending'`; UPDATE propias si `status in (pending,in_review)` y el resultado queda `pending` o `cancelled` (0001:185-194). **Sin restricción por columna.** | ALL | Triggers: `check_confirmed_schedule` (0003_tour_schedule: `confirmed_date` solo si `confirmed`), `check_request_tour_published` (0007), `guard_reminder_sent_at` (0009), `travelers_coherent`. RPC `get_occupied_seats` (definer, `anon`+`authenticated`). |
| `conversations` | — (ver 1.2 S-4) | ALL propias; `with check` acepta `user_id is null` | — (no lee chats) | — |
| `messages` | **SELECT de mensajes en conversaciones con `user_id is null`** (0001:201-207) | ALL propias + mensajes de conversaciones sin dueño | — | — |
| `unanswered_questions` | — | — | ALL | — |

Lo que **sí está bien cubierto** (verificado leyendo las migraciones):

- Ver solicitudes ajenas: imposible (`requests_select_own`; `fetchMySchedule`/`fetchMyRequests` además filtran `user_id`).
- Auto-confirmarse: el `with check` de `requests_cancel_own` solo admite `pending|cancelled`; `requests_insert_own` exige `pending`. Correcto.
- Hacerse admin: no hay INSERT en `profiles` para clientes; el UPDATE de `is_admin` lo bloquea el trigger 0006 (y `auth.uid() is null` solo ocurre con service_role / SQL Editor).
- `reminder_sent_at`: el trigger 0009 bloquea INSERT con valor y UPDATE que lo cambie salvo service_role/admin. Correcto.
- `tour_id` arbitrario o no publicado: bloqueado por 0007.
- No hay `dangerouslySetInnerHTML`, `innerHTML` ni `eval` en `src/` (búsqueda en `b1f1192`). React escapa todo el texto de BD.

### 1.2 Hallazgos de seguridad

#### S-1 · **Alta** · El cliente puede escribir logística y asientos "confirmados" en su propia solicitud pendiente
- **Archivo:** `supabase/migrations/0001_schema.sql:187-194` (políticas `requests_insert_own` / `requests_cancel_own`), columnas añadidas en `0003_tour_schedule.sql:7-11` y `0008_seat_selection.sql:6-8`.
- **Problema:** las políticas solo restringen `status` y `user_id`; no hay `GRANT` por columnas ni trigger. Con la clave publicable y su JWT, un cliente puede hacer
  `update tour_requests set confirmed_seats='01,02,03,04,05,06,07,08,09,10,11,12,13,14,15', departure_time='05:00', meeting_point='…', departure_notes='…', admin_notes='…' where id = '<su solicitud pending>'`
  (o incluirlas en el INSERT). Solo `confirmed_date` está protegido (trigger 0003). Consecuencias:
  1. **Bloqueo de asientos para otros clientes:** `get_occupied_seats` (0008:24-25) cuenta `coalesce(confirmed_seats, requested_seats)` de solicitudes `pending`/`in_review`, por lo que un usuario puede marcar todo el vehículo como ocupado para cualquier fecha (`preferred_date`), y con varias solicitudes, para muchas fechas. `requested_seats` tampoco tiene validación de servidor (formato/longitud/rango 01-15).
  2. **Logística falsa que parece oficial:** el panel admin precarga `confirmed_seats ?? requested_seats` (`AdminPanel.tsx:95`) y el resto de campos de la fila; si el admin confirma sin revisar, los valores del cliente aparecen en `/calendario`, en el `.ics` y en el **email de recordatorio** como datos "confirmados por la agencia".
  3. `admin_notes` (notas internas) es escribible por el cliente.
  4. Puede devolver una solicitud `in_review` a `pending` (el `using` acepta `in_review`, el `with check` acepta `pending`).
- **Arreglo propuesto (nueva migración `0010_harden_request_columns.sql`):** trigger `before insert or update on tour_requests` (patrón 0006/0009) que, cuando `auth.uid() is not null and not public.is_admin()`:
  - en INSERT fuerce `confirmed_seats, departure_time, meeting_point, departure_notes, admin_notes, confirmed_date, reminder_sent_at := null`;
  - en UPDATE lance excepción si cambia cualquier columna distinta de `status` (y quizá `additional_notes`), y si `status` no pasa a `cancelled`.
  - valide `requested_seats ~ '^(0[1-9]|1[0-5])(,(0[1-9]|1[0-5]))*$'` y que el nº de asientos ≤ `travelers_count`.
  Alternativa/adicional: `revoke update on tour_requests from authenticated; grant update (status) on tour_requests to authenticated;` y cambiar `requests_cancel_own` a `with check (status = 'cancelled')`. Añadir los casos a `docs/TEST_SEGURIDAD.md` §B.

#### S-2 · **Media** · `profiles.email` editable por el cliente y usado como destinatario del recordatorio
- **Archivo:** `supabase/migrations/0001_schema.sql:166-168` (`profiles_update_own` sin límite de columnas); `supabase/functions/send-reminders/index.ts:162-166`.
- **Problema:** el cliente puede cambiar `profiles.email` (y `full_name`) a cualquier valor por API. La Edge Function envía a `profiles.email` y solo recurre a `auth.users` si está vacío. Resultado: un cliente con un viaje confirmado puede hacer que el dominio de la agencia (Resend) envíe un correo a una dirección de un tercero, con un `full_name` arbitrario en el saludo (escapado, pero texto libre de hasta lo que admita la columna). También el panel admin muestra un email que no es el verificado.
- **Arreglo:** en la función, usar siempre `admin.auth.admin.getUserById(row.user_id)` (email verificado) e ignorar `profiles.email`; y/o trigger en `profiles` que impida a no-admin cambiar `email`/`is_admin`/`id` (o `grant update (full_name, phone)` solamente). Limitar `full_name` con `check (char_length(full_name) <= 80)`.

#### S-3 · **Media** · `get_occupied_seats` accesible por `anon` y sin filtro de tour
- **Archivo:** `supabase/migrations/0008_seat_selection.sql:11-35`.
- **Problema:** con `p_tour_id = null` devuelve los asientos de **todas** las solicitudes del día; ejecutable por anónimos. No expone PII, pero permite enumerar ocupación (volumen de negocio por fecha) y, combinado con S-1, es la vía del bloqueo. Además cuenta solicitudes `pending` sin caducidad: una solicitud abandonada bloquea asientos indefinidamente.
- **Arreglo:** `revoke execute … from anon`; exigir `p_tour_id is not null` (devolver vacío si es null); contar `pending/in_review` solo si `created_at > now() - interval '7 days'` o solo `confirmed_seats` de `confirmed` + `requested_seats` de las propias del usuario.

#### S-4 · **Media** (Baja si las tablas siguen sin uso) · Mensajes de conversaciones sin dueño legibles por cualquiera
- **Archivo:** `supabase/migrations/0001_schema.sql:199-207`.
- **Problema:** `conv_own` permite insertar conversaciones con `user_id is null`, y `msg_own` concede ALL sobre mensajes cuya conversación tenga `user_id is null` — **incluido `anon`** (la condición no depende de `auth.uid()`). Cualquiera puede leer, editar o borrar esos mensajes, y añadir mensajes con `user_id null`. Hoy el asistente es local y no parece escribir en estas tablas (solo `useMyConversations`/`fetchMessages` en `src/lib/hooks.ts:71-87` leen), pero si se reactiva el historial de chat, se filtran chats.
- **Arreglo:** `conv_own … with check (auth.uid() = user_id)`; en `msg_own` eliminar la rama `c.user_id is null` y exigir `auth.uid() = user_id` en el `with check`. Si las tablas no se usan, documentarlo y quitar `useMyConversations`/`fetchMessages`.

#### S-5 · **Baja** · Inyección de filtros PostgREST en el *fallback* de asientos
- **Archivo:** `src/services/requests.ts:48`.
- **Problema:** `query.or(\`confirmed_date.eq.${params.date},…\`)` interpola la fecha sin validar. Una fecha manipulada (p. ej. `2026-01-01,user_id.neq.x`) altera el filtro. El RLS limita el impacto a filas propias, por eso es Baja; el fallback además no tiene sentido (RLS solo devuelve las propias, así que nunca verá asientos ajenos).
- **Arreglo:** validar `^\d{4}-\d{2}-\d{2}$` antes de la consulta, o eliminar el fallback y devolver `[]` si la RPC falla.

#### S-6 · **Baja** · Admin no puede revocar/conceder admin desde la app pero el trigger lo permite por API
- **Archivo:** `supabase/migrations/0006_harden_profiles.sql:19-32` vs `0001_schema.sql:166-171`.
- **Problema:** no existe política de UPDATE admin sobre filas ajenas, así que el trigger "un admin puede cambiar `is_admin` de otro" nunca se alcanza vía PostgREST. No es una vulnerabilidad (falla cerrado) sino una inconsistencia que puede confundir al documentar roles.
- **Arreglo:** documentar en `docs/SETUP_SUPABASE.md` que la gestión de roles es solo SQL, o añadir política `profiles_admin_update` si se quiere gestionarlo desde el panel.

#### S-7 · **Baja** · Edge Function `send-reminders`
- **Archivo:** `supabase/functions/send-reminders/index.ts`.
- **Bien:** auth por secreto propio con comparación en tiempo casi constante (`:32-39`, `:120-124`), `verify_jwt=false` justificado (`supabase/config.toml`), secretos leídos de Vault en el job (0009:69-80, nada hardcodeado), HTML escapado (`escapeHtml`, `:41-48`, `:101-114`), clave Resend solo en servidor, *dry-run* sin `RESEND_API_KEY`, `Idempotency-Key`.
- **Problemas menores:**
  - `:212` la respuesta incluye `details` con IDs de solicitudes. Solo la ve quien tiene el secreto, pero acaba en `net._http_response` (pg_net guarda cuerpos de respuesta). Arreglo: devolver solo contadores; dejar IDs en `console.log`.
  - `:198-202` si falla el `update` de `reminder_sent_at` se cuenta como `sent` y al día siguiente se reenvía (la `Idempotency-Key` incluye `from`, que cambia cada día). Arreglo: clave `reminder-${row.id}-${row.confirmed_date}`.
  - `:133` si `SITE_URL` no está definido, el enlace queda `"/calendario"` (relativo, roto en el email). Arreglo: responder 500 o omitir el enlace si falta `SITE_URL`.
  - `:122` acepta cualquier método HTTP; arreglo trivial: `if (req.method !== 'POST') return json({error:'method'},405)`.
  - El contenido del email (`departure_notes`, `meeting_point`, `confirmed_seats`) puede venir del cliente (ver **S-1**).

#### S-8 · **Baja** · Claves en frontend y cabeceras
- **Archivos:** `src/lib/supabase.ts:3-10`, `.env.example`, `vercel.json`, `public/_headers`.
- **Bien:** solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`; no hay service_role ni claves de Resend en `src/`. `chat-assistant` está deshabilitada en `config.toml`.
- **Mejora:** si faltan las variables, `createClient('', '')` lanza en tiempo de ejecución y la app queda en blanco; mostrar un aviso de configuración en vez de solo `console.warn`. Revisar que `_headers`/`vercel.json` incluyan `Content-Security-Policy` con `connect-src` limitado a `*.supabase.co` (ver §4).

#### S-9 · **Baja** · Enlaces `wa.me` con datos del usuario
- **Archivos:** `src/features/chatbot/data/whatsapp.ts`, `src/components/PremiumSections.tsx:156-163`, `src/features/calendar/components/NextTripCard.tsx:64-120`, `src/app/pages/Tours.tsx:236`.
- **Resultado:** todos los textos se pasan por `encodeURIComponent` y el número es constante (`SOCIALS.whatsapp`); no hay `javascript:` posible ni inyección de parámetros. `window.open(..., 'noopener')` correcto. Sin hallazgo de seguridad; solo verificar `rel="noopener noreferrer"` en todos los `target="_blank"`: verificado en `Home.tsx:155-164`, `Layout.tsx:303-320`, `TripActions`, `NextTripCard`, `WaCta`, `DraftCard`.

---

## 2. UX del cliente — recorrido completo

Recorrido: **registro/login → ver tours → solicitar con el asistente → ver estado en perfil → `/calendario` ("Tu próximo viaje" + `.ics`)**.

### U-1 · **Alta** · El asistente no guarda la solicitud: "Mis Solicitudes" queda vacío y el recorrido se rompe
- **Archivos:** `src/features/chatbot/components/ChatWidget.tsx:282-324` (`finishBooking` solo muestra resumen + enlace WhatsApp; no hay `insert` de `tour_requests` en ningún punto de `src/`), `src/features/chatbot/components/DraftCard.tsx:36-38`, `src/app/pages/Profile.tsx:183-189`, `src/services/requests.ts:7-21` (`CreateRequestInput` existe pero no hay función que lo use).
- **Problema:** el cliente completa el asistente, envía por WhatsApp y al ir a `/perfil` ve "Aún no tienes solicitudes registradas" con un enlace a "Explorar tours para cotizar". Solo verá algo cuando el admin cree o confirme una fila (y el admin no tiene en el panel un flujo de "crear solicitud para un cliente"). `docs/TEST_SEGURIDAD.md:5` sigue diciendo "solicitud con estado pending y código de seguimiento", lo que ya no es cierto. El texto "No guardamos esta solicitud en la web" es honesto pero contradice que exista un perfil con "Mis Solicitudes".
- **Arreglo:** decidir una de dos: (a) si el usuario tiene sesión, al pulsar "Enviar por WhatsApp" hacer también `insert` (`status:'pending'`, payload de `validateBookingDraft`) con anti doble envío, y mostrar "Guardada con ID …, la verás en tu perfil"; sin sesión, ofrecer "Inicia sesión para seguir el estado". (b) Si se mantiene solo WhatsApp, cambiar el estado vacío del perfil a: "Las solicitudes que envías por WhatsApp aparecerán aquí cuando la agencia las registre" y actualizar `TEST_SEGURIDAD.md`. Recomendado (a), aplicando antes **S-1**.

### U-2 · **Alta** · Registro con correo sin confirmación visible
- **Archivo:** `src/context/AuthContext.tsx:89-102`, `src/app/pages/Profile.tsx:22-28`.
- **Problema:** si Supabase tiene "Confirm email" activo, `signUp` devuelve éxito sin sesión; la UI no muestra nada (el botón vuelve de "Verificando…" a "Registrarse") y el usuario cree que falló o vuelve a intentarlo (obtendrá un error en inglés).
- **Arreglo:** si `data.session` es `null` tras `signUp`, mostrar `role="status"`: "Te enviamos un correo a {email}. Ábrelo para activar tu cuenta y vuelve aquí." y cambiar a modo "Iniciar sesión".

### U-3 · **Media** · Errores de Supabase sin traducir
- **Archivos:** `src/context/AuthContext.tsx:84,100,113`, `src/features/requests/components/RequestCard.tsx:76`, `src/lib/hooks.ts:16,29`.
- **Problema:** se muestran `error.message` crudos en inglés ("User already registered", "Email not confirmed", "Password should be at least…", mensajes RLS como "new row violates row-level security policy") y con `alert()`.
- **Arreglo:** función `friendlyAuthError(msg)` análoga a `friendlySaveError` (`services/requests.ts:89`) con mapeo de los 6-8 mensajes comunes; reemplazar `alert/confirm` por un aviso en línea (`role="alert"`) dentro de la tarjeta.

### U-4 · **Media** · Perfil: estados de carga y error ausentes
- **Archivos:** `src/app/pages/Profile.tsx:13-14,177-191`; `src/lib/hooks.ts:35-69`.
- **Problema:** `useMyRequests` expone `loading` pero el perfil no lo usa: mientras carga se ve "Aún no tienes solicitudes" (parpadeo engañoso). Si `fetchMyRequests` lanza, el error es una promesa no capturada y la lista queda vacía sin explicación. Lo mismo en `useMySchedule` → `/calendario` muestra "Aún no tienes tours programados" ante un fallo de red.
- **Arreglo:** añadir `error` a ambos hooks (try/catch → `setError`), mostrar esqueleto mientras `loading` y un bloque "No pudimos cargar tus solicitudes. Reintentar" con botón que llame a `reload()`.

### U-5 · **Media** · Login: tras iniciar sesión no vuelves a donde estabas
- **Archivos:** `src/app/pages/Calendar.tsx:13` (`<Navigate to="/perfil" replace />`), `src/context/AuthContext.tsx:57` (`redirectTo = origin + '/'`).
- **Problema:** quien abre `/calendario` (p. ej. desde el email de recordatorio, `send-reminders/index.ts:86`) sin sesión llega a `/perfil` sin mensaje de por qué, y tras Google OAuth aterriza en `/` (portada), no en su calendario.
- **Arreglo:** `<Navigate to="/perfil?next=/calendario" />` + aviso "Inicia sesión para ver tu viaje"; pasar `next` a `redirectTo` (`${origin}${next}`, validando que empiece por `/`) y en email/clave hacer `navigate(next)` tras login.

### U-6 · **Media** · "Preguntar al asistente" abre WhatsApp, no el asistente
- **Archivos:** `src/features/calendar/components/NextTripCard.tsx:47-54`, `src/features/calendar/components/ScheduleCalendar.tsx:224-231`.
- **Problema:** la etiqueta promete el chat de la web y abre `wa.me`. Confunde a quien quiere seguir en la web.
- **Arreglo:** renombrar a "Escribir por WhatsApp" (icono WhatsApp) o exponer `openChat()` desde un contexto y abrir el `ChatWidget`.

### U-7 · **Media** · Fecha en el asistente solo como `AAAA-MM-DD` tecleado
- **Archivo:** `src/features/chatbot/components/ChatWidget.tsx:340-359`, placeholders `:594`.
- **Problema:** "20/11", "20 de noviembre" o "mañana" se rechazan; en móvil escribir guiones es incómodo. No se valida que la fecha sea futura en este paso (sí después en `validateBookingDraft`, lo que provoca un error tardío).
- **Arreglo:** ofrecer un `<input type="date" min={hoy}>` en el paso de fecha (o un botón "Elegir en calendario") y aceptar `DD/MM[/AAAA]`.

### U-8 · **Media** · Asientos: se eligen sin fecha y el "Solicitado" parece reservado
- **Archivos:** `ChatWidget.tsx:533-545` (abre `SeatPicker` con `preferred_date` posiblemente `null`), `SeatPicker.tsx:139`, `RequestCard.tsx:120-130`, `NextTripCard.tsx:136-141`.
- **Problema:** con fecha flexible, `get_occupied_seats` devuelve vacío (0008:18-20): todo aparece libre y el cliente "elige" asientos que pueden estar ocupados. En el perfil "Asiento preferido: 03" no deja claro que no está garantizado.
- **Arreglo:** ocultar "Elegir asientos" si no hay fecha concreta ("Podrás elegir asiento cuando tengas fecha"); en tarjetas usar "Preferido (sin confirmar)".

### U-9 · **Baja** · Textos y formatos confusos
- `DraftCard.tsx:13-14`: "Resumen de solicitud" aparece **dos veces** en la cabecera; el "paso N de 4" no corresponde con los pasos reales (destino, fecha, viajeros, teléfono, asientos). Arreglo: eliminar la línea 14 y calcular pasos sobre la lista real.
- `RequestCard.tsx:106` y `DraftCard.tsx:27`: fecha preferida en ISO crudo (`2026-11-20`). Arreglo: `formatFechaCortaEs`.
- `RequestCard.tsx:83`: título "(sin destino)" cuando hay `tour_id`; usar el título del tour (añadir `tours(title)` al select de `fetchMyRequests`).
- `RequestCard.tsx:133`: "ID Seguimiento" con UUID de 36 caracteres; mostrar los 8 primeros en mayúsculas con botón copiar.
- `RequestCard.tsx:66` vs RLS: solo `pending` muestra "Cancelar", pero `in_review` también es cancelable por política. Alinear (o restringir la política, ver S-1).
- `Profile.tsx:34`: el `h1` sin sesión dice "Mis Solicitudes" en una pantalla que es de login. Usar "Inicia sesión o crea tu cuenta".
- `Profile.tsx:125-129`: "Guardar" nombre no da feedback de éxito. Añadir "Guardado ✓" (`role="status"`).
- `Profile.tsx:152-154`: el círculo del próximo tour muestra solo el día ("03") sin mes.
- `NextTripCard.tsx:65`, `TripActions.tsx:106`: el mensaje WhatsApp incluye la fecha ISO y el UUID completo; usar fecha larga y ID corto.
- `ScheduleCalendar.tsx:179`: si hay 2 viajes el mismo día solo se muestra el primero.

### U-10 · **Baja** · Calendario y `.ics`: bien resueltos, un detalle de huso horario
- `ScheduleCalendar.tsx:198-235` (esqueleto + estado vacío con CTA) y `NextTripCard.tsx:30-57` (sin viaje / sin fecha) cubren bien los estados. `.ics` (`lib/calendar.ts:143-262`) escapa RFC 5545, pliega a 75 octetos, usa hora local de Lima y añade alarmas; `TripActions.tsx:96-102` maneja el error con mensaje claro. El `.ics` ya emite `VTIMEZONE` + `DTSTART;TZID=America/Lima` (`lib/calendar.ts:264-283`), correcto para turistas con el móvil en otro huso.
- **Pendiente menor:** `todayISO()` (`lib/calendar.ts:21-23`) y `daysUntil` usan la fecha **del dispositivo**, no la de Lima: un turista en Europa ve "Mañana"/"Hoy" y el paso a "viajes pasados" desfasados unas horas respecto a Perú. **Arreglo:** calcular "hoy" con `Intl.DateTimeFormat('en-CA', { timeZone: LIMA_TZ })`, igual que hace `limaDate()` en la Edge Function.

---

## 3. Accesibilidad

### A-1 · **Media** · Formularios de login/registro sin `<label>`
- **Archivo:** `src/app/pages/Profile.tsx:68-91` (nombre, correo, contraseña solo con `placeholder`), `Profile.tsx:117-124` (`<label>` "Nombre para mostrar" sin `htmlFor`/`id`).
- **Arreglo:** `<label htmlFor="login-email">Correo</label>` (puede ser `sr-only`) + `id`; `autoComplete="email"`, `"current-password"` / `"new-password"`, `"name"`. Los botones "Iniciar sesión / Crear cuenta" (`:51-64`) deben ser `role="tab"` + `aria-selected` o `aria-pressed`, y `type="button"`.

### A-2 · **Media** · Contraste insuficiente
- `ChatWidget.tsx:514`: opciones del chat en `text-[#00a0e9]` sobre blanco ≈ **2.9:1** (AA exige 4.5:1 para 13 px). Arreglo: `#0369a1` (sky-700, ≈5.9:1) o `text-andino-800`.
- `text-stone-400` (#a8a29e ≈ **2.5:1** sobre blanco) en texto informativo: `ScheduleCalendar.tsx:266` (días de la semana), `ChatWidget.tsx:580`, `SeatPicker.tsx:146` (botón cerrar), `Profile.tsx:48`, `SearchBar.tsx`, `AdminPanel.tsx` (×5). Arreglo: `text-stone-500` mínimo (≈4.8:1) o `stone-600`.
- `DraftCard.tsx:36`, `WaCta.tsx:35` (`text-[10px]`/`[11px]` `text-stone-500`): 42 usos de 10-11 px en `src/`. Arreglo: mínimo 12 px (`text-xs`) para texto legible.
- `NextTripCard.tsx:21,116,161`: `text-andino-100` sobre degradado `andino-700/800` — verificar con herramienta; probablemente pasa en `andino-800` pero no sobre `andino-700` con el brillo `andino-500/25`.

### A-3 · **Media** · Diálogos sin gestión de foco
- `ScheduleCalendar.tsx:110-128` y `ChatWidget.tsx:533-546`: el overlay del `SeatPicker` no tiene `role="dialog"`, `aria-modal`, `aria-labelledby`, ni cierre con **Escape**, ni foco inicial/atrapado ni retorno del foco al botón que lo abrió (`SeatPicker.tsx:127`).
- `ChatWidget.tsx:548-583`: menú principal `role="dialog"` sin Escape ni foco inicial.
- `ChatWidget.tsx:483`: el panel del asistente no se cierra con Escape ni mueve el foco al abrirse.
- **Arreglo:** hook `useDialog(ref, onClose)` (Escape + focus trap + restore) reutilizado; el lightbox de `Tours.tsx:105-119` ya lo hace bien y sirve de referencia.

### A-4 · **Media** · Calendario mensual: 42 tabulaciones y semántica de grid incompleta
- **Archivo:** `ScheduleCalendar.tsx:265-312`.
- **Problema:** cada día es un `<button>` enfocable aunque no tenga viajes (hasta 42 paradas de Tab); `role="grid"` sin `role="row"` en la cabecera ni `role="columnheader"`; sin navegación por flechas; el `aria-label` del día no incluye mes ni título del tour ("18: 1 tour(s) confirmado(s)").
- **Arreglo:** días sin eventos como `<div role="gridcell">` no enfocables (o `tabIndex={-1}` con *roving tabindex* y flechas); `aria-label="sábado 18 de octubre: Tour Cumbemayo confirmado"`; cabecera con `role="row"`/`columnheader`. Alternativa simple: quitar `role="grid"` y dejar las listas `TripLists` como vía principal accesible.

### A-5 · **Baja** · Tamaño táctil
- `SeatPicker.tsx:143-149` botón cerrar `p-1` + icono 18 → ~26 px; `SeatPicker.tsx:340-342` asientos en modo `compact` (~28-30 px de alto); `DraftCard.tsx:16-22` "Elegir asientos" texto 11 px sin padding; `ChatWidget.tsx:490` "Nueva conversación" `p-1.5` (~31 px); `Tours.tsx:147` 40 px. Arreglo: `min-h-11 min-w-11` (44 px) en todos.
- Bien: la mayoría de CTAs ya usan `min-h-11`/`min-h-12`.

### A-6 · **Baja** · Foco visible inconsistente
- `ScheduleCalendar.tsx:253-256` botón "Hoy", `SeatPicker.tsx:143`, `DraftCard.tsx:16`, `Profile.tsx:39-98` (botones y entradas del login) no tienen `focus-visible:outline`; dependen del outline por defecto, que Tailwind preflight no elimina pero queda poco visible sobre `glass-panel`. Arreglo: regla global en `index.css`: `:focus-visible { outline: 2px solid #f59e0b; outline-offset: 2px; }`.

### A-7 · **Baja** · Idioma y anuncios
- `index.html:2` `lang="es"` correcto. Mensajes de Supabase en inglés rompen el idioma (ver U-3).
- `ChatWidget.tsx:495` `role="log" aria-live="polite"` correcto; pero `scrollIntoView({behavior:'smooth'})` (`:48`) ignora `prefers-reduced-motion` (sí lo respeta `ScheduleCalendar.tsx:194`).
- Iconos `aria-hidden` y `aria-label` en botones de icono: bien en general. `WaCta.tsx:32` iconos sin `aria-hidden` (el botón ya tiene label; añadirlo para evitar doble lectura).
- `ScheduleCalendar.tsx:38`, `NextTripCard.tsx:90`: `alt=""` correcto (decorativo, el título está al lado).

---

## 4. Rendimiento

### P-1 · **Alta** · Bundle principal ~510-580 KB sin dividir por rutas
- **Archivos:** `src/app/router.tsx:5-11` (en `b1f1192` todas las páginas se importan de forma estática), `vite.config.ts` (`chunkSizeWarningLimit: 800` oculta el aviso).
- **Medición:** build existente en el checkout principal (commit `81570b6`, que ya aplica `lazy()` a Faq/Profile/Calendar/Admin/Privacy): `index-*.js` = **509 920 B**, `index-*.css` = **101 320 B**, `H350Viewer-*.js` = 644 679 B (aparte). Sin ese cambio el principal está en ~580 KB.
- **Lo que sigue en el chunk principal** aun con rutas perezosas: `@supabase/supabase-js` (~110-150 KB min), `react-dom` (~130 KB), `react-router-dom`, `ChatWidget` + `SeatPicker` + `chatTree` (~1 000 líneas, montado en todas las páginas aunque el chat esté cerrado), `SearchBar` (470 líneas) y `GlowButton` (231), `lucide-react` (tree-shaken, OK).
- **Arreglo (por orden de impacto):**
  1. Integrar el `lazy()` de rutas de `81570b6` (Profile, Calendar, Admin, Faq, Privacy; `AdminPanel` 537 líneas solo para admins).
  2. Cargar `ChatWidget` bajo demanda: dejar en el principal solo el botón flotante y hacer `lazy(() => import('…/ChatWidget'))` al primer clic (o en `requestIdleCallback`). `SeatPicker` también `lazy` dentro del chat/calendario.
  3. `build.rollupOptions.output.manualChunks: { react: ['react','react-dom','react-router-dom'], supabase: ['@supabase/supabase-js'] }` para que el caché sobreviva a despliegues.
  4. Bajar `chunkSizeWarningLimit` a 300 para que CI avise.
  5. CSS 101 KB: comprobar si `animate.css` (dependencia) se importa entero; si solo se usan 2-3 animaciones, copiarlas a `index.css` y quitar la dependencia.

### P-2 · **Alta** · Imágenes PNG pesadas en portada y cabecera
- **Archivos:** `public/logo-chilon.png` **537 KB** usado en `Layout.tsx:19,114,244,264` (cabecera de **todas** las páginas, esqueleto del visor y footer); `public/brand/chilon-tours-logo.png` 221 KB; portadas de tours en PNG de 280-810 KB (`public/tours/*-web.png`, `*-flyer.png`, `norte-card.png` 508 KB) servidas en `TourCard`/`ToursBento`/`PremiumSections`. `public/` suma **16.9 MB** (87 ficheros).
- **Arreglo:** logo a WebP/AVIF 64×64 y 128×128 (<10 KB) o SVG; portadas a WebP ~1200 px (q≈75, ~80-150 KB) + variante 600 px con `srcset`/`sizes`; añadir `width`/`height` a todos los `<img>` (evita CLS) y `fetchpriority="high"` solo a la imagen hero; mantener `loading="lazy"` en el resto (ya presente casi siempre; falta en `ScheduleCalendar.tsx:38`).

### P-3 · **Media** · Consultas duplicadas del catálogo
- `ChatWidget.tsx:51-54` carga `fetchTourCards` + `fetchFaqCards` en el montaje de **cada página**, aunque el chat no se abra; `Home`/`Tours` vuelven a pedir `fetchPublishedTours`. `Profile.tsx:13-14` pide `tour_requests` dos veces (`select *` + `select * , tours(...)`).
- **Arreglo:** cargar el catálogo del chat al abrirlo; caché simple en memoria en `services/tours.ts` (promesa compartida); en perfil derivar el resumen de un único `fetchMyRequests` con `tours(title, …)`.

### P-4 · **Baja** · Recursos 3D en `public/` (no auditado en detalle)
- `public/hdri/studio_country_hall_1k.hdr` 1.7 MB y texturas de asfalto 1.1-1.4 MB + GLB 607 KB. Se está cambiando en paralelo a carga bajo demanda; solo verificar que **ninguno** se precargue en móvil/`saveData` y que las texturas JPG se conviertan a KTX2/WebP.

### P-5 · **Baja** · Cabeceras de seguridad/caché
- `vercel.json` y `public/_headers`: bien `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e `immutable` en `/assets/*`. Falta `Content-Security-Policy` (p. ej. `default-src 'self'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'`) y `Strict-Transport-Security`. Las imágenes de `/tours/*` no tienen caché larga (no están en `/assets`); añadir `Cache-Control: public, max-age=604800` para `/tours/*` y `/brand/*`.

---

## 5. Top 10 priorizado

| # | Sev. | ID | Qué hacer | Dónde |
|---|---|---|---|---|
| 1 | Alta | S-1 | Migración 0010: trigger/GRANT por columnas para que el cliente solo pueda insertar campos de solicitud y solo cambiar `status → cancelled`; validar `requested_seats`. | `supabase/migrations/0001_schema.sql:187-194`, `0008_seat_selection.sql` |
| 2 | Alta | U-1 | Guardar la solicitud del asistente (usuario con sesión) o, si no, explicar en el perfil que llegan vía agencia; actualizar `TEST_SEGURIDAD.md`. | `ChatWidget.tsx:282-324`, `Profile.tsx:183-189` |
| 3 | Alta | P-1 | Rutas perezosas (integrar `81570b6`) + `ChatWidget`/`SeatPicker` bajo demanda + `manualChunks`. | `src/app/router.tsx`, `vite.config.ts` |
| 4 | Alta | P-2 | Logo de 537 KB → WebP/SVG <10 KB; portadas PNG → WebP con `srcset` y `width/height`. | `Layout.tsx:19`, `public/tours/*` |
| 5 | Alta | U-2 | Mensaje "revisa tu correo" tras registro sin sesión. | `AuthContext.tsx:89-102`, `Profile.tsx:22-28` |
| 6 | Media | S-2 | Recordatorios al email verificado de `auth.users`; impedir que el cliente cambie `profiles.email`. | `send-reminders/index.ts:162-166`, `0001_schema.sql:166` |
| 7 | Media | S-3 / S-4 | Quitar `anon` y el modo "todos los tours" de `get_occupied_seats` + caducidad de pendientes; cerrar `msg_own`/`conv_own` para `user_id null`. | `0008_seat_selection.sql:11-35`, `0001_schema.sql:199-207` |
| 8 | Media | U-3 / U-4 | Traducir errores de Supabase; estados de carga/error con "Reintentar" en perfil y calendario. | `AuthContext.tsx`, `lib/hooks.ts:35-69`, `Profile.tsx` |
| 9 | Media | A-1 / A-2 | Labels + `autocomplete` en login; subir contraste de opciones del chat (`#00a0e9`) y de `text-stone-400`/10-11 px. | `Profile.tsx:68-124`, `ChatWidget.tsx:514` |
| 10 | Media | A-3 / U-5 | Escape + focus trap en `SeatPicker`/menú/chat; volver a `/calendario` tras login (`?next=`). | `ScheduleCalendar.tsx:110`, `ChatWidget.tsx:483-583`, `Calendar.tsx:13`, `AuthContext.tsx:57` |

**Siguientes en la lista:** U-6 (etiqueta "Preguntar al asistente"), U-7 (selector de fecha), U-8 (asientos sin fecha), U-10 ("hoy" en hora de Lima), A-4 (grid del calendario), P-3 (consultas duplicadas), P-5 (CSP/HSTS), S-5…S-9.

### Casos SQL a añadir en `docs/TEST_SEGURIDAD.md` §B (como cliente, tras aplicar S-1/S-2/S-4)

```sql
-- 6. Escribir logística/asientos en una solicitud propia pendiente: debe fallar
update tour_requests set confirmed_seats = '01,02', departure_notes = 'x', admin_notes = 'x'
  where user_id = auth.uid() and status = 'pending';
-- 7. Insertar con campos de agencia: deben quedar en null o fallar
insert into tour_requests (user_id, status, confirmed_seats, meeting_point)
  values (auth.uid(), 'pending', '01', 'x');
-- 8. Marcar reminder_sent_at: debe fallar (ya cubierto por 0009)
update tour_requests set reminder_sent_at = now() where user_id = auth.uid();
-- 9. Cambiar el email del perfil: debe fallar o no aplicar
update profiles set email = 'otro@ejemplo.com' where id = auth.uid();
-- 10. Como anon: leer mensajes de conversaciones sin dueño -> 0 filas
select * from messages m join conversations c on c.id = m.conversation_id where c.user_id is null;
```
