# Claves de IA — RETIRADO (Fase 1)

El asistente de esta aplicación es un **árbol de decisiones determinista local**
(`src/lib/chatTree.ts` + `src/components/ChatWidget.tsx`). No usa proveedores de
IA, modelos LLM ni API keys.

- La Edge Function `supabase/functions/chat-assistant` fue **retirada** del repo
  y deshabilitada en `supabase/config.toml` (`enabled = false`).
- **No configures** `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`,
  `NVIDIA_API_KEY`, `AI_PROVIDER`, `AI_MODEL` ni respaldos.
- Si algún entorno todavía tiene la función desplegada, retírala así:

```bash
# 1. Verificar si existe en el proyecto remoto
supabase functions list

# 2. Eliminar el despliegue remoto (requiere acceso al proyecto)
supabase functions delete chat-assistant

# 3. Eliminar secretos huérfanos si existieran
supabase secrets unset GEMINI_API_KEY AI_PROVIDER AI_MODEL AI_BACKUP_PROVIDER AI_BACKUP_MODEL OPENAI_API_KEY GROQ_API_KEY NVIDIA_API_KEY OPENROUTER_API_KEY

# 4. Verificar
supabase functions list
supabase secrets list
```

- No borres las tablas `conversations`, `messages` ni `unanswered_questions`
  automáticamente: conservan historial. Su limpieza, si procede, requiere
  autorización y respaldo previo.
- El cierre de conversación es por **WhatsApp** (`src/lib/whatsapp.ts`, deep-link
  `wa.me` sin API keys) y guardado de **solicitud pendiente** en `tour_requests`.

Reglas vigentes:

- Nunca uses `VITE_*` para secretos.
- Nunca pongas `service_role` en el frontend.
