# Solución de problemas

- Botón Google no vuelve a la app: revisa Redirect URLs en Supabase y la URI de callback en Google Cloud.
- Perfil no se crea: verifica el trigger on_auth_user_created en SQL.
- Tours no aparecen: deben tener is_published=true. Los demo vienen como borrador.
- Chat 503 IA no configurada: falta GEMINI_API_KEY en secretos o AI_PROVIDER incorrecto.
- Chat 429: límite de frecuencia; espera un minuto.
- No se guarda solicitud: inicia sesión; el estado inicial siempre es pending; el cliente no puede auto-confirmar (RLS lo impide).
- Admin denegado: asigna is_admin por SQL (ver SETUP_SUPABASE.md).
- En local usa `npm run dev` (http://localhost:5173) registrado como redirect.
- Si una imagen no carga, la tarjeta muestra un icono alternativo y el detalle sigue funcionando.
