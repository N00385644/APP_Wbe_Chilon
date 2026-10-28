import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { validateName } from '../schemas/requests';

export type Profile = {
  id: string; full_name: string | null; email: string | null;
  phone: string | null; is_admin: boolean;
};

type AuthState = {
  session: Session | null; user: User | null; profile: Profile | null;
  /** true solo mientras se resuelve la sesión inicial. */
  loading: boolean; error: string | null;
  /** true mientras se carga el perfil de una sesión ya conocida. */
  profileLoading: boolean;
  /** Error legible si falló la consulta de `profiles`. */
  profileError: string | null;
  /** profiles.is_admin === true (solo UI; la seguridad real está en RLS). */
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  // Usuario cuyo perfil está cargado (o en carga): evita repetir la consulta
  // en INITIAL_SESSION / TOKEN_REFRESHED / USER_UPDATED del mismo usuario.
  const profileUserId = useRef<string | null>(null);

  const loadProfile = async (userId: string) => {
    profileUserId.current = userId;
    setProfileLoading(true);
    setProfileError(null);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (profileUserId.current !== userId) return; // cambió el usuario mientras tanto
    if (error) {
      setProfile(null);
      setProfileError(error.code === 'PGRST116'
        ? 'No se encontró tu perfil. Cierra sesión y vuelve a entrar; si persiste, contacta al administrador.'
        : `No se pudo cargar tu perfil: ${error.message}`);
    } else {
      setProfile(data as Profile);
    }
    setProfileLoading(false);
  };

  const clearProfile = () => {
    profileUserId.current = null;
    setProfile(null); setProfileError(null); setProfileLoading(false);
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) await loadProfile(data.session.user.id);
    else clearProfile();
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setSession(data.session);
      const uid = data.session?.user?.id;
      if (uid && profileUserId.current !== uid) void loadProfile(uid);
      setLoading(false);
    });
    // supabase-js advierte que llamar a supabase dentro de este callback puede
    // bloquearse: nada de await aquí, la carga del perfil se difiere.
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, sess) => {
      setSession(sess);
      const uid = sess?.user?.id;
      if (!uid) { clearProfile(); return; }
      if (profileUserId.current === uid) return;
      profileUserId.current = uid;
      setProfileLoading(true);
      setTimeout(() => { void loadProfile(uid); }, 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    const redirectTo = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: 'openid email profile',
        queryParams: { access_type: 'online', prompt: 'select_account' },
      },
    });
    if (error) setError(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null); clearProfile();
  };

  // Login alternativo con correo (temporal hasta configurar Google OAuth).
  // Usa Supabase Auth real; el perfil se crea solo con el trigger handle_new_user.
  const signInWithEmail = async (email: string, password: string): Promise<string | null> => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      const msg = /invalid login credentials/i.test(error.message)
        ? 'Correo o contraseña incorrectos.'
        : error.message;
      setError(msg);
      return msg;
    }
    return null;
  };

  const signUpWithEmail = async (email: string, password: string, name: string): Promise<string | null> => {
    setError(null);
    if (password.length < 6) {
      const msg = 'La contraseña debe tener al menos 6 caracteres.';
      setError(msg);
      return msg;
    }
    const { error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: name.trim() } },
    });
    if (error) { setError(error.message); return error.message; }
    return null;
  };

  const updateName = async (name: string) => {
    if (!session?.user) return;
    const checked = validateName(name);
    if (checked.error || !checked.value) {
      setError(checked.error ?? 'Nombre inválido.');
      return;
    }
    const { error } = await supabase.from('profiles')
      .update({ full_name: checked.value }).eq('id', session.user.id);
    if (error) setError(error.message);
    else await refreshProfile();
  };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, profile, loading, error, profileLoading, profileError, isAdmin: profile?.is_admin === true, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, refreshProfile, updateName }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fuera de AuthProvider');
  return v;
}
