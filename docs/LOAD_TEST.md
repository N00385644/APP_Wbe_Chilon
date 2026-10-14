# Pruebas de carga (20 / 50 / 100 / 200 usuarios)

No se promete capacidad sin medir. Procedimiento con k6 (https://k6.io):

1. Crea un script que haga GET al frontend y POST a /functions/v1/chat-assistant con mensajes cortos.
2. Ejecuta por etapas: 20, 50, 100 y 200 VUs durante 2 minutos cada una.
3. Mide latencia p95, porcentaje de errores (429/5xx), tokens por minuto de Gemini y conexiones a Supabase.
4. Si p95 supera 3 s o errores superan 1%, detén la escalada: baja VUs, sube el plan Supabase o pide más cuota al proveedor.
5. Protecciones incluidas: rate-limit por IP y usuario, límite de 2000 caracteres, maxOutputTokens 800, timeout 25 s, reintentos con backoff (máx 3), paginación en admin e índices en búsquedas.
