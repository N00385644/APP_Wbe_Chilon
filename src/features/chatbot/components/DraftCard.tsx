// Visual puro: resumen de solicitud antes de abrir WhatsApp.
import type { BookingDraft } from '../engine/chatTree';
import { WHATSAPP_DISPLAY, waLink, buildBookingMessage } from '../data/whatsapp';

export function DraftCard({ draft, onEditSeats }: {
  draft: BookingDraft; onEditSeats?: () => void;
}) {
  const waText = buildBookingMessage(draft);
  const stepsDone = [draft.requested_destination, draft.preferred_date || draft.date_is_flexible, draft.pax_confirmed || draft.adults].filter(Boolean).length;
  return (
    <div className="mt-2 rounded-xl border border-stone-200 bg-white p-3 text-stone-700 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Resumen de solicitud · paso {Math.min(stepsDone + 1, 4)} de 4</p>
        {onEditSeats && (
          <button
            type="button"
            onClick={onEditSeats}
            className="text-[11px] font-bold text-andino-700 hover:text-andino-900 underline flex items-center gap-1"
          >
            💺 {draft.requested_seats ? 'Cambiar asientos' : 'Elegir asientos'}
          </button>
        )}
      </div>
      <ul className="mt-1 text-[13px] space-y-0.5">
        <li><b>Destino:</b> {draft.requested_destination ?? '—'}</li>
        <li><b>Fecha preferida:</b> {draft.date_is_flexible ? 'Fecha flexible' : draft.preferred_date ?? '—'}</li>
        <li><b>Viajeros:</b> {Number(draft.adults ?? 1) + Number(draft.children ?? 0)} (adultos: {draft.adults ?? 1}, menores: {draft.children ?? 0})</li>
        {draft.requested_seats && <li><b>Asiento(s) elegido(s):</b> <span className="font-semibold text-andino-800">💺 {draft.requested_seats}</span></li>}
        {draft.contact_phone && <li><b>Teléfono:</b> {draft.contact_phone}</li>}
        {draft.additional_notes && <li><b>Notas:</b> {draft.additional_notes}</li>}
      </ul>
      {(draft.missing?.length ?? 0) > 0 && (
        <p role="alert" className="alert-error mt-2 text-xs">Falta: {draft.missing!.join(', ')}. Respóndelo en el chat para continuar.</p>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
        No guardamos esta solicitud en la web. El equipo la recibe por WhatsApp y confirma disponibilidad, precio y pago contigo.
      </p>
      <a
        href={waLink(waText)} target="_blank" rel="noopener noreferrer"
        aria-label="Enviar resumen por WhatsApp a la empresa"
        className="mt-2 block w-full min-h-11 rounded-lg bg-[#00a884] px-3 py-2.5 text-center text-sm font-bold text-white hover:bg-[#009678] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00a884] transition-colors"
      >
        Enviar por WhatsApp ({WHATSAPP_DISPLAY})
      </a>
    </div>
  );
}
