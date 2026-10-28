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

### B.1 Columnas solo-admin (migración 0010, AUDIT_FASE6 S-1/S-2/S-3)

Simular el JWT en el SQL Editor (sustituir los UUID):

```sql
-- Como cliente (no admin)
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"<uuid-cliente>","role":"authenticated"}', true);

-- 6. Logística en UPDATE: debe fallar ("solo puedes cancelar tu solicitud")
update tour_requests set departure_time = '05:00', meeting_point = 'x', departure_notes = 'x'
where id = '<solicitud-pending-del-cliente>';
-- 7. Asientos confirmados / notas internas: deben fallar
update tour_requests set confirmed_seats = '01,02' where id = '<solicitud-pending-del-cliente>';
update tour_requests set admin_notes = 'x' where id = '<solicitud-pending-del-cliente>';
-- 8. in_review -> pending: debe fallar ("solo ... a cancelada")
update tour_requests set status = 'pending' where id = '<solicitud-in_review-del-cliente>';
-- 9. Cancelar: debe funcionar (1 fila)
update tour_requests set status = 'cancelled' where id = '<solicitud-pending-del-cliente>';
-- 10. INSERT con logística: se guarda, pero confirmed_seats, departure_time,
--     meeting_point, departure_notes, admin_notes, confirmed_date y
--     reminder_sent_at quedan en NULL; requested_seats se normaliza a '01,02'
insert into tour_requests (user_id, adults, travelers_count, status, requested_seats,
  confirmed_seats, departure_time, meeting_point, admin_notes, confirmed_date)
values ('<uuid-cliente>', 2, 2, 'pending', '01, 02', '01,02,03', '05:00', 'x', 'x', current_date)
returning requested_seats, confirmed_seats, departure_time, meeting_point, admin_notes, confirmed_date;
-- 11. requested_seats inválidos: deben fallar ("Asientos no válidos")
insert into tour_requests (user_id, adults, travelers_count, status, requested_seats)
values ('<uuid-cliente>', 1, 1, 'pending', '01,02');   -- más asientos que viajeros
insert into tour_requests (user_id, adults, travelers_count, status, requested_seats)
values ('<uuid-cliente>', 2, 2, 'pending', '16,99');   -- fuera de 01-15
-- 12. Cambiar el email del perfil: debe fallar ("correo del perfil")
update profiles set email = 'otro@example.com' where id = '<uuid-cliente>';
-- 13. Cambiar el nombre sí funciona
update profiles set full_name = 'Nombre Prueba' where id = '<uuid-cliente>';
-- 14. Ocupación sin tour: 0 filas (sigue ejecutable sin sesión: SeatPicker)
select * from get_occupied_seats(null, current_date);
rollback;

-- Como admin (profiles.is_admin = true): todo debe funcionar
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"<uuid-admin>","role":"authenticated"}', true);
update tour_requests set status = 'confirmed', confirmed_date = current_date + 2,
  departure_time = '07:30', meeting_point = 'Plaza de Armas', departure_notes = 'Llevar abrigo',
  confirmed_seats = '03,04', admin_notes = 'nota interna'
where id = '<solicitud-cualquiera>';
update tour_requests set status = 'in_review' where id = '<otra-solicitud>';
rollback;
```

## C. Procedimiento de eliminación de datos
El usuario pide la baja por el canal oficial indicando su correo. Soporte ejecuta:

```sql
delete from auth.users where email = 'correo-cliente@gmail.com';
```

El ON DELETE CASCADE borra perfil, solicitudes, conversaciones y mensajes.
