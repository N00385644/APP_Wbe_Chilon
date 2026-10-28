# Configurar Supabase

1. Crea un proyecto en https://supabase.com/dashboard
2. Copia Project URL y anon public key (Settings > API).
3. Crea `.env` desde `.env.example` con VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.
4. Aplica migraciones **en orden** por SQL Editor (o `supabase db push` con CLI).
   Orden canónico: `0001_schema.sql`, `0002_seed_demo.sql`, `0003_tour_images.sql`,
   `0003_tour_schedule.sql` (ver nota de colisión en `docs/MIGRATIONS.md`),
   `0004_seed_chilon.sql`, `0005_whatsapp_photos.sql`, `0006_harden_profiles.sql`,
   `0007_check_request_tour.sql`.
   No renombres ficheros ya aplicados en producción sin reconciliación previa.
5. Verifica que existan: profiles, tours, faqs, tour_requests, conversations, messages, unanswered_questions, con RLS activado.
6. No desplegar funciones de IA: el asistente es local (ver docs/AI_KEYS.md — retiro).
7. El usuario debe haber iniciado sesión al menos una vez para que el trigger
   de registro cree su fila en `public.profiles`. Después, crea el primer
   administrador desde el **SQL Editor de Supabase**, que ejecuta las consultas
   en contexto privilegiado y sin el JWT del usuario:

```sql
update public.profiles
set is_admin = true
where email = 'correo@ejemplo.com';
```

   Comprueba que el cambio se aplicó:

```sql
select id, email, is_admin
from public.profiles
where email = 'correo@ejemplo.com';
```

   Para quitar el rol a otro usuario:

```sql
update public.profiles
set is_admin = false
where email = 'correo@ejemplo.com';
```

   Nunca hagas estos cambios desde el frontend. El trigger
   `profiles_is_admin_guard` de `0006_harden_profiles.sql` impide que un
   usuario se haga administrador a sí mismo desde la aplicación. Por eso el
   alta inicial se hace desde el SQL Editor, que corre sin JWT. El mismo
   trigger permite las operaciones privilegiadas y evita cambios de rol propios
   mediante un UPDATE ordinario.
