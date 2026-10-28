// Lista de viajes futuros + sección plegable de viajes pasados.
import { ChevronRight, History } from 'lucide-react';
import type { ScheduledRequest } from '../../../lib/types';
import { countdownLabel, formatFechaCortaEs, formatHoraEs } from '../../../lib/calendar';
import { tripMeetingPoint, tripTitle } from './TripActions';

/** Día y mes cortos para el badge de fecha (sin depender de la zona horaria). */
function dayBadge(iso: string | null): { day: string; month: string } {
  if (!iso) return { day: '?', month: 'Fecha' };
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return { day: '?', month: 'Fecha' };
  const month = new Intl.DateTimeFormat('es-PE', { month: 'short' })
    .format(new Date(y, m - 1, d))
    .replace('.', '');
  return { day: String(d).padStart(2, '0'), month };
}

function TripRow({
  r, onSelect, past = false,
}: { r: ScheduledRequest; onSelect: (r: ScheduledRequest) => void; past?: boolean }) {
  const { day, month } = dayBadge(r.confirmed_date);
  const countdown = countdownLabel(r.confirmed_date);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(r)}
        aria-label={`Ver detalles del viaje ${tripTitle(r)}${r.confirmed_date ? ` del ${r.confirmed_date}` : ', fecha por confirmar'}`}
        className={`flex w-full min-h-16 items-center gap-3 rounded-2xl border bg-white p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-andino-600 ${
          past
            ? 'border-stone-200 hover:bg-stone-50'
            : 'border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/40'
        }`}
      >
        <span
          aria-hidden
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white ${
            past ? 'bg-stone-400' : 'bg-emerald-700'
          }`}
        >
          <span className="text-base font-extrabold leading-none">{day}</span>
          <span className="mt-0.5 text-[10px] font-bold uppercase leading-none">{month}</span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold text-stone-900">{tripTitle(r)}</span>
          <span className="mt-0.5 block text-xs text-stone-600">
            {r.confirmed_date ? formatFechaCortaEs(r.confirmed_date) : 'Fecha por confirmar'}
            {' · '}
            {r.departure_time ? formatHoraEs(r.departure_time) : 'Hora por WhatsApp'}
          </span>
          <span className="mt-0.5 block truncate text-xs text-stone-500">
            {tripMeetingPoint(r) ?? 'Punto de encuentro por confirmar'}
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1">
          {countdown && !past && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-900">
              {countdown}
            </span>
          )}
          <ChevronRight size={18} className="text-stone-400" aria-hidden />
        </span>
      </button>
    </li>
  );
}

type Props = {
  upcoming: ScheduledRequest[];
  past: ScheduledRequest[];
  onSelect: (r: ScheduledRequest) => void;
};

export function TripLists({ upcoming, past, onSelect }: Props) {
  return (
    <div className="space-y-5">
      <section aria-labelledby="proximos-viajes">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="proximos-viajes" className="text-lg font-extrabold tracking-tight text-stone-900">
            Próximos viajes
          </h2>
          <span className="text-xs font-semibold text-stone-500">
            {upcoming.length} {upcoming.length === 1 ? 'viaje' : 'viajes'}
          </span>
        </div>
        {upcoming.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {upcoming.map((r) => <TripRow key={r.id} r={r} onSelect={onSelect} />)}
          </ul>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-600">
            No tienes viajes futuros confirmados. Cuando la agencia confirme una fecha, aparecerá aquí.
          </p>
        )}
      </section>

      {past.length > 0 && (
        <details className="group rounded-2xl border border-stone-200 bg-white shadow-sm [&[open]_.chev]:rotate-90">
          <summary className="flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-andino-600">
            <History size={17} className="text-stone-500" aria-hidden />
            Viajes pasados
            <span className="ml-auto text-xs font-semibold text-stone-500">{past.length}</span>
            <ChevronRight size={17} className="chev shrink-0 text-stone-500 transition-transform" aria-hidden />
          </summary>
          <ul className="space-y-2 border-t border-stone-100 p-4">
            {past.map((r) => <TripRow key={r.id} r={r} onSelect={onSelect} past />)}
          </ul>
        </details>
      )}
    </div>
  );
}
