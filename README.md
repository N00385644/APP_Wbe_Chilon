# Cajamarca Tours — Chatbot con IA para empresa de tours en Cajamarca, Perú

Aplicación web funcional de extremo a extremo: catálogo de tours, preguntas frecuentes,
asistente virtual con IA en la nube (Gemini inicial, OpenAI/Groq preparados), solicitudes
de reserva con confirmación explícita, autenticación Google y panel administrativo.

## Stack

- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + Lucide + React Router
- Auth y datos: Supabase (Auth Google OAuth, PostgreSQL + RLS)
- Backend IA: Supabase Edge Functions (`chat-assistant`), secretos para claves
- Moneda `PEN`, zona horaria `America/Lima`, interfaz 100% en español

## Inicio rápido

```bash
npm install
cp .env.example .env   # completa VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev            # http://localhost:5173
```

## Configuración (leer en orden)

1. `docs/SETUP_SUPABASE.md` — proyecto, migraciones (`supabase/migrations/*.sql`), primer admin
2. `docs/GOOGLE_OAUTH.md` — Client ID/Secret y URLs de redirección
3. `docs/AI_KEYS.md` — secretos `GEMINI_API_KEY`, `AI_PROVIDER`, `AI_MODEL` y despliegue de la función
4. `docs/DEPLOY.md` — build estático (`dist/`) con HTTPS
5. `docs/TEST_SEGURIDAD.md` — pruebas funcionales y de RLS + eliminación de datos
6. `docs/TROUBLESHOOTING.md` y `docs/LOAD_TEST.md`

## Estructura

```
src/                    # App React (pages en App.tsx, componentes, lib, context)
supabase/migrations/    # 0001_schema.sql (tablas + RLS + triggers) y 0002_seed_demo.sql
supabase/functions/chat-assistant/  # index.ts + providers.ts (gemini/openai/groq)
docs/                   # guías de configuración, seguridad y carga
```

## Notas importantes

- La IA corre en el servidor (Edge Function). El navegador nunca ve las API keys.
- Lo que guarda el chat es una **solicitud pendiente**, no una reserva confirmada ni un pago.
- Los tours demo vienen como **borrador sin precio** ([DEMO]); el admin debe reemplazarlos antes de publicar.
- Sin credenciales externas el código está completo pero indicará qué falta (error 503 controlado).
- Pruebas: `npm test` (vitest) + consultas SQL de `docs/TEST_SEGURIDAD.md`.
