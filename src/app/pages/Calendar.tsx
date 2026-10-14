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
    <main className="mx-auto max-w-6xl px-4 py-10">
      <BackButton to="/perfil" label="Volver a mi perfil" className="mb-5" />
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-andino-700">Agenda de viajes</span>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Mi Calendario de Tours</h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Aquí verás la fecha confirmada, la hora de salida, la ubicación de partida y todos los detalles para realizar tu tour.
        </p>
      </div>
      <ScheduleCalendar schedule={schedule} loading={loading} />
    </main>
  );
}
