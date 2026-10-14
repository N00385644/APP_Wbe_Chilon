import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPinned, Backpack, MessageSquare } from 'lucide-react';
import type { ScheduledRequest } from '../lib/types';
import {
  MONTHS_ES, WEEKDAYS_ES, buildMonthGrid, shiftMonth,
  todayISO, formatHoraEs, formatFechaCortaEs,
} from '../lib/calendar';
import { SOCIALS } from '../lib/site';

/** Agrupa los tours confirmados por fecha ISO ('YYYY-MM-DD'). */
function groupByDate(schedule: ScheduledRequest[]): Record<string, ScheduledRequest[]> {
  const map: Record<string, ScheduledRequest[]> = {};
  for (const r of schedule) {
    if (!r.confirmed_date) continue;
    (map[r.confirmed_date] ??= []).push(r);
  }
  return map;
}

/** Panel con todos los detalles logísticos del tour seleccionado. */
function TourDayDetail({ r }: { r: ScheduledRequest }) {
  const meetingPoint = r.meeting_point ?? r.tours?.meeting_point ?? 'Por confirmar con la agencia';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetingPoint + ', Cajamarca, Perú')}`;
  const waText = encodeURIComponent(
    `Hola, tengo un tour confirmado (${r.tours?.title ?? r.requested_destination ?? 'tour'}) el ${r.confirmed_date}. Quisiera coordinar detalles. ID: ${r.id}`
  );

  return (
    <aside className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm text-sm lg:sticky lg:top-20" aria-live="polite">
      <h3 className="text-xs font-bold uppercase tracking-wider text-andino-700">Detalles de tu tour</h3>
      <div className="mt-3 flex items-start gap-3">
        {r.tours?.image_url ? (
          <img src={r.tours.image_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-andino-50 text-2xl">🏔️</span>
        )}
        <div>
          <b className="text-base text-stone-900 leading-tight">
            {r.tours?.title ?? r.requested_destination ?? '(sin destino)'}
          </b>
          <p className="text-xs text-stone-500 mt-0.5">
            {formatFechaCortaEs(r.confirmed_date)}, {r.confirmed_date}
          </p>
        </div>
      </div>

      <dl className="mt-4 space-y-3">
        <div className="flex gap-2">
          <CalendarDays size={16} className="text-andino-600 shrink-0 mt-0.5" />
          <div>
            <dt className="text-xs font-bold uppercase text-stone-500">Fecha del tour</dt>
            <dd className="text-stone-800 font-semibold">{formatFechaCortaEs(r.confirmed_date)}</dd>
          </div>
        </div>
        <div className="flex gap-2">
          <Clock size={16} className="text-andino-600 shrink-0 mt-0.5" />
          <div>
            <dt className="text-xs font-bold uppercase text-stone-500">Hora de salida</dt>
            <dd className="text-stone-800 font-semibold">{formatHoraEs(r.departure_time)}</dd>
          </div>
        </div>
        <div className="flex gap-2">
          <MapPinned size={16} className="text-andino-600 shrink-0 mt-0.5" />
          <div>
            <dt className="text-xs font-bold uppercase text-stone-500">Punto de partida</dt>
            <dd className="text-stone-800 font-semibold">{meetingPoint}</dd>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs font-bold text-andino-700 underline hover:text-andino-900">
              Ver en Google Maps →
            </a>
          </div>
        </div>
        <div className="flex gap-2">
          <Backpack size={16} className="text-andino-600 shrink-0 mt-0.5" />
          <div>
            <dt className="text-xs font-bold uppercase text-stone-500">Qué llevar / instrucciones</dt>
            <dd className="text-stone-700">
              {r.departure_notes ?? r.tours?.recommendations ?? 'Te contactaremos por WhatsApp con las indicaciones.'}
            </dd>
          </div>
        </div>
      </dl>

      <p className="mt-4 text-xs text-stone-500 border-t border-stone-100 pt-3">
        Viajeros: <b>{r.travelers_count}</b> · Duración: <b>{r.tours?.duration ?? '—'}</b>
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <a href={`https://wa.me/${SOCIALS.whatsapp}?text=${waText}`} target="_blank" rel="noopener noreferrer"
          className="btn-3d inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors">
          <MessageSquare size={14} /> Confirmar por WhatsApp
        </a>
        {r.tours?.slug && (
          <Link to={`/tours/${r.tours.slug}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors">
            Ver ficha del tour
          </Link>
        )}
      </div>
    </aside>
  );
}

/**
 * Calendario mensual con los tours confirmados del usuario.
 * Desktop: grid + panel de detalle. Móvil: grid compacto + agenda debajo.
 */
export function ScheduleCalendar({ schedule, loading }: { schedule: ScheduledRequest[]; loading: boolean }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedISO, setSelectedISO] = useState<string | null>(null);

  const eventsByDate = useMemo(() => groupByDate(schedule), [schedule]);
  const weeks = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const tISO = todayISO();

  // Selección efectiva: la elegida, o el primer tour confirmado del mes visible, o el próximo en general.
  const effectiveISO = selectedISO ?? schedule.find((r) => r.confirmed_date)?.confirmed_date ?? null;
  const selected = effectiveISO ? (eventsByDate[effectiveISO] ?? []).find(Boolean) ?? null : null;

  const goMonth = (delta: number) => {
    setSelectedISO(null);
    setCursor((c) => shiftMonth(c.year, c.month, delta));
  };

  if (loading) {
    return <p className="py-12 text-center text-sm text-stone-500">Cargando tu calendario…</p>;
  }

  if (schedule.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
        <p className="text-3xl">🗓️</p>
        <p className="mt-2 text-sm text-stone-600">
          Aún no tienes tours programados. Cuando la agencia confirme tu reserva con fecha, hora y punto de partida, aparecerá aquí.
        </p>
        <Link to="/tours" className="mt-3 inline-block font-bold text-andino-700 underline text-sm">
          Explorar tours
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm">
        {/* Cabecera con navegación de mes */}
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => goMonth(-1)} aria-label="Mes anterior"
            className="rounded-lg border border-stone-200 p-2 text-stone-600 hover:bg-stone-50 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-extrabold text-stone-900 capitalize">
            {MONTHS_ES[cursor.month]} {cursor.year}
          </h2>
          <div className="flex gap-1">
            <button onClick={() => { setCursor({ year: now.getFullYear(), month: now.getMonth() }); setSelectedISO(null); }}
              className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors">
              Hoy
            </button>
            <button onClick={() => goMonth(1)} aria-label="Mes siguiente"
              className="rounded-lg border border-stone-200 p-2 text-stone-600 hover:bg-stone-50 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Grid del mes */}
        <div role="grid" aria-label={`Calendario de ${MONTHS_ES[cursor.month]} ${cursor.year}`} className="mt-3">
          <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wider text-stone-400">
            {WEEKDAYS_ES.map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} role="row" className="grid grid-cols-7">
              {week.map((cell, di) => {
                if (!cell) return <div key={di} className="h-14 sm:h-20 border border-stone-50" />;
                const dayEvents = eventsByDate[cell.iso] ?? [];
                const isToday = cell.iso === tISO;
                const isSelected = cell.iso === effectiveISO;
                return (
                  <button
                    key={di}
                    role="gridcell"
                    onClick={() => dayEvents.length > 0 && setSelectedISO(cell.iso)}
                    aria-label={dayEvents.length > 0
                      ? `${cell.date.getDate()}: ${dayEvents.length} tour(s) confirmado(s)`
                      : String(cell.date.getDate())}
                    aria-selected={isSelected}
                    className={`h-14 sm:h-20 border p-1 text-left align-top transition-colors
                      ${isSelected ? 'border-andino-400 bg-andino-50 ring-1 ring-andino-300' : 'border-stone-100'}
                      ${dayEvents.length > 0 ? 'cursor-pointer hover:bg-emerald-50/60' : 'cursor-default'}`}
                  >
                    <span className={`inline-grid h-6 w-6 place-items-center rounded-full text-xs font-bold
                      ${isToday ? 'bg-andino-700 text-white' : 'text-stone-700'}`}>
                      {cell.date.getDate()}
                    </span>
                    <div className="mt-0.5 space-y-0.5">
                      {dayEvents.map((r) => (
                        <span key={r.id}
                          className="block truncate rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          🟢 {r.tours?.title ?? r.requested_destination ?? 'Tour'}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <p className="mt-3 flex items-center gap-2 text-[11px] text-stone-500">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-200 border border-emerald-300" />
          Tour confirmado por la agencia · Haz clic en un día para ver la hora, ubicación de partida e instrucciones.
        </p>
      </div>

      {/* Panel de detalle / agenda de próximos tours */}
      <div className="space-y-4">
        {selected ? <TourDayDetail r={selected} /> : (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
            Selecciona un día con tour para ver los detalles.
          </p>
        )}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">Próximos tours</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {schedule.filter((r) => r.confirmed_date && r.confirmed_date >= tISO).map((r) => (
              <li key={r.id}>
                <button onClick={() => setSelectedISO(r.confirmed_date)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition-colors
                    ${r.confirmed_date === effectiveISO ? 'border-andino-400 bg-andino-50' : 'border-stone-200 hover:bg-stone-50'}`}>
                  <b className="text-stone-900">{r.tours?.title ?? r.requested_destination ?? '(sin destino)'}</b>
                  <span className="block text-xs text-stone-500">
                    {formatFechaCortaEs(r.confirmed_date)} · {formatHoraEs(r.departure_time)}
                  </span>
                </button>
              </li>
            ))}
            {schedule.filter((r) => r.confirmed_date && r.confirmed_date >= tISO).length === 0 && (
              <li className="text-xs text-stone-500">No tienes tours próximos. Revisa tus tours pasados en el calendario.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
