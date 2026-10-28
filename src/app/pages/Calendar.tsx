// Agenda del usuario: solo solicitudes confirmed (vía useMySchedule).
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMySchedule } from '../../lib/hooks';
import { BackButton } from '../../components/shared/BackButton';
import { ScheduleCalendar } from '../../features/calendar/components/ScheduleCalendar';

export function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const { schedule, loading } = useMySchedule(user?.id);

  if (authLoading) return <main className="p-12 text-center text-sm text-stone-500">Cargando…</main>;
  if (!user) return <Navigate to="/perfil" replace />;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <BackButton to="/perfil" label="Volver a mi perfil" className="mb-5" />
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-andino-700">Mi viaje</span>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
          Cuándo y dónde nos vemos
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Aquí tienes la fecha confirmada, la hora de salida y el punto de encuentro. Añádelo a tu calendario para no olvidarlo.
        </p>
      </div>
      <ScheduleCalendar schedule={schedule} loading={loading} />
    </main>
  );
}
