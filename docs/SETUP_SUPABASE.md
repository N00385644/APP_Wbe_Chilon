# Configurar Supabase

1. Crea un proyecto en https://supabase.com/dashboard
2. Copia Project URL y anon public key (Settings > API).
3. Crea `.env` desde `.env.example` con VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.
4. Aplica migraciones **en orden** por SQL Editor (o `supabase db push` con CLI).
   Orden canónico: `0001_schema.sql`, `0002_seed_demo.sql`, `0003_tour_images.sql`,
   `0003_tour_schedule.sql` (ver nota de colisión en `docs/MIGRATIONS.md`),
   `0004_seed_chilon.sql`, `0005_whatsapp_photos.sql`, `0006_harden_profiles.sql`.
   No renombres ficheros ya aplicados en producción sin reconciliación previa.
5. Verifica que existan: profiles, tours, faqs, tour_requests, conversations, messages, unanswered_questions, con RLS activado.
6. No desplegar funciones de IA: el asistente es local (ver docs/AI_KEYS.md — retiro).
7. Crea el primer admin solo desde SQL privilegiado (SQL Editor como owner o
   service_role, sin JWT de usuario):

```sql
update public.profiles set is_admin = true where email = 'tu-correo@gmail.com';
```

   Nunca desde el frontend. El trigger `profiles_is_admin_guard` (migración
   `0006_harden_profiles.sql`) bloquea que un usuario cambie su propio
   `is_admin` por UPDATE ordinario, y bloquea que un admin se quite el rol a
   sí mismo por accidente.

   Cambios de rol posteriores (solo otro admin o soporte privilegiado):

```sql
-- Otorgar admin a otro usuario (ejecutado por un admin existente o soporte):
update public.profiles set is_admin = true where email = 'nuevo-admin@gmail.com';
-- Revocar admin a otro usuario (nunca a uno mismo por UPDATE ordinario):
update public.profiles set is_admin = false where email = 'ex-admin@gmail.com';
```
