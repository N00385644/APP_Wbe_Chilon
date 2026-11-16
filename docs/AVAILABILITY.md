# Disponibilidad con Supabase Free

La web estática está publicada en https://turismo-chilon.pages.dev/. Cada visita carga el catálogo desde Supabase; no se realiza una llamada administrativa de restauración desde el navegador.

Supabase Free puede pausar proyectos por poca actividad en un período de 7 días. Una consulta pública no restaura un proyecto que ya esté pausado, y la restauración puede tardar varios minutos. Supabase Pro evita la pausa por inactividad; ningún cambio de este proyecto contrata un plan de pago. [Referencia oficial](https://supabase.com/docs/guides/deployment/going-into-prod#availability).

## Comprobación preventiva gratuita

El workflow `.github/workflows/supabase-health.yml`, instalado en la rama predeterminada `main` de GitHub, ejecuta una lectura real de un tour publicado todos los días a las **09:17 de Lima (14:17 UTC)**. Puede ejecutarse manualmente desde Actions → Supabase availability → Run workflow.

Solo usa las variables públicas de repositorio `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. No usa claves administrativas, modifica datos ni revela datos de clientes. La consulta tiene tiempos límite y reintentos. Una respuesta fallida queda como ejecución fallida en GitHub Actions.

Esta actividad regular reduce el riesgo de pausa, pero no garantiza disponibilidad permanente ni restaura automáticamente un proyecto pausado. GitHub puede retrasar las ejecuciones y deshabilita los workflows programados de repositorios públicos tras 60 días sin actividad en el repositorio. Revisar su estado cuando el proyecto pase mucho tiempo sin cambios; no crear commits artificiales para ocultar esa limitación. [Límites de programación de GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

Primera prueba manual aprobada: https://github.com/N00385644/APP_Wbe_Chilon/actions/runs/40970297903.

Si aparece una pausa real, restaurar desde el panel Supabase del proyecto `Chatbot` y esperar `ACTIVE_HEALTHY`. La web permite seguir consultando por WhatsApp cuando la base no responde. Nunca colocar un token de Management API o `service_role` en `VITE_*` para simular un despertar instantáneo.
