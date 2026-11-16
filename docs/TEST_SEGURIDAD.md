# Verificación de autenticación y permisos

## Pruebas automatizadas

`npm test` ejecuta las pruebas de la aplicación. `supabase/tests/deployment_security.sql` contiene 34 comprobaciones de permisos y triggers en una transacción con rollback: se usa únicamente en una base local o staging con todas las migraciones aplicadas. No usar contra producción.

La suite verifica aislamiento entre usuarios, notas internas solo por RPC de admin, protección de rol/correo/logística, cancelación permitida, validación de asientos y ocupación únicamente confirmada. Las políticas de chat exigen conversación propia; los mensajes sin dueño no son públicos.

Estas pruebas SQL no validan Supabase Auth, las extensiones pg_cron/pg_net ni el correo. Deben comprobarse en staging por separado.

## Flujo de la web

1. Sin sesión: tours/FAQs publicados, chat guiado y consultas por WhatsApp. El chat/formulario no guardan historial ni solicitudes en la base.
2. Con sesión: editar nombre, leer solicitudes propias ya vinculadas, cancelar pendientes, consultar viajes confirmados y descargar `.ics`.
3. Registro sin sesión automática: mostrar el aviso de confirmación por correo. Verificar login por correo/Google y cierre de sesión en staging.
4. Cambiar de cuenta o cerrar sesión: no debe aparecer información del usuario anterior.
5. Admin: editar solicitudes, logística y notas internas; gestionar tours y FAQs. Verificar también acceso denegado a `/admin` sin rol.
6. Sin red o con backend pausado: mostrar error de carga, nunca afirmar catálogo vacío o guardado exitoso.

## Permisos por columna (0011)

Los clientes y administradores usan la lista explícita `REQUEST_PUBLIC_COLUMNS`. `SELECT *` y lectura directa de `admin_notes` quedan bloqueados para el rol authenticated. Las notas se leen mediante `get_admin_request_notes(uuid[])`, que exige `is_admin()`. El servidor service_role conserva acceso privilegiado y su clave nunca llega al navegador.

Para revisar sin modificar datos:

```sql
select has_column_privilege('authenticated', 'public.tour_requests', 'admin_notes', 'SELECT'); -- false
select has_column_privilege('authenticated', 'public.tour_requests', 'id', 'SELECT'); -- true
select tgname from pg_trigger where tgname in ('profiles_is_admin_guard','tour_requests_client_guard','profiles_email_guard');
select * from pg_policies where schemaname = 'public';
```

## Baja de datos

La baja se solicita al canal oficial de la empresa. Un administrador identifica y verifica la petición antes de eliminar la cuenta por Supabase Auth. Las relaciones ON DELETE CASCADE eliminan sus registros asociados; no ejecutar borrados como parte de las pruebas de despliegue.
