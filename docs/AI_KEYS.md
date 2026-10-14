# Claves de IA (secretos de Edge Functions)

Referencia: https://supabase.com/docs/guides/functions/secrets

Solo el proveedor seleccionado es obligatorio (inicial: Gemini).

```bash
supabase secrets set GEMINI_API_KEY=tu-clave-de-aistudio
supabase secrets set AI_PROVIDER=gemini
supabase secrets set AI_MODEL=gemini-1.5-flash
# Opcionales a futuro:
# supabase secrets set OPENAI_API_KEY=...
# supabase secrets set GROQ_API_KEY=...
```

## Proveedor de respaldo (fallback automático)

Si el proveedor principal falla tras los reintentos, la función usa el respaldo sin tocar el frontend:

```bash
supabase secrets set NVIDIA_API_KEY=tu-clave-nvapi
supabase secrets set AI_BACKUP_PROVIDER=nvidia
supabase secrets set AI_BACKUP_MODEL=meta/llama-3.1-8b-instruct
```

Consigue la clave gratis en https://build.nvidia.com (perfil → API Keys, empieza con `nvapi-...`).
Otros modelos NVIDIA válidos: `meta/llama-3.1-70b-instruct`, `mistralai/mixtral-8x7b-instruct-v0.1`.
Para quitar el respaldo: `supabase secrets unset AI_BACKUP_PROVIDER AI_BACKUP_MODEL`.

Consigue la clave en https://aistudio.google.com/apikey

Reglas:
- Nunca uses VITE_* para secretos.
- Nunca los pongas en tablas, en el repo ni en el panel.
- Nunca aparecen en errores ni respuestas del chat.
- Sin la clave, el chat devuelve error 503 controlado y conserva el mensaje.
- Cambiar de proveedor es solo cambiar AI_PROVIDER / AI_MODEL en secretos y redesplegar. Sin tocar el frontend.
