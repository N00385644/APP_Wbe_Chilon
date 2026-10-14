// Arquitectura modular de proveedores. Gemini es el inicial;
// OpenAI y Groq comparten formato chat-completions y no tocan el frontend.

function need(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Proveedor no configurado (${name} ausente). Revisa los secretos de Edge Functions.`);
  return v;
}

async function callGemini(model: string, system: string, context: string, message: string): Promise<string> {
  const key = need('GEMINI_API_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: `Contexto verificado:\n${context}\n\nPregunta del cliente:\n${message}` }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  const text = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  if (!text) throw new Error('Gemini devolvió una respuesta vacía.');
  return text;
}

async function callChatCompletions(base: string, keyName: string, model: string, system: string, context: string, message: string, extraHeaders: Record<string, string> = {}): Promise<string> {
  const key = need(keyName);
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, ...extraHeaders },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 800,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Contexto verificado:\n${context}\n\nPregunta del cliente:\n${message}` },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`${base} ${res.status}: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  const choice = j?.choices?.[0];
  // Nota: NO usar `reasoning` como respuesta (es el pensamiento interno del modelo).
  const text = (choice?.message?.content || choice?.text || '').trim();
  if (!text) throw new Error(`El proveedor devolvió una respuesta vacía (finish_reason=${choice?.finish_reason ?? 'desconocido'}). Prueba con otro AI_MODEL.`);
  return text;
}

export async function callProvider(provider: string, model: string, system: string, context: string, message: string): Promise<string> {
  switch (provider) {
    case 'gemini':
      return callGemini(model || 'gemini-2.0-flash', system, context, message);
    case 'openai':
      return callChatCompletions('https://api.openai.com/v1', 'OPENAI_API_KEY', model || 'gpt-4o-mini', system, context, message);
    case 'groq':
      return callChatCompletions('https://api.groq.com/openai/v1', 'GROQ_API_KEY', model || 'llama-3.1-8b-instant', system, context, message);
    case 'openrouter':
      return callChatCompletions('https://openrouter.ai/api/v1', 'OPENROUTER_API_KEY', model || 'liquid/lfm-2.5-2.6b:free', system, context, message, { 'X-Title': 'Cajamarca Tours Chatbot' });
    case 'nvidia':
      return callChatCompletions('https://integrate.api.nvidia.com/v1', 'NVIDIA_API_KEY', model || 'meta/llama-3.1-8b-instruct', system, context, message);
    default:
      throw new Error(`Proveedor "${provider}" no soportado. Usa AI_PROVIDER=gemini|openai|groq|openrouter|nvidia.`);
  }
}
