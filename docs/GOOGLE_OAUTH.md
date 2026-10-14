# Google OAuth (Continuar con Google)

Referencia: https://supabase.com/docs/guides/auth/social-login/auth-google

1. En Google Cloud Console crea un proyecto y un ID de cliente OAuth (tipo Web).
2. Orígenes JS autorizados: http://localhost:5173 y tu URL de producción (HTTPS).
3. URI de redirección: https://TU-PROYECTO.supabase.co/auth/v1/callback
4. En Supabase Authentication > Providers > Google: activa y pega Client ID y Client Secret.
5. En Authentication > URL Configuration: Site URL = tu dominio; Redirect URLs = http://localhost:5173/** y https://tu-dominio/**
6. Prueba: pulsa Continuar con Google, elige cuenta y vuelve a la app. El perfil se crea solo (trigger handle_new_user). Solo se piden permisos openid, email y profile.
7. Si el usuario cancela, la app muestra un mensaje y no rompe la sesión.
8. Error redirect_uri_mismatch: revisa las URIs en Google Cloud.
