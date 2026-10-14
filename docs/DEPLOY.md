# Despliegue (hosting estático + HTTPS)

1. `npm install && npm run build` genera `dist/`.
2. Sube `dist/` a Netlify, Vercel, Cloudflare Pages o cualquier hosting estático con HTTPS.
3. Variables del sitio (solo públicas): VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY.
4. Registra la URL de producción en Google Cloud (orígenes) y en Supabase URL Configuration.
5. Despliega la función: `supabase functions deploy chat-assistant` y verifica con `supabase secrets list`.
