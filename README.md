# Cajamarca Tours — Asistente guiado para empresa de tours en Cajamarca, Perú

Aplicación web funcional de extremo a extremo: catálogo de tours, preguntas frecuentes,
asistente virtual con árbol de decisiones determinista (sin IA ni API keys),
consultas de reserva por WhatsApp, autenticación Google/correo y panel administrativo.

## Stack

- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + Lucide + React Router
- Auth y datos: Supabase (Auth Google OAuth, PostgreSQL + RLS)
- Asistente: árbol de decisiones local (`src/features/chatbot/engine/chatTree.ts` + `src/features/chatbot/components/ChatWidget.tsx`), sin IA. Cierre por WhatsApp (`wa.me`, sin API keys)
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
3. `docs/AI_KEYS.md` — nota de retiro de IA (no configurar proveedores)
4. `docs/DEPLOY.md` — publicación gratuita en Cloudflare Pages (`dist/`) con HTTPS
5. `docs/TEST_SEGURIDAD.md` — pruebas funcionales y de RLS + eliminación de datos
6. `docs/TROUBLESHOOTING.md` y `docs/LOAD_TEST.md`

## Estructura

```
src/                    # App React (pages en App.tsx, componentes, lib, context)
supabase/migrations/    # 0001_schema.sql (tablas + RLS + triggers) y 0002_seed_demo.sql
docs/                   # guías de configuración, seguridad y carga
```

## Notas importantes

- El asistente es un menú guiado local. El navegador nunca usa API keys de IA.
- El chat y el formulario preparan mensajes para WhatsApp; **no guardan solicitudes ni conversaciones en la web**. El perfil y el calendario muestran registros vinculados a la cuenta que ya existan en Supabase. El panel actual edita esos registros y no tiene alta manual de solicitudes.
- Los tours demo vienen como **borrador sin precio** ([DEMO]); el admin debe reemplazarlos antes de publicar.
- El build de producción rechaza configuración Supabase incompleta, claves secretas y valores de ejemplo. Usa Node.js 24 y `npm ci` para reproducir la instalación.
- Pruebas: `npm test` (vitest) + consultas SQL de `docs/TEST_SEGURIDAD.md`.
