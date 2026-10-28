# Publicar Cajamarca Tours

Esta guía explica cómo poner la aplicación en internet con HTTPS y sin pagar por el alojamiento. La opción recomendada es **Vercel Hobby**; **Cloudflare Pages** es una alternativa también gratuita.

## Antes de empezar

Necesitas:

- Una cuenta gratuita en [Vercel](https://vercel.com/) o [Cloudflare](https://pages.cloudflare.com/).
- Un proyecto de Supabase.
- El código de este repositorio en GitHub.

Antes de publicar, aplica las migraciones de la base de datos en el orden indicado en [MIGRATIONS.md](MIGRATIONS.md). No cambies ni borres migraciones que ya hayas aplicado.

## Opción recomendada: Vercel Hobby

1. Entra en Vercel y pulsa **Add New → Project**.
2. Conecta GitHub y selecciona este repositorio.
3. Vercel detectará Vite. Comprueba que el framework sea **Vite** y que la carpeta de salida sea `dist`.
4. En **Environment Variables**, añade estas dos variables para `Production`:
   - `VITE_SUPABASE_URL`: la URL de tu proyecto Supabase.
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: la clave publicable de Supabase.
5. Pulsa **Deploy**. Cada cambio posterior enviado a la rama conectada volverá a desplegarse automáticamente.
6. Copia el dominio que Vercel te asignó. Puedes añadir un dominio propio desde **Settings → Domains**.

Las variables `VITE_*` llegan al navegador. Son públicas: nunca pongas aquí una clave `service_role`, contraseñas ni secretos.

## Alternativa: Cloudflare Pages

1. Entra en Cloudflare Pages y pulsa **Create a project → Connect to Git**.
2. Selecciona el repositorio y la rama que quieras publicar.
3. Usa estos valores de build:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** `20`
4. En **Settings → Environment variables**, añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con los valores públicos de tu proyecto.
5. Guarda y pulsa **Save and Deploy**.

El archivo `public/_redirects` mantiene funcionando las rutas de React al recargar la página. `public/_headers` añade las cabeceras de seguridad y la caché de los archivos estáticos.

## Configurar Supabase

En Supabase abre **Authentication → URL Configuration**:

1. Pon el dominio de producción como **Site URL**, por ejemplo `https://tu-dominio.vercel.app`.
2. Añade ese dominio a **Redirect URLs**, incluyendo `https://tu-dominio.vercel.app/**`.
3. Si usarás Google, configura también Google Cloud y el proveedor de Supabase siguiendo [GOOGLE_OAUTH.md](GOOGLE_OAUTH.md).

Comprueba que las migraciones estén aplicadas según [MIGRATIONS.md](MIGRATIONS.md). Los recordatorios por email se documentan en [RECORDATORIOS.md](RECORDATORIOS.md).

## Evitar la pausa de Supabase Free

Supabase puede pausar proyectos gratuitos que permanecen inactivos durante 7 días. Para reducir ese riesgo, entra periódicamente al proyecto y usa la aplicación (por ejemplo, inicia sesión y revisa una página); revisa también el estado del proyecto en el panel de Supabase. La pausa afecta al backend, no al alojamiento de Vercel o Cloudflare, y puede requerir reanudar el proyecto desde el panel.

## Comprobación final

- [ ] La página principal abre con `https://`.
- [ ] El registro y el inicio de sesión funcionan.
- [ ] El botón **Continuar con Google** funciona, si está activado.
- [ ] `/calendario` muestra las solicitudes confirmadas del usuario.
- [ ] Se puede enviar una solicitud de tour.
- [ ] El botón de WhatsApp abre el chat con el número correcto.
- [ ] No hay claves `service_role` ni otros secretos en las variables `VITE_*`.
