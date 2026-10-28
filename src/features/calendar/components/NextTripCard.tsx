// Tarjeta destacada "Tu próximo viaje": lo primero que el cliente mira desde el móvil.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Armchair, Backpack, CalendarDays, Clock, Compass, MapPinned, MessageSquare, Route,
} from 'lucide-react';
import type { ScheduledRequest } from '../../../lib/types';
import {
  countdownLabel, formatFechaLargaEs, formatHoraEs,
} from '../../../lib/calendar';
import { SOCIALS } from '../../../lib/site';
import { TripActions, tripMeetingPoint, tripTitle } from './TripActions';

function DetailRow({
  icon, label, children,
}: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-white/15 bg-white/5 p-3">
      <span className="mt-0.5 shrink-0 text-andino-100" aria-hidden>{icon}</span>
      <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-wider text-andino-100">{label}</dt>
        <dd className="mt-0.5 text-sm font-semibold text-white break-words whitespace-pre-line">{children}</dd>
      </div>
    </div>
  );
}

/** Tarjeta del próximo viaje confirmado (o del primero sin fecha, si aún no hay). */
export function NextTripCard({ trip }: { trip: ScheduledRequest | null }) {
  if (!trip) {
    return (
      <section aria-labelledby="proximo-viaje" className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-andino-700">Tu próximo viaje</p>
        <h2 id="proximo-viaje" className="mt-1 text-xl font-extrabold text-stone-900 tracking-tight">
          Aún no tienes un viaje programado
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Cuando confirmemos tu reserva verás aquí la fecha, la hora de salida y el punto de encuentro.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            to="/tours"
            className="btn-3d inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-andino-700 px-4 text-sm font-bold text-white hover:bg-andino-800"
          >
            <Compass size={17} aria-hidden /> Explorar tours
          </Link>
          <a
            href={`https://wa.me/${SOCIALS.whatsapp}?text=${encodeURIComponent('Hola, quiero información para programar un tour.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-bold text-emerald-900 hover:bg-emerald-100"
          >
            <MessageSquare size={17} aria-hidden /> Preguntar al asistente
          </a>
        </div>
      </section>
    );
  }

  const title = tripTitle(trip);
  const meeting = tripMeetingPoint(trip);
  const countdown = countdownLabel(trip.confirmed_date);
  const seats = trip.confirmed_seats || trip.requested_seats;
  const waText = encodeURIComponent(
    `Hola, consulto por mi tour "${title}"${trip.confirmed_date ? ` del ${trip.confirmed_date}` : ''}. ID: ${trip.id}`,
  );

  return (
    <section
      aria-labelledby="proximo-viaje"
      className="relative overflow-hidden rounded-3xl border border-andino-800 bg-gradient-to-br from-andino-800 via-andino-700 to-andino-900 text-white shadow-3d-card"
    >
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-andino-500/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-oro-500/10 blur-3xl" />

      <div className="relative p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-oro-400 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-andino-900">
            <Route size={13} aria-hidden /> Tu próximo viaje
          </span>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold text-white">
            {trip.confirmed_date ? countdown ?? 'Fecha por confirmar' : 'Fecha por confirmar'}
          </span>
        </div>

        <div className="mt-4 flex items-start gap-3 sm:gap-4">
          {trip.tours?.image_url ? (
            <img
              src={trip.tours.image_url}
              alt=""
              loading="lazy"
              className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-white/20 sm:h-20 sm:w-20"
            />
          ) : (
            <span aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/10 text-3xl ring-1 ring-white/15 sm:h-20 sm:w-20">
              🏔️
            </span>
          )}
          <div className="min-w-0">
            <h2 id="proximo-viaje" className="text-xl font-extrabold leading-tight tracking-tight text-white text-balance sm:text-2xl">
              {title}
            </h2>
            <p className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-andino-100">
              <CalendarDays size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span>{formatFechaLargaEs(trip.confirmed_date)}</span>
            </p>
            {trip.tours?.duration && (
              <p className="mt-0.5 text-xs text-andino-100">Duración: {trip.tours.duration}</p>
            )}
          </div>
        </div>

        <dl className="mt-5 grid gap-2.5 sm:grid-cols-2">
          <DetailRow icon={<Clock size={16} />} label="Hora de salida">
            {trip.departure_time ? formatHoraEs(trip.departure_time) : (
              <span className="font-normal text-andino-100">
                Te confirmaremos la hora por{' '}
                <a
                  href={`https://wa.me/${SOCIALS.whatsapp}?text=${waText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-white underline underline-offset-4"
                >
                  WhatsApp
                </a>
              </span>
            )}
          </DetailRow>

          <DetailRow icon={<MapPinned size={16} />} label="Punto de encuentro">
            {meeting ?? (
              <span className="font-normal text-andino-100">Te confirmaremos el punto por WhatsApp</span>
            )}
          </DetailRow>

          <DetailRow icon={<Armchair size={16} />} label="Asientos">
            {trip.confirmed_seats
              ? `Confirmados: ${trip.confirmed_seats}`
              : trip.requested_seats
                ? `Solicitados: ${trip.requested_seats} (por confirmar)`
                : 'Se asignan al abordar'}
          </DetailRow>

          <DetailRow icon={<Backpack size={16} />} label="Indicaciones">
            {trip.departure_notes?.trim() || 'Te enviaremos las indicaciones finales por WhatsApp.'}
          </DetailRow>

          {trip.tours?.recommendations?.trim() && (
            <div className="sm:col-span-2">
              <DetailRow icon={<Backpack size={16} />} label="Qué llevar">
                {trip.tours?.recommendations}
              </DetailRow>
            </div>
          )}
        </dl>

        <div className="mt-5">
          <TripActions r={trip} tone="hero" />
        </div>

        <p className="mt-3 text-[11px] text-andino-100">
          Guarda el evento en tu calendario para que no se te pase. Los horarios están en hora de Perú (GMT-5).
        </p>
      </div>
    </section>
  );
}
