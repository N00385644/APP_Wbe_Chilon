// Perfil: autenticación + nombre + próximos tours + historial de solicitudes.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMyRequests, useMySchedule } from '../../lib/hooks';
import { formatHoraEs, formatFechaCortaEs } from '../../lib/calendar';
import { BackButton } from '../../components/shared/BackButton';
import { RequestCard } from '../../features/requests/components/RequestCard';

export function Profile() {
  const { user, profile, signInWithGoogle, signInWithEmail, signUpWithEmail, updateName, error } = useAuth();
  const { requests, reload } = useMyRequests(user?.id);
  const { schedule } = useMySchedule(user?.id);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [busy, setBusy] = useState(false);

  if (!user) {
    const submitEmail = async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      if (mode === 'in') await signInWithEmail(email, password);
      else await signUpWithEmail(email, password, name);
      setBusy(false);
    };

    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <BackButton to="/" label="Volver al inicio" className="mb-6" />
        <div className="glass-panel rounded-3xl p-8 shadow-xl border border-stone-200 text-center">
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Mis Solicitudes</h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-500 leading-relaxed">
            Inicia sesión para registrar consultas, ver tu historial de tours y recibir atención personalizada.
          </p>

          <button
            onClick={signInWithGoogle}
            className="btn-3d mt-6 w-full rounded-xl bg-andino-700 py-3 font-bold text-white shadow-md hover:bg-andino-800 transition-all text-sm"
          >
            Continuar con Google
          </button>

          <div className="relative my-6 text-center">
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-stone-200" />
            <span className="relative bg-white px-3 text-xs font-semibold text-stone-400 uppercase">o con correo</span>
          </div>

          <div className="flex gap-2 text-sm mb-4">
            <button
              onClick={() => setMode('in')}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-colors ${mode === 'in' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => setMode('up')}
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
                required
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña (mín. 6 caracteres)"
              required
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-andino-700">Panel de Usuario</span>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Mi Perfil</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">Conectado como: <b>{profile?.email ?? user.email}</b></p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Nombre para mostrar</label>
        <div className="flex gap-2">
          <input
            defaultValue={profile?.full_name ?? ''}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre completo"
            className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => updateName(name || profile?.full_name || '')}
            className="btn-3d rounded-xl bg-andino-700 px-4 py-2 font-bold text-white text-sm hover:bg-andino-800"
          >
            Guardar
          </button>
        </div>
      </div>

      {/* Resumen de próximos tours confirmados */}
      {schedule.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Tus próximos tours</h2>
            <Link to="/calendario" className="inline-flex items-center gap-1.5 rounded-xl border border-andino-300 bg-andino-50 px-3 py-1.5 text-xs font-bold text-andino-800 hover:bg-andino-100 transition-colors">
              <CalendarDays size={14} /> Ver mi calendario
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {schedule.filter((r) => r.confirmed_date).slice(0, 2).map((r) => (
              <Link key={r.id} to="/calendario"
                className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm shadow-sm hover:shadow-md transition-shadow">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white font-extrabold text-sm">
                  {r.confirmed_date!.split('-')[2]}
                </span>
                <span>
                  <b className="text-stone-900">{r.tours?.title ?? r.requested_destination ?? '(sin destino)'}</b>
                  <span className="block text-xs text-stone-600">
                    {formatFechaCortaEs(r.confirmed_date)} · {formatHoraEs(r.departure_time)} · {r.meeting_point ?? r.tours?.meeting_point ?? 'Punto por confirmar'}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Mis Solicitudes de Viaje</h2>
        <div className="mt-4 space-y-3">
          {requests.map((r) => (
            <RequestCard key={r.id} r={r} onChanged={reload} />
          ))}
          {requests.length === 0 && (
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
