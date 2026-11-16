/** Validate only public build inputs; never include their values in errors. */
export function validateBuildEnv(env: Record<string, string | undefined>): void {
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY antes de compilar.');
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash
      || parsed.pathname !== '/' || /^(localhost|127\.|\[::1\]|example\.|tu-proyecto\.)/.test(parsed.hostname)) throw new Error();
  } catch {
    throw new Error('VITE_SUPABASE_URL debe ser la URL HTTPS real del proyecto Supabase.');
  }
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key);
  if (key.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      publicKey = payload.role === 'anon';
    } catch { publicKey = false; }
  }
  if (!publicKey) throw new Error('Usa una clave publicable de Supabase o anon; nunca service_role ni claves secretas en VITE_*.');
  for (const name of Object.keys(env)) {
    if (name.startsWith('VITE_') && env[name] && /SECRET|PASSWORD|SERVICE_ROLE|RESEND_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY/.test(name)) {
      throw new Error(`La variable ${name} expondría un secreto en el navegador. Elimínala del build.`);
    }
  }
}
