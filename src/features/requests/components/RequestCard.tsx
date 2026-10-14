// Tarjeta de solicitud del usuario (cancelación vía servicio centralizado).
import type { TourRequest } from '../../../lib/types';
import { REQUEST_STATUS_LABEL } from '../../../lib/types';
import { formatFechaHoraLima } from '../../../lib/format';
import { cancelMyRequest } from '../../../services/requests';

export function RequestCard({ r, onChanged }: { r: TourRequest; onChanged: () => void }) {
  const editable = r.status === 'pending';

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
    <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-base text-stone-900">{r.requested_destination ?? '(sin destino)'}</b>
        <span className="rounded-full bg-andino-50 border border-andino-200 text-andino-800 font-semibold px-2.5 py-0.5 text-xs">
          {REQUEST_STATUS_LABEL[r.status] ?? r.status}
        </span>
        <span className="ml-auto text-xs text-stone-400">{formatFechaHoraLima(r.created_at)}</span>
      </div>

      <p className="mt-2 text-xs text-stone-600 leading-relaxed">
        Fecha preferida: <b>{r.preferred_date ?? '—'}</b> · Viajeros: <b>{r.travelers_count}</b> (adultos {r.adults}, menores {r.children}) · Teléfono: <b>{r.contact_phone ?? '—'}</b>
      </p>

      {r.additional_notes && <p className="mt-1 text-xs text-stone-500 italic">Notas: {r.additional_notes}</p>}
      <p className="mt-2 font-mono text-[11px] text-stone-400">ID Seguimiento: {r.id}</p>

      {editable && (
        <button
          onClick={cancel}
          className="mt-3 rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
        >
          Cancelar solicitud
        </button>
      )}
    </div>
  );
}
