import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPinned, Backpack, MessageSquare, Armchair, Compass } from 'lucide-react';
import type { ScheduledRequest } from '../../../lib/types';
import {
  MONTHS_ES, WEEKDAYS_ES, buildMonthGrid, shiftMonth,
  todayISO, formatHoraEs, formatFechaCortaEs,
} from '../../../lib/calendar';
import { SOCIALS } from '../../../lib/site';
import { GlowButton } from '../../../components/shared/GlowButton';
import { SeatPicker } from '../../chatbot/components/SeatPicker';
import { NextTripCard } from './NextTripCard';
import { TripActions, tripMeetingPoint, tripTitle } from './TripActions';
import { TripLists } from './TripLists';

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
  const [showSeatMap, setShowSeatMap] = useState(false);
  const meetingPoint = tripMeetingPoint(r) ?? 'Te confirmaremos el punto por WhatsApp';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetingPoint + ', Cajamarca, Perú')}`;
  const assignedSeats = r.confirmed_seats || r.requested_seats;

  return (
    <aside className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm text-sm" aria-live="polite">
      <h3 className="text-xs font-bold uppercase tracking-wider text-andino-700">Detalles de tu tour</h3>
      <div className="mt-3 flex items-start gap-3">
        {r.tours?.image_url ? (
          <img src={r.tours.image_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-andino-50 text-2xl" aria-hidden>🏔️</span>
        )}
        <div className="min-w-0">
          <b className="block text-base leading-tight text-stone-900">{tripTitle(r)}</b>
          <p className="mt-0.5 text-xs text-stone-500">
            {formatFechaCortaEs(r.confirmed_date)}, {r.confirmed_date}
          </p>
        </div>
      </div>

      <dl className="mt-4 space-y-3">
        <div className="flex gap-2">
          <CalendarDays size={16} className="mt-0.5 shrink-0 text-andino-600" aria-hidden />
          <div>
            <dt className="text-xs font-bold uppercase text-stone-500">Fecha del tour</dt>
            <dd className="font-semibold text-stone-800">{formatFechaCortaEs(r.confirmed_date)}</dd>
          </div>
        </div>
        <div className="flex gap-2">
          <Clock size={16} className="mt-0.5 shrink-0 text-andino-600" aria-hidden />
          <div>
            <dt className="text-xs font-bold uppercase text-stone-500">Hora de salida</dt>
            <dd className="font-semibold text-stone-800">
              {r.departure_time
                ? formatHoraEs(r.departure_time)
                : <span className="font-normal text-stone-600">Te confirmaremos la hora por WhatsApp</span>}
            </dd>
          </div>
        </div>
        <div className="flex gap-2">
          <Armchair size={16} className="mt-0.5 shrink-0 text-andino-600" aria-hidden />
          <div className="w-full">
            <dt className="text-xs font-bold uppercase text-stone-500">Asiento en el vehículo</dt>
            <dd className="mt-0.5 flex flex-wrap items-center gap-2 font-semibold text-stone-800">
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-900 shadow-sm">
                <Armchair size={13} aria-hidden />
                {r.confirmed_seats ? `Asiento(s): ${r.confirmed_seats}` : r.requested_seats ? `Solicitado: ${r.requested_seats}` : 'Asignación al abordar'}
              </span>
              <button
                type="button"
                onClick={() => setShowSeatMap(true)}
                className="inline-flex min-h-11 items-center text-xs font-bold text-andino-700 underline transition-colors hover:text-andino-900"
              >
                Ver en plano 3D/2D →
              </button>
            </dd>
          </div>
        </div>
        <div className="flex gap-2">
          <MapPinned size={16} className="mt-0.5 shrink-0 text-andino-600" aria-hidden />
          <div>
            <dt className="text-xs font-bold uppercase text-stone-500">Punto de partida</dt>
            <dd className="font-semibold text-stone-800">{meetingPoint}</dd>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-xs font-bold text-andino-700 underline hover:text-andino-900">
              Ver en Google Maps →
            </a>
          </div>
        </div>
        <div className="flex gap-2">
          <Backpack size={16} className="mt-0.5 shrink-0 text-andino-600" aria-hidden />
          <div>
            <dt className="text-xs font-bold uppercase text-stone-500">Qué llevar / instrucciones</dt>
            <dd className="whitespace-pre-line text-stone-700">
              {r.departure_notes ?? r.tours?.recommendations ?? 'Te contactaremos por WhatsApp con las indicaciones.'}
            </dd>
          </div>
        </div>
      </dl>

      {showSeatMap && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowSeatMap(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
            <SeatPicker
              readOnly
              tourTitle={tripTitle(r)}
              date={r.confirmed_date}
              highlightSeats={(assignedSeats ?? '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)}
              onClose={() => setShowSeatMap(false)}
            />
          </div>
        </div>
      )}

      <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
        Viajeros: <b>{r.travelers_count}</b> · Duración: <b>{r.tours?.duration ?? '—'}</b>
      </p>

      <div className="mt-4 space-y-2">
        <TripActions r={r} />
        {r.tours?.slug && (
          <Link to={`/tours/${r.tours.slug}`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-50">
            Ver ficha del tour
          </Link>
        )}
      </div>
    </aside>
  );
}

/**
 * Calendario mensual con los tours confirmados del usuario.
 * Arriba: tarjeta "Tu próximo viaje" (fecha, cuenta atrás y acciones).
 * Desktop: grid + panel de detalle. Móvil: grid compacto + listas debajo.
 */
export function ScheduleCalendar({ schedule, loading }: { schedule: ScheduledRequest[]; loading: boolean }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedISO, setSelectedISO] = useState<string | null>(null);

  const eventsByDate = useMemo(() => groupByDate(schedule), [schedule]);
  const weeks = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const tISO = todayISO();

  // Próximos (ascendente, con los "sin fecha" al final) y pasados (más reciente primero).
  const { next, upcoming, past } = useMemo(() => {
    const dated = schedule.filter((r) => r.confirmed_date);
    const upcomingDated = dated
      .filter((r) => (r.confirmed_date as string) >= tISO)
      .sort((a, b) => ((a.confirmed_date as string) < (b.confirmed_date as string) ? -1 : 1));
    const undated = schedule.filter((r) => !r.confirmed_date);
    const pastDated = dated
      .filter((r) => (r.confirmed_date as string) < tISO)
      .sort((a, b) => ((a.confirmed_date as string) > (b.confirmed_date as string) ? -1 : 1));
    return {
      next: upcomingDated[0] ?? undated[0] ?? null,
      upcoming: [...upcomingDated, ...undated],
      past: pastDated,
    };
  }, [schedule, tISO]);

  const effectiveISO = selectedISO ?? next?.confirmed_date ?? null;
  const selected = effectiveISO ? (eventsByDate[effectiveISO] ?? [])[0] ?? null : null;

  const goMonth = (delta: number) => {
    setSelectedISO(null);
    setCursor((c) => shiftMonth(c.year, c.month, delta));
  };

  /** Lleva el calendario al mes del viaje y muestra su detalle. */
  const focusTrip = (r: ScheduledRequest) => {
    if (r.confirmed_date) {
      const [year, month] = r.confirmed_date.split('-').map(Number);
      if (year && month) setCursor({ year, month: month - 1 });
      setSelectedISO(r.confirmed_date);
    }
    const target = document.getElementById('detalle-viaje');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="space-y-5">
        <div className="skeleton h-52 bg-white/70 p-5">
          <p className="text-sm font-semibold text-stone-500">Cargando tu próximo viaje…</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="skeleton h-96 bg-white/70 p-5" />
          <div className="skeleton h-48 bg-white/70" />
        </div>
      </div>
    );
  }

  if (schedule.length === 0) {
    return (
      <div role="status" className="empty-state bg-white p-6 sm:p-10">
        <p className="text-3xl" aria-hidden>🗓️</p>
        <p className="mt-2 text-base font-extrabold text-stone-900">Aún no tienes tours programados</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-stone-600">
          Cuando la agencia confirme tu reserva con fecha, hora y punto de partida, verás todo aquí.
        </p>
        <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <GlowButton to="/tours" variant="verde" icon={<Compass size={17} />} ariaLabel="Explorar tours disponibles">
            Explorar tours
          </GlowButton>
          <a
            href={`https://wa.me/${SOCIALS.whatsapp}?text=${encodeURIComponent('Hola, quiero información para programar un tour.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-bold text-emerald-900 transition-colors hover:bg-emerald-100 sm:w-auto"
          >
            <MessageSquare size={17} aria-hidden /> Preguntar al asistente
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <NextTripCard trip={next} />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm">
          {/* Cabecera con navegación de mes */}
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => goMonth(-1)} aria-label="Mes anterior"
              className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-stone-200 p-2 text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-andino-600 disabled:opacity-40">
              <ChevronLeft size={18} aria-hidden />
            </button>
            <h2 className="text-base font-extrabold capitalize text-stone-900 sm:text-lg">
              {MONTHS_ES[cursor.month]} {cursor.year}
            </h2>
            <div className="flex gap-1">
              <button onClick={() => { setCursor({ year: now.getFullYear(), month: now.getMonth() }); setSelectedISO(null); }}
                className="min-h-11 rounded-lg border border-stone-200 px-3 py-2 text-xs font-bold text-stone-600 transition-colors hover:bg-stone-50">
                Hoy
              </button>
              <button onClick={() => goMonth(1)} aria-label="Mes siguiente"
                className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-stone-200 p-2 text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-andino-600">
                <ChevronRight size={18} aria-hidden />
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
                  if (!cell) return <div key={di} className="h-14 border border-stone-50 sm:h-20" />;
                  const dayEvents = eventsByDate[cell.iso] ?? [];
                  const isToday = cell.iso === tISO;
                  const isSelected = cell.iso === effectiveISO;
                  const isUpcoming = cell.iso >= tISO;
                  return (
                    <button
                      key={di}
                      role="gridcell"
                      onClick={() => dayEvents.length > 0 && setSelectedISO(cell.iso)}
                      aria-label={dayEvents.length > 0
                        ? `${cell.date.getDate()}: ${dayEvents.length} tour(s) confirmado(s)`
                        : String(cell.date.getDate())}
                      aria-selected={isSelected}
                      className={`h-14 border p-1 text-left align-top transition-colors focus-visible:outline-2 focus-visible:outline-andino-600 focus-visible:outline-offset-[-2px] sm:h-20
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
                            {/* Punto CSS (no emoji): idéntico en todo SO. Late solo si el tour
                                es próximo — los tours pasados quedan quietos. */}
                            <span
                              aria-hidden="true"
                              className={`mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle ${isUpcoming ? 'cal-dot' : ''}`}
                            />
                            {r.tours?.title ?? r.requested_destination ?? 'Tour'}
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
            <span className="inline-block h-2.5 w-2.5 rounded-sm border border-emerald-300 bg-emerald-200" aria-hidden />
            Tour confirmado por la agencia · Toca un día para ver la hora, el punto de partida y las instrucciones.
          </p>
        </div>

        {/* Panel de detalle del día seleccionado */}
        <div id="detalle-viaje" className="scroll-mt-20 space-y-4">
          {selected ? <TourDayDetail r={selected} /> : next ? (
            <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-600">
              Tu viaje <b>{tripTitle(next)}</b> todavía no tiene fecha confirmada. Te avisaremos por WhatsApp en cuanto la agencia la asigne.
            </p>
          ) : (
            <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
              Selecciona un día con tour para ver los detalles.
            </p>
          )}
        </div>
      </div>

      <TripLists upcoming={upcoming} past={past} onSelect={focusTrip} />
    </div>
  );
}
