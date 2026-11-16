// Perfil: autenticación + nombre + próximos tours + historial de solicitudes.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMyRequests, useMySchedule } from '../../lib/hooks';
import { countdownLabel, daysUntil, formatHoraEs, formatFechaCortaEs } from '../../lib/calendar';
import { BackButton } from '../../components/shared/BackButton';
import { RequestCard } from '../../features/requests/components/RequestCard';

export function Profile() {
  const { user, profile, isAdmin, loading: authLoading, profileLoading, profileError, refreshProfile, signInWithGoogle, signInWithEmail, signUpWithEmail, updateName, error } = useAuth();
  const { requests, loading: requestsLoading, error: requestsError, reload } = useMyRequests(user?.id);
  const { schedule, error: scheduleError, reload: reloadSchedule } = useMySchedule(user?.id);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => { setName(profile?.full_name ?? ''); }, [profile?.full_name, user?.id]);

  if (authLoading) return <main role="status" className="p-12 text-center text-sm text-stone-500">Cargando tu sesión…</main>;

  if (!user) {
    const submitEmail = async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setNotice(null);
      try {
        if (mode === 'in') await signInWithEmail(email, password);
        else if (!await signUpWithEmail(email, password, name)) {
          setNotice('Revisa tu correo para confirmar la cuenta antes de iniciar sesión.');
        }
      } finally { setBusy(false); }
    };

    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <BackButton to="/" label="Volver al inicio" className="mb-6" />
        <div className="glass-panel rounded-3xl p-8 shadow-xl border border-stone-200 text-center">
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Mis Solicitudes</h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-500 leading-relaxed">
            Inicia sesión para ver las solicitudes vinculadas a tu cuenta y tus viajes confirmados.
          </p>

          <button
            onClick={signInWithGoogle}
            className="btn-3d mt-6 w-full rounded-xl bg-andino-700 py-3 font-bold text-white shadow-md hover:bg-andino-800 text-sm"
          >
            Continuar con Google
          </button>

          <div className="relative my-6 text-center">
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-stone-200" />
            <span className="relative bg-white px-3 text-xs font-semibold text-stone-400 uppercase">o con correo</span>
          </div>

          <div className="flex gap-2 text-sm mb-4">
            <button
              onClick={() => { setMode('in'); setNotice(null); }}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-colors ${mode === 'in' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { setMode('up'); setNotice(null); }}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-colors ${mode === 'up' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={submitEmail} className="grid gap-3 text-sm text-left">
            {mode === 'up' && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre completo"
                aria-label="Nombre completo"
                autoComplete="name"
                required
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              aria-label="Correo electrónico"
              autoComplete="email"
              required
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña (mín. 6 caracteres)"
              aria-label="Contraseña"
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              minLength={mode === 'up' ? 6 : undefined}
              required
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
            {notice && <p role="status" className="text-xs text-emerald-800">{notice}</p>}
            <button
              disabled={busy}
              className="rounded-xl bg-stone-900 py-2.5 font-bold text-white text-sm hover:bg-black transition-colors disabled:opacity-50 mt-1"
            >
              {busy ? 'Verificando…' : mode === 'in' ? 'Entrar' : 'Registrarse'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <BackButton to="/" label="Volver al inicio" className="mb-5" />
      {isAdmin && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-tierra-300 bg-tierra-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-tierra-700 text-white">
              <ShieldCheck size={22} aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-tierra-900">Eres administrador</h2>
              <p className="text-xs text-tierra-800">Gestiona solicitudes, tours y la logística confirmada.</p>
            </div>
          </div>
          <Link to="/admin" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-tierra-700 px-4 text-sm font-bold text-white hover:bg-tierra-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tierra-700">
            <ShieldCheck size={16} aria-hidden /> Ir al panel de gestión
          </Link>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-andino-700">Panel de Usuario</span>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Mi Perfil</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">Conectado como: <b>{profile?.email ?? user.email}</b></p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        {profileError && <p role="alert" className="alert-error mb-3 p-3 text-sm">No pudimos cargar tu perfil. <button onClick={() => void refreshProfile()} className="font-bold underline">Reintentar</button></p>}
        <label htmlFor="profile-name" className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Nombre para mostrar</label>
        <div className="flex gap-2">
          <input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre completo"
            className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
          <button
            disabled={busy || profileLoading}
            onClick={async () => {
              setBusy(true); setNotice(null);
              try { if (!await updateName(name)) setNotice('Nombre actualizado.'); }
              finally { setBusy(false); }
            }}
            className="btn-3d rounded-xl bg-andino-700 px-4 py-2 font-bold text-white text-sm hover:bg-andino-800"
          >
            Guardar
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-2 text-xs text-emerald-800">{notice}</p>}
      </div>

      {scheduleError && <p role="alert" className="alert-error mt-6 p-3 text-sm">No pudimos cargar tus próximos viajes. <button onClick={() => void reloadSchedule()} className="font-bold underline">Reintentar</button></p>}

      {/* Resumen de próximos tours confirmados */}
      {schedule.length > 0 && (() => {
        const upcoming = schedule
          .filter((r) => r.confirmed_date && (daysUntil(r.confirmed_date) ?? 0) >= 0)
          .slice(0, 2);
        return (
          <div className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold tracking-tight text-stone-900">Tus próximos tours</h2>
              <Link to="/calendario" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-andino-300 bg-andino-50 px-3 py-1.5 text-xs font-bold text-andino-800 transition-colors hover:bg-andino-100">
                <CalendarDays size={14} aria-hidden /> Ver mi calendario
              </Link>
            </div>
            {upcoming.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {upcoming.map((r) => (
                  <Link key={r.id} to="/calendario"
                    className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm shadow-sm transition-shadow hover:shadow-md">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-700 text-sm font-extrabold text-white">
                      {r.confirmed_date!.split('-')[2]}
                    </span>
                    <span className="min-w-0">
                      <b className="block truncate text-stone-900">{r.tours?.title ?? r.requested_destination ?? '(sin destino)'}</b>
                      <span className="mt-0.5 block text-xs text-stone-600">
                        {formatFechaCortaEs(r.confirmed_date)} · {r.departure_time ? formatHoraEs(r.departure_time) : 'Hora por WhatsApp'} · {r.meeting_point ?? r.tours?.meeting_point ?? 'Punto por confirmar'}
                      </span>
                      <span className="mt-1 inline-block rounded-full bg-emerald-700 px-2 py-0.5 text-[11px] font-extrabold text-white">
                        {countdownLabel(r.confirmed_date)}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-600">
                No tienes viajes próximos. Revisa tus viajes pasados en{' '}
                <Link to="/calendario" className="font-bold text-andino-700 underline">tu calendario</Link>.
              </p>
            )}
          </div>
        );
      })()}

      <div className="mt-10">
        <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Mis Solicitudes de Viaje</h2>
        <div className="mt-4 space-y-3">
          {requestsLoading && <p role="status" className="text-sm text-stone-500">Cargando solicitudes…</p>}
          {requestsError && <p role="alert" className="alert-error p-3 text-sm">No pudimos cargar tus solicitudes. <button onClick={() => void reload()} className="font-bold underline">Reintentar</button></p>}
          {requests.map((r) => (
            <RequestCard key={r.id} r={r} onChanged={reload} />
          ))}
          {!requestsLoading && !requestsError && requests.length === 0 && (
            <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center bg-white">
              <p className="text-sm text-stone-500">Aún no tienes solicitudes registradas.</p>
              <Link to="/tours" className="mt-2 inline-block font-bold text-andino-700 underline text-sm">
                Explorar tours para cotizar
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
