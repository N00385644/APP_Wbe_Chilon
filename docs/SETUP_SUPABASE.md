# Configurar Supabase

1. Crea un proyecto en https://supabase.com/dashboard
2. Copia Project URL y anon public key (Settings > API).
3. Crea `.env` desde `.env.example` con VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.
4. Aplica migraciones: pega `supabase/migrations/0001_schema.sql` y luego `0002_seed_demo.sql` en SQL Editor (o `supabase db push` con CLI).
5. Verifica que existan: profiles, tours, faqs, tour_requests, conversations, messages, unanswered_questions, con RLS activado.
6. No desplegar funciones de IA: el asistente es local (ver docs/AI_KEYS.md — retiro).
7. Crea el primer admin solo desde SQL privilegiado:

```sql
update public.profiles set is_admin = true where email = 'tu-correo@gmail.com';
```

Nunca desde el frontend.
