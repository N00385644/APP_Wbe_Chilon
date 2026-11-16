import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, RefreshCw, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { REQUEST_PUBLIC_COLUMNS } from '../../../services/requests';
import { formatHoraEs } from '../../../lib/calendar';
import {
  computeOverviewStats,
  formatDateLabel,
  limaDateKey,
  missingLogistics,
  type AdminRequest,
} from '../lib/adminUtils';

type Props = {
  onOpenRequest: (id: string) => void;
};

export function OverviewAdmin({ onOpenRequest }: Props) {
  const [rows, setRows] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('tour_requests')
      .select(`${REQUEST_PUBLIC_COLUMNS}, profiles(full_name, email), tours(title)`)
      .order('created_at', { ascending: false })
      .limit(500).returns<AdminRequest[]>();
    setLoading(false);
    if (queryError) {
      setError(`No se pudo cargar el resumen: ${queryError.message}`);
      return;
    }
    setRows((data ?? []) as AdminRequest[]);
  };

  useEffect(() => { void load(); }, []);

  const today = limaDateKey();
  const stats = computeOverviewStats(rows, today);

  const cards = [
    {
      label: 'Pendientes / sin atender',
      value: stats.unattended,
      detail: `${stats.pending} pendientes · ${stats.inReview} en revisión`,
      icon: AlertTriangle,
      tone: stats.unattended > 0 ? 'border-amber-400 bg-amber-50' : 'border-stone-200 bg-white',
    },
    {
      label: 'Confirmadas próximos 7 días',
      value: stats.confirmedNext7,
      detail: `Desde ${formatDateLabel(today)}`,
      icon: CalendarDays,
      tone: 'border-stone-200 bg-white',
    },
    {
      label: 'Pasajeros de la semana',
      value: stats.weekTravelers,
      detail: `${stats.weekSeats} asiento${stats.weekSeats === 1 ? '' : 's'} reservado${stats.weekSeats === 1 ? '' : 's'}`,
      icon: Users,
      tone: 'border-stone-200 bg-white',
    },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-stone-900">Resumen de la agencia</h2>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
        >
          <RefreshCw size={14} aria-hidden /> Actualizar
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900">{error}</p>}
      {loading && <p role="status" className="text-sm text-stone-600">Cargando resumen…</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <section key={card.label} className={`rounded-2xl border p-4 shadow-sm ${card.tone}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-stone-700">{card.label}</p>
                <Icon size={18} className="shrink-0 text-stone-600" aria-hidden />
              </div>
              <p className="mt-1 text-3xl font-extrabold text-stone-900">{card.value}</p>
              <p className="mt-0.5 text-xs text-stone-600">{card.detail}</p>
            </section>
          );
        })}
      </div>

      {stats.incompleteLogistics.length > 0 && (
        <section role="alert" className="rounded-2xl border border-amber-400 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-amber-950">
                {stats.incompleteLogistics.length} reserva{stats.incompleteLogistics.length === 1 ? '' : 's'} confirmada{stats.incompleteLogistics.length === 1 ? '' : 's'} con logística incompleta
              </h3>
              <p className="mt-0.5 text-xs text-amber-900">Completa fecha, hora y punto de encuentro para que el cliente los vea en su calendario.</p>
              <ul className="mt-2 space-y-1.5">
                {stats.incompleteLogistics.slice(0, 6).map((r) => {
                  const name = r.tours?.title ?? r.requested_destination ?? 'Tour sin nombre';
                  const missing = missingLogistics(r);
                  return (
                    <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/70 px-2 py-1.5 text-xs text-amber-950">
                      <span className="font-bold">{name}</span>
                      <span className="text-amber-900">{r.profiles?.full_name || r.contact_phone || 'Cliente'}</span>
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 font-semibold">Falta: {missing.join(', ')}</span>
                      <button
                        onClick={() => onOpenRequest(r.id)}
                        className="ml-auto min-h-11 rounded-lg border border-amber-500 bg-white px-3 py-1 font-bold text-amber-950 hover:bg-amber-100"
                      >
                        Ver
                      </button>
                    </li>
                  );
                })}
              </ul>
              {stats.incompleteLogistics.length > 6 && (
                <p className="mt-1 text-xs font-semibold text-amber-900">y {stats.incompleteLogistics.length - 6} más…</p>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-stone-900">Próximas salidas</h3>
        <p className="mt-0.5 text-xs text-stone-600">Reservas confirmadas de hoy a los próximos 7 días.</p>

        {stats.upcoming.every((g) => g.items.length === 0) ? (
          <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">No hay salidas confirmadas en los próximos 7 días.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {stats.upcoming.map((group) => (
              <div key={group.key}>
                <h4 className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-stone-700">
                  <span>{group.label}</span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-700">{group.items.length}</span>
                </h4>
                {group.items.length === 0 ? (
                  <p className="mt-1 text-xs text-stone-500">Sin salidas.</p>
                ) : (
                  <ul className="mt-1.5 space-y-2">
                    {group.items.map((r) => (
                      <li key={r.id} className="rounded-xl border border-stone-200 p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-andino-100 px-2 py-0.5 text-xs font-bold text-andino-900">
                            {group.key === 'week' && r.confirmed_date ? `${formatDateLabel(r.confirmed_date)} · ` : ''}
                            {formatHoraEs(r.departure_time)}
                          </span>
                          <b className="min-w-0 break-words">{r.tours?.title ?? r.requested_destination ?? 'Tour sin nombre'}</b>
                          <span className="ml-auto text-xs text-stone-600">{r.travelers_count} pax</span>
                        </div>
                        <div className="mt-1 grid gap-1 text-xs text-stone-700 sm:grid-cols-2">
                          <p><span className="font-semibold">Cliente:</span> {r.profiles?.full_name || r.contact_phone || 'Sin datos'}</p>
                          <p><span className="font-semibold">Asientos:</span> {r.confirmed_seats || r.requested_seats || 'Sin asignar'}</p>
                          <p className="sm:col-span-2">
                            <span className="font-semibold">Punto de encuentro:</span>{' '}
                            {r.meeting_point?.trim() || <span className="font-semibold text-amber-800">sin definir</span>}
                          </p>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.reminder_sent_at ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-stone-700'}`}>
                            {r.reminder_sent_at ? 'Recordatorio enviado' : 'Sin recordatorio'}
                          </span>
                          <button
                            onClick={() => onOpenRequest(r.id)}
                            className="ml-auto min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-1 text-xs font-bold text-stone-800 hover:bg-stone-50"
                          >
                            Ver solicitud
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
