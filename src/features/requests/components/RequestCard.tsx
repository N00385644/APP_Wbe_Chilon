// Tarjeta de solicitud del usuario (cancelación vía servicio centralizado).
import type { TourRequest } from '../../../lib/types';
import { REQUEST_STATUS_LABEL } from '../../../lib/types';
import { formatFechaHoraLima } from '../../../lib/format';
import { cancelMyRequest } from '../../../services/requests';

export function RequestCard({ r, onChanged }: { r: TourRequest; onChanged: () => void }) {
  const editable = r.status === 'pending';
  const statusCls =
    r.status === 'confirmed'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : r.status === 'cancelled'
        ? 'bg-stone-100 border-stone-300 text-stone-600'
        : r.status === 'pending'
          ? 'bg-amber-50 border-amber-200 text-amber-800'
          : 'bg-andino-50 border-andino-200 text-andino-800';

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
    <div className="card-base p-5 text-sm shadow-sm hover:shadow-md hover:border-stone-300 transition-shadow">
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-base text-stone-900 text-balance">{r.requested_destination ?? '(sin destino)'}</b>
        <span className={`rounded-full border font-semibold px-2.5 py-0.5 text-xs ${statusCls}`}>
          {REQUEST_STATUS_LABEL[r.status] ?? r.status}
        </span>
        <span className="ml-auto text-xs text-stone-400">{formatFechaHoraLima(r.created_at)}</span>
      </div>

      <p className="mt-2 text-xs text-stone-600 leading-relaxed">
        Fecha preferida: <b>{r.preferred_date ?? '—'}</b> · Viajeros: <b>{r.travelers_count}</b> (adultos {r.adults}, menores {r.children}) · Teléfono: <b>{r.contact_phone ?? '—'}</b>
      </p>

      {(r.confirmed_seats || r.requested_seats) && (
        <p className="mt-1.5 text-xs text-stone-700 font-medium">
          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 text-[11px]">
            💺 {r.confirmed_seats ? (
              <span className="text-emerald-800 font-bold">Asiento confirmado: {r.confirmed_seats}</span>
            ) : (
              <span className="text-stone-600">Asiento preferido: {r.requested_seats}</span>
            )}
          </span>
        </p>
      )}

      {r.additional_notes && <p className="mt-1 text-xs text-stone-500 italic">Notas: {r.additional_notes}</p>}
      <p className="mt-2 font-mono text-[11px] text-stone-400">ID Seguimiento: {r.id}</p>

      {editable && (
        <button
          onClick={cancel}
          aria-label={`Cancelar solicitud a ${r.requested_destination ?? 'destino'}`}
          className="mt-3 min-h-10 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 hover:border-red-300 focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-50 transition-colors"
        >
          Cancelar solicitud
        </button>
      )}
    </div>
  );
}
