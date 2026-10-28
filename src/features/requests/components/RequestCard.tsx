// Tarjeta de solicitud del usuario (cancelación vía servicio centralizado).
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock, MessageCircle, XCircle } from 'lucide-react';
import type { TourRequest } from '../../../lib/types';
import { REQUEST_STATUS_LABEL } from '../../../lib/types';
import { formatFechaCortaEs, formatHoraEs } from '../../../lib/calendar';
import { formatFechaHoraLima } from '../../../lib/format';
import { cancelMyRequest } from '../../../services/requests';

type StatusView = {
  title: string;
  description: string;
  /** Clases del bloque (color de fondo, borde y texto con contraste AA). */
  tone: string;
  icon: typeof CheckCircle2;
  /** Solo para viajes confirmados con fecha. */
  showCalendarLink?: boolean;
};

/** Traduce el estado técnico a lenguaje llano, con icono además de color. */
function statusView(r: TourRequest): StatusView {
  switch (r.status) {
    case 'confirmed':
      return {
        title: 'Viaje confirmado',
        description: r.confirmed_date
          ? `Salida ${formatFechaCortaEs(r.confirmed_date)}${r.departure_time ? ` a las ${formatHoraEs(r.departure_time)}` : ' · hora por WhatsApp'}.`
          : 'Tu reserva está confirmada. Te enviaremos la fecha y la hora por WhatsApp.',
        tone: 'border-emerald-300 bg-emerald-50 text-emerald-900',
        icon: CheckCircle2,
        showCalendarLink: true,
      };
    case 'cancelled':
      return {
        title: 'Solicitud cancelada',
        description: 'No hay ningún viaje activo con esta solicitud. Si fue un error, escríbenos por WhatsApp.',
        tone: 'border-stone-300 bg-stone-100 text-stone-700',
        icon: XCircle,
      };
    case 'contacted':
      return {
        title: 'Ya te contactamos',
        description: 'Revisa tu WhatsApp: te escribimos para coordinar la fecha y los detalles de tu viaje.',
        tone: 'border-andino-300 bg-andino-50 text-andino-900',
        icon: MessageCircle,
      };
    case 'pending':
    case 'in_review':
      return {
        title: 'Estamos revisando tu solicitud',
        description: 'Te escribiremos por WhatsApp para confirmar la fecha, la hora y el punto de encuentro.',
        tone: 'border-amber-300 bg-amber-50 text-amber-900',
        icon: Clock,
      };
    default:
      return {
        title: REQUEST_STATUS_LABEL[r.status] ?? r.status,
        description: 'Te contactaremos por WhatsApp con las novedades de tu solicitud.',
        tone: 'border-stone-300 bg-stone-50 text-stone-700',
        icon: Clock,
      };
  }
}

export function RequestCard({ r, onChanged }: { r: TourRequest; onChanged: () => void }) {
  const editable = r.status === 'pending';
  const status = statusView(r);
  const StatusIcon = status.icon;

  const cancel = async () => {
    if (!confirm('¿Cancelar esta solicitud pendiente?')) return;
    try {
      await cancelMyRequest(r.id);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo cancelar.');
    }
  };

  return (
    <div className="card-base p-4 text-sm shadow-sm transition-shadow hover:border-stone-300 hover:shadow-md sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <b className="text-base text-stone-900 text-balance">{r.requested_destination ?? '(sin destino)'}</b>
        <span className="text-xs text-stone-500">{formatFechaHoraLima(r.created_at)}</span>
      </div>

      <div className={`mt-3 flex gap-2.5 rounded-xl border p-3 ${status.tone}`}>
        <StatusIcon size={20} className="mt-0.5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-extrabold">{status.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed">{status.description}</p>
          {status.showCalendarLink && (
            <Link
              to="/calendario"
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-xs font-extrabold underline underline-offset-4 hover:no-underline"
            >
              <CalendarDays size={14} aria-hidden /> Ver mi calendario
            </Link>
          )}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-3">
        <div>
          <dt className="font-bold uppercase text-stone-500">Fecha preferida</dt>
          <dd className="font-semibold text-stone-800">{r.preferred_date ?? '—'}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase text-stone-500">Viajeros</dt>
          <dd className="font-semibold text-stone-800">
            {r.travelers_count} <span className="font-normal text-stone-600">(adultos {r.adults}, menores {r.children})</span>
          </dd>
        </div>
        <div>
          <dt className="font-bold uppercase text-stone-500">Teléfono</dt>
          <dd className="font-semibold text-stone-800 break-words">{r.contact_phone ?? '—'}</dd>
        </div>
      </dl>

      {(r.confirmed_seats || r.requested_seats) && (
        <p className="mt-2.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-100 px-2 py-1 text-[11px]">
            {r.confirmed_seats ? (
              <span className="font-bold text-emerald-800">Asiento confirmado: {r.confirmed_seats}</span>
            ) : (
              <span className="text-stone-700">Asiento preferido: {r.requested_seats}</span>
            )}
          </span>
        </p>
      )}

      {r.additional_notes && <p className="mt-2 text-xs italic text-stone-600">Notas: {r.additional_notes}</p>}
      <p className="mt-2 font-mono text-[11px] text-stone-500 break-all">ID Seguimiento: {r.id}</p>

      {editable && (
        <button
          onClick={cancel}
          aria-label={`Cancelar solicitud a ${r.requested_destination ?? 'destino'}`}
          className="mt-3 min-h-11 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-50"
        >
          Cancelar solicitud
        </button>
      )}
    </div>
  );
}
