# Solución de problemas

- Botón Google no vuelve a la app: revisa Redirect URLs en Supabase y la URI de callback en Google Cloud.
- Perfil no se crea: verifica el trigger on_auth_user_created en SQL.
- Tours no aparecen: deben tener is_published=true. Los demo vienen como borrador.
- Chat sin respuesta del catálogo: el menú guiado solo usa tours/faqs publicados.
- Chat: el asistente es local (sin llamadas a funciones). Si el catálogo no carga, revisa RLS pública de tours/faqs.
- No se guarda solicitud: inicia sesión; el estado inicial siempre es pending; el cliente no puede auto-confirmar (RLS lo impide).
- Admin denegado: asigna is_admin por SQL (ver SETUP_SUPABASE.md).
- En local usa `npm run dev` (http://localhost:5173) registrado como redirect.
- Si una imagen no carga, la tarjeta muestra un icono alternativo y el detalle sigue funcionando.
