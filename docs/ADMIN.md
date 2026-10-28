# Guía del administrador

## Entrar al panel

1. Inicia sesión con tu cuenta en la aplicación.
2. Cuando tu cuenta tenga el rol de administrador, aparecerá el enlace **Panel
   admin** en la cabecera y también en el menú móvil.
3. Entra en `/admin` o pulsa **Panel admin**.

Si no ves el panel, cierra sesión y vuelve a entrar para que se cargue de nuevo
tu perfil. Si sigue sin aparecer, comprueba en Supabase SQL Editor que tu
usuario tenga `is_admin = true` (consulta las instrucciones de
`docs/SETUP_SUPABASE.md`).

## Pestañas del panel

- **Resumen:** muestra las próximas salidas y una visión rápida de la actividad
  que requiere atención.
- **Solicitudes:** revisa las solicitudes de los clientes, filtra por estado,
  añade notas internas y cambia su estado. Al confirmar una solicitud, completa
  también la fecha, hora, punto de encuentro, instrucciones y asientos
  confirmados en **Logística confirmada**.
- **Tours:** crea y edita los tours, su información, imágenes y publicación en
  la web.
- **Preguntas frecuentes:** crea, edita, ordena y publica las preguntas y
  respuestas que consulta el asistente.
- **Estadísticas:** consulta las métricas disponibles de solicitudes, tours y
  actividad.
- **Facturación:** abre el panel independiente para emitir comprobantes y
  consultar documentos de SUNAT.

## Flujo diario recomendado

1. Revisa primero las solicitudes pendientes.
2. Contacta al cliente por WhatsApp para confirmar los detalles.
3. Cuando todo esté acordado, cambia la solicitud a confirmada y completa la
   fecha, hora, punto de encuentro, instrucciones y asientos.
4. El cliente verá la salida confirmada en `/calendario` y recibirá el
   recordatorio por email cuando corresponda. Consulta
   `docs/RECORDATORIOS.md` para configurar y comprobar esos recordatorios.
5. Revisa después las publicaciones de tours y las preguntas frecuentes que
   necesiten actualización.
