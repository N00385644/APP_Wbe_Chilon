// Puerta del panel administrativo (guarda de rol; el contenido vive en features/admin).
import { Link, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BackButton } from '../../components/shared/BackButton';
import { AdminPanel } from '../../features/admin/components/AdminPanel';

export function Admin() {
  const { user, profile, loading, profileLoading, profileError, isAdmin, refreshProfile } = useAuth();
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    await refreshProfile();
    setRetrying(false);
  };

  // Sesión con perfil aún sin pedir/recibir también cuenta como "verificando".
  if (loading || profileLoading || (user && !profile && !profileError)) {
    return <main role="status" className="p-12 text-center text-sm text-stone-500">Verificando permisos…</main>;
  }
  if (!user) return <Navigate to="/perfil" replace />;
  if (!isAdmin) {
    const retryBtn = (
      <button
        type="button"
        onClick={retry}
        disabled={retrying}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-tierra-700 px-4 text-sm font-bold text-white hover:bg-tierra-800 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tierra-700"
      >
        <RefreshCw size={16} className={retrying ? 'animate-spin' : undefined} aria-hidden /> {retrying ? 'Reintentando…' : 'Reintentar'}
      </button>
    );
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        {profileError ? (
          <>
            <h1 className="text-xl font-bold text-stone-900">No pudimos verificar tus permisos</h1>
            <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{profileError}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-stone-900">Acceso restringido</h1>
            <p className="mt-2 text-sm text-stone-600">
              Iniciaste sesión como <b className="text-stone-900">{profile?.email ?? user.email}</b>, pero esta cuenta no tiene rol de administrador.
            </p>
            <p className="mt-2 text-sm text-stone-500">
              Un administrador existente puede darte el rol, o puede asignarse con el SQL de <code className="rounded bg-stone-100 px-1">docs/SETUP_SUPABASE.md</code>. Si ya te lo dieron, pulsa «Reintentar».
            </p>
          </>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {retryBtn}
          <Link to="/" className="inline-flex min-h-11 items-center px-3 font-bold text-andino-700 underline">Volver al inicio</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <BackButton to="/" label="Volver al inicio" className="mb-5" />
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tierra-100 text-tierra-800 text-xs font-bold mb-1">
          <ShieldCheck size={14} /> Modo Administrador
        </div>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Panel de Gestión</h1>
        <p className="text-sm text-stone-500 mt-1">Administra solicitudes de clientes, publicaciones de tours e imágenes.</p>
      </div>

      <AdminPanel />
    </main>
  );
}
