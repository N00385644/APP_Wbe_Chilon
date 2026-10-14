# AGENTS.md

## Proyecto actual: Cajamarca Tours (React + Supabase + IA en nube)

- **Frontend:** `src/` — React 18 + TS + Vite + Tailwind. `App.tsx` contiene las páginas (Home, Tours, TourDetail, FAQ, Perfil, Calendario, Admin, Privacidad). Componentes: `components/layout.tsx`, `catalog.tsx`, `ChatWidget.tsx`, `AdminPanel.tsx`, `ScheduleCalendar.tsx`. Estado auth: `context/AuthContext.tsx`. Cliente Supabase: `lib/supabase.ts`. Helpers de calendario: `lib/calendar.ts`.
- **Calendario:** `/calendario` muestra solo solicitudes `confirmed` del usuario (hook `useMySchedule` en `lib/hooks.ts`). La logística (fecha/hora/punto/instrucciones) la edita el admin en `AdminPanel.tsx` (bloque "Logística confirmada"). Campos en `tour_requests`: `confirmed_date`, `departure_time`, `meeting_point`, `departure_notes`.
- **Dev local:** `npm install && npm run dev` (http://localhost:5173). Solo vars públicas `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (.env desde .env.example).
- **Base de datos:** `supabase/migrations/0001_schema.sql` (tablas + RLS + triggers + handle_new_user + is_admin), `0002_seed_demo.sql` (contenido [DEMO] no publicado) y `0003_tour_schedule.sql` (logística confirmada + trigger check_confirmed_schedule; **aplicar en SQL Editor de Supabase**).
- **Backend IA:** `supabase/functions/chat-assistant/index.ts` + `providers.ts` (gemini inicial; openai/groq listos). Secretos: GEMINI_API_KEY, AI_PROVIDER, AI_MODEL. Desplegar con `supabase functions deploy chat-assistant`.
- **Roles:** `profiles.is_admin`; primer admin por SQL (`docs/SETUP_SUPABASE.md`). RLS impide auto-admin y auto-confirmación.
- **Docs:** `docs/` (SETUP_SUPABASE, GOOGLE_OAUTH, AI_KEYS, DEPLOY, TEST_SEGURIDAD, TROUBLESHOOTING, LOAD_TEST).
- **Tests:** `npm test` (vitest) + SQL de `docs/TEST_SEGURIDAD.md`.
- **No hay modelos en el navegador.** Toda IA pasa por la Edge Function. No agregar VITE_* secretos.
