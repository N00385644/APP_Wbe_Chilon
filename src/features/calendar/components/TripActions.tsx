// Acciones de un viaje confirmado: descargar .ics (sin dependencias) y abrir Google Calendar.
import { useState } from 'react';
import { AlertTriangle, CalendarPlus, ExternalLink, MessageSquare } from 'lucide-react';
import type { ScheduledRequest } from '../../../lib/types';
import {
  buildIcs, buildGoogleCalendarUrl, formatFechaLargaEs, formatHoraEs,
} from '../../../lib/calendar';
import { SOCIALS } from '../../../lib/site';

/** Título legible del viaje (tour asociado o destino libre). */
export function tripTitle(r: ScheduledRequest): string {
  return r.tours?.title?.trim() || r.requested_destination?.trim() || 'Tour confirmado';
}

/** Punto de encuentro: primero el de la solicitud, después el del tour. */
export function tripMeetingPoint(r: ScheduledRequest): string | null {
  return r.meeting_point?.trim() || r.tours?.meeting_point?.trim() || null;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'tour';
}

/** Datos comunes para el .ics y para el enlace de Google Calendar. */
function eventPayload(r: ScheduledRequest) {
  const meeting = tripMeetingPoint(r);
  const description = [
    'Reserva confirmada — Turismo Chilón',
    `Tour: ${tripTitle(r)}`,
    `Fecha: ${formatFechaLargaEs(r.confirmed_date)}`,
    r.departure_time
      ? `Hora de salida: ${formatHoraEs(r.departure_time)}`
      : 'Hora de salida: por confirmar (te avisaremos por WhatsApp)',
    meeting ? `Punto de encuentro: ${meeting}` : 'Punto de encuentro: por confirmar',
    r.confirmed_seats ? `Asientos: ${r.confirmed_seats}` : '',
    r.departure_notes ? `Indicaciones: ${r.departure_notes}` : '',
    r.tours?.recommendations ? `Qué llevar: ${r.tours.recommendations}` : '',
    `WhatsApp: ${SOCIALS.phone1}`,
  ].filter(Boolean).join('\n');

  return {
    uid: r.id,
    title: `Tour: ${tripTitle(r)}`,
    date: r.confirmed_date as string,
    time: r.departure_time,
    location: meeting,
    description,
    url: r.tours?.slug ? `${window.location.origin}/tours/${r.tours.slug}` : null,
  };
}

/**
 * Botones de calendario de un viaje. `tone` adapta el contraste al fondo
 * oscuro de la tarjeta destacada o al fondo blanco del panel de detalle.
 */
export function TripActions({ r, tone = 'card' }: { r: ScheduledRequest; tone?: 'hero' | 'card' }) {
  const [error, setError] = useState<string | null>(null);

  if (!r.confirmed_date) {
    return (
      <div className="space-y-2">
        <p className={`text-sm ${tone === 'hero' ? 'text-andino-100' : 'text-stone-600'}`}>
          En cuanto la agencia confirme la fecha podrás añadir el viaje a tu calendario.
        </p>
        <a
          href={`https://wa.me/${SOCIALS.whatsapp}?text=${encodeURIComponent(`Hola, quisiera saber la fecha de mi tour "${tripTitle(r)}". ID: ${r.id}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
            tone === 'hero'
              ? 'bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-white'
              : 'border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 focus-visible:outline-andino-700'
          }`}
        >
          <MessageSquare size={17} aria-hidden /> Preguntar por WhatsApp
        </a>
      </div>
    );
  }

  const downloadIcs = () => {
    try {
      const ics = buildIcs(eventPayload(r));
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slugify(tripTitle(r))}-${r.confirmed_date}.ics`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError(null);
    } catch {
      setError('No pudimos generar el archivo. Escríbenos por WhatsApp y te lo enviamos.');
    }
  };

  const waText = encodeURIComponent(
    `Hola, consulto por mi tour "${tripTitle(r)}" del ${r.confirmed_date}. ID: ${r.id}`,
  );

  const primary = tone === 'hero'
    ? 'bg-white text-andino-900 hover:bg-andino-50'
    : 'bg-andino-700 text-white hover:bg-andino-800';
  const secondary = tone === 'hero'
    ? 'border border-white/50 bg-white/10 text-white hover:bg-white/20'
    : 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50';
  // Anillo de foco visible sobre fondo oscuro y sobre fondo blanco.
  const focus = tone === 'hero'
    ? 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
    : 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-andino-700';

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={downloadIcs}
          aria-label={`Añadir a mi calendario el tour ${tripTitle(r)}`}
          className={`btn-3d inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors sm:w-auto ${focus} ${primary}`}
        >
          <CalendarPlus size={18} aria-hidden /> Añadir a mi calendario
        </button>
        <a
          href={buildGoogleCalendarUrl(eventPayload(r))}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Añadir el tour ${tripTitle(r)} a Google Calendar`}
          className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors sm:w-auto ${focus} ${secondary}`}
        >
          <ExternalLink size={17} aria-hidden /> Google Calendar
        </a>
        <a
          href={`https://wa.me/${SOCIALS.whatsapp}?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Consultar por WhatsApp el tour ${tripTitle(r)}`}
          className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors sm:w-auto ${focus} ${
            tone === 'hero'
              ? 'bg-emerald-700 text-white hover:bg-emerald-800'
              : 'border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
          }`}
        >
          <MessageSquare size={17} aria-hidden /> WhatsApp
        </a>
      </div>

      {error && (
        <p role="alert" className={`mt-2 flex items-start gap-1.5 text-xs font-semibold ${tone === 'hero' ? 'text-oro-400' : 'text-red-700'}`}>
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}
