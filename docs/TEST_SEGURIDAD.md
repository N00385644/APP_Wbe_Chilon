# Pruebas de autenticación, permisos y seguridad

## A. Funcionales
1. Sin login: ver tours y FAQs funciona; guardar solicitud pide Continuar con Google.
2. Con login: perfil creado, chat guarda historial, solicitud con estado pending y código de seguimiento.
3. Admin: ve solicitudes, cambia estados, publica tours y FAQs, ve estadísticas y preguntas no respondidas.

## B. Seguridad (como usuario NO admin, con su JWT)

```sql
-- 1. Leer solicitudes ajenas: debe devolver 0 filas
select * from tour_requests where user_id != auth.uid();
-- 2. Leer mensajes ajenos: 0 filas
select * from messages where user_id != auth.uid();
-- 3. Auto-darse admin: debe fallar o no aplicar
update profiles set is_admin = true where id = auth.uid();
-- 4. Auto-confirmar solicitud: debe fallar (solo pending -> cancelled)
update tour_requests set status = 'confirmed' where user_id = auth.uid();
-- 5. Crear tour como cliente: debe fallar
insert into tours (slug, title) values ('x-test', 'y-test');
```

Todo debe ser bloqueado por RLS. Complementa con `npm test`.

## C. Procedimiento de eliminación de datos
El usuario pide la baja por el canal oficial indicando su correo. Soporte ejecuta:

```sql
delete from auth.users where email = 'correo-cliente@gmail.com';
```

El ON DELETE CASCADE borra perfil, solicitudes, conversaciones y mensajes.
