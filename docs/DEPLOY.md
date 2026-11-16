# Publicar Turismo Chilón gratis

Supabase aloja los datos y las cuentas. Cloudflare Pages aloja los archivos web de `dist/`, con HTTPS y una dirección `pages.dev`. Esta app estática no necesita Pages Functions ni un plan de pago de Workers.

Vercel Hobby se limita al uso personal no comercial; para esta agencia usamos Cloudflare Pages. Referencias: [Cloudflare Pages](https://developers.cloudflare.com/pages/functions/pricing/), [Vercel Hobby](https://vercel.com/docs/plans/hobby).

## Preparar los archivos

Usa Node.js 24. Copia `.env.example` a `.env` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con los valores públicos del proyecto Supabase.

`VITE_FACTURADOR_APP_URL` es opcional. Déjala vacía hasta tener la dirección HTTPS pública del facturador independiente. localhost solo funciona en desarrollo.

```powershell
npm ci
npm test
npm run build
```

El build rechaza configuración incompleta, claves secretas o `service_role` y valores de ejemplo. Las variables `VITE_*` son visibles por los visitantes. Nunca incluyas contraseñas ni claves de Resend o de IA.

## Publicar por carga directa

1. En [Cloudflare](https://dash.cloudflare.com/), abre **Workers & Pages → Create application → Continue to Pages → Drag and drop your files**.
2. Crea el proyecto `turismo-chilon` o el nombre disponible que prefieras.
3. Carga el contenido de `dist/` en un ZIP cuya raíz contenga `index.html`, `_headers`, `_redirects` y las carpetas de recursos. Nunca subas `.env`, el repositorio completo ni `node_modules`.
4. Pulsa **Deploy site** y usa el dominio que confirme Cloudflare.

Para actualizar, abre el mismo proyecto → **Create a new deployment**, elige **Production** y carga el nuevo `dist/` compilado. Las variables ya quedan incorporadas al build local: cambiarlas en el panel después de subir el ZIP no cambia esos archivos.

La carga directa no se convierte después en integración Git; para automatizar desde GitHub se crea otro proyecto Pages. [Guía oficial](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## Supabase antes de abrir al público

- El proyecto debe estar activo. Un proyecto pausado impide cargar tours e iniciar sesión.
- Compara el esquema real con [MIGRATIONS.md](MIGRATIONS.md). Aplica únicamente lo que falte, incluyendo `0010_harden_request_columns.sql` y `0011_deployment_security.sql`. Los dos `0003_*` históricos tienen la misma versión: no ejecutes un `db push` ciego.
- En **Authentication → URL Configuration**, establece **Site URL** en el dominio público confirmado y añade `<dominio>/perfil` y `<dominio>/` a **Redirect URLs**. Conserva las URLs locales si sigues desarrollando.
- Si usas Google, configura el proveedor y callback según [GOOGLE_OAUTH.md](GOOGLE_OAUTH.md).
- La cuenta administradora debe existir y estar promovida según [SETUP_SUPABASE.md](SETUP_SUPABASE.md).

Los recordatorios por email son opcionales. Requieren desplegar la Edge Function, un remitente verificado y secretos privados: [RECORDATORIOS.md](RECORDATORIOS.md). No se envían pruebas a clientes reales para comprobar el despliegue.

## Verificación

Comprueba HTTPS, carga real de tours/FAQs, una ruta directa como `/tours/cumbemayo` tras recargar, enlaces de WhatsApp, entrada y salida de sesión, y acceso admin con la cuenta correspondiente. Revisa móvil y escritorio.

`npm test` cubre `src/__tests__`; se excluye el proyecto independiente e ignorado `mcp/brushstroke/`. Las pruebas SQL están en `supabase/tests/deployment_security.sql`: ejecútalas únicamente en local o staging. Revierten sus datos al terminar. Auth, correo y cron requieren comprobaciones propias en staging.

El chat y el formulario envían consultas por WhatsApp; no generan un registro en Supabase. Perfil/calendario muestran solicitudes ya vinculadas a una cuenta. El panel actual permite editarlas y no tiene alta manual de solicitudes.

Consulta [AVAILABILITY.md](AVAILABILITY.md) para la comprobación diaria gratuita y las limitaciones de pausa/restauración de Supabase Free.
