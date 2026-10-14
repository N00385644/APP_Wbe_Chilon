import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Profile = {
  id: string; full_name: string | null; email: string | null;
  phone: string | null; is_admin: boolean;
};

type AuthState = {
  session: Session | null; user: User | null; profile: Profile | null;
  loading: boolean; error: string | null;
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

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!error) setProfile(data as Profile);
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) await loadProfile(data.session.user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) setError(error.message);
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_ev, sess) => {
      setSession(sess);
      if (sess?.user) await loadProfile(sess.user.id);
      else setProfile(null);
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
    setSession(null); setProfile(null);
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
    const { error } = await supabase.from('profiles')
      .update({ full_name: name.trim() }).eq('id', session.user.id);
    if (error) setError(error.message);
    else await refreshProfile();
  };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, profile, loading, error, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, refreshProfile, updateName }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fuera de AuthProvider');
  return v;
}
