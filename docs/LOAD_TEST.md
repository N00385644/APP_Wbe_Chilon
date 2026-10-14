# Pruebas de carga (20 / 50 / 100 / 200 usuarios)

No se promete capacidad sin medir. Procedimiento con k6 (https://k6.io):

1. Crea un script que haga GET al frontend y lecturas a las tablas públicas `tours`/`faqs` con mensajes cortos del menú guiado.
2. Ejecuta por etapas: 20, 50, 100 y 200 VUs durante 2 minutos cada una.
3. Mide latencia p95, porcentaje de errores (4xx/5xx) y conexiones a Supabase.
4. Si p95 supera 3 s o errores superan 1%, detén la escalada: baja VUs o sube el plan Supabase.
5. Protecciones incluidas: límite de 2000 caracteres en el chat, paginación en admin e índices en búsquedas.
