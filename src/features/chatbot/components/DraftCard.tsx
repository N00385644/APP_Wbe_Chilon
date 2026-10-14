// Visual puro: resumen de solicitud antes de enviar.
// No llama a Supabase: notifica por onConfirm y el contenedor persiste.
import type { BookingDraft } from '../engine/chatTree';
import { WHATSAPP_DISPLAY, waLink, buildBookingMessage } from '../data/whatsapp';

export function DraftCard({ draft, saving, logged, submitted = false, onConfirm, onLogin }: {
  draft: BookingDraft; saving: boolean; logged: boolean; submitted?: boolean;
  onConfirm: (d: BookingDraft) => void; onLogin: () => void;
}) {
  const waText = buildBookingMessage(draft);
  return (
    <div className="mt-2 rounded-xl border border-stone-200 bg-white p-3 text-stone-700">
      <p className="text-xs font-bold uppercase text-stone-500">Resumen de solicitud (revísalo antes de enviar)</p>
      <ul className="mt-1 text-[13px] space-y-0.5">
        <li><b>Destino:</b> {draft.requested_destination ?? '—'}</li>
        <li><b>Fecha preferida:</b> {draft.preferred_date ?? '—'}</li>
        <li><b>Viajeros:</b> {Number(draft.adults ?? 1) + Number(draft.children ?? 0)} (adultos: {draft.adults ?? 1}, menores: {draft.children ?? 0})</li>
        {draft.contact_phone && <li><b>Teléfono:</b> {draft.contact_phone}</li>}
        {draft.additional_notes && <li><b>Notas:</b> {draft.additional_notes}</li>}
      </ul>
      {(draft.missing?.length ?? 0) > 0 && (
        <p className="mt-1 text-xs text-amber-700">Falta: {draft.missing!.join(', ')}. Respóndelo en el chat.</p>
      )}
      <p className="mt-1 text-[11px] text-stone-500">Esto registra una <b>solicitud pendiente</b>, no una reserva confirmada ni un pago.</p>
      <a
        href={waLink(waText)} target="_blank" rel="noopener noreferrer"
        className="mt-2 block w-full rounded-lg bg-[#00a884] px-3 py-2 text-center text-sm font-bold text-white hover:bg-[#009678]"
      >
        Enviar por WhatsApp ({WHATSAPP_DISPLAY})
      </a>
      {logged ? (
        <button disabled={saving || submitted || !(draft.ready_to_confirm ?? false)} onClick={() => onConfirm(draft)}
          className="mt-2 w-full rounded-lg bg-andino-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40 hover:bg-andino-800">
          {submitted ? '✅ Ya enviada' : saving ? 'Enviando…' : 'También guardar en la web'}
        </button>
      ) : (
        <button onClick={onLogin} className="mt-2 w-full rounded-lg border border-andino-700 px-3 py-2 text-sm font-bold text-andino-800 hover:bg-andino-50">
          Continuar con Google para guardar en la web
        </button>
      )}
    </div>
  );
}
