# AGENTS.md

## Proyecto actual: Cajamarca Tours (React + Supabase, asistente guiado sin IA)

- **Frontend:** `src/` — React 18 + TS + Vite + Tailwind. `src/app/` (router, providers, pages). Features: `chatbot/` (engine `chatTree`+`chatSearch`, components `ChatWidget`/`WaCta`/`DraftCard`, data `whatsapp`), `tours/` (`TourCard`), `faqs/` (`FaqList`), `requests/` (`RequestCard`), `calendar/` (`ScheduleCalendar`), `admin/` (`AdminPanel`). Compartidos: `components/layout|shared|viewer3d` (3D aislado, sin lógica de reservas). Servicios: `src/services/` (tours/faqs/requests/schedule). Validación única: `src/schemas/requests.ts`. Estado auth: `context/AuthContext.tsx`. Cliente Supabase: `lib/supabase.ts`. Helpers de calendario: `lib/calendar.ts`.
- **Calendario:** `/calendario` muestra solo solicitudes `confirmed` del usuario (hook `useMySchedule` en `lib/hooks.ts` vía `services/schedule.ts`). La logística (fecha/hora/punto/instrucciones/asientos) la edita el admin en `features/admin/components/AdminPanel.tsx` (bloque "Logística confirmada"). Campos en `tour_requests`: `confirmed_date`, `departure_time`, `meeting_point`, `departure_notes`, `requested_seats`, `confirmed_seats`.
- **Dev local:** `npm install && npm run dev` (http://localhost:5173). Solo vars públicas `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (.env desde .env.example).
- **Base de datos:** `supabase/migrations/0001_schema.sql` (tablas + RLS + triggers + handle_new_user + is_admin), `0002_seed_demo.sql` (contenido [DEMO] no publicado) y resto según `docs/MIGRATIONS.md` (orden canónico + reconciliación; hay dos ficheros `0003_*` históricos que no se renombran).
- **Asistente:** árbol de decisiones local (`src/features/chatbot/engine/chatTree.ts` + `chatSearch.ts`, UI en `components/ChatWidget` → `features/chatbot/components/ChatWidget.tsx`), sin IA ni API keys. Cierre por WhatsApp. Consultas de `tours`/`faqs` publicados por RLS pública.
- **Roles:** `profiles.is_admin`; primer admin por SQL (`docs/SETUP_SUPABASE.md`). Trigger `profiles_is_admin_guard` (migración 0006) + RLS impiden auto-admin y auto-confirmación.
- **Docs:** `docs/` (SETUP_SUPABASE, GOOGLE_OAUTH, AI_KEYS, DEPLOY, TEST_SEGURIDAD, TROUBLESHOOTING, LOAD_TEST).
- **Tests:** `npm test` (vitest) + SQL de `docs/TEST_SEGURIDAD.md`.
- **No hay IA.** Asistente guiado local. No agregar VITE_* secretos ni claves de proveedores.
