import { useEffect, useState } from 'react';
import { MessageCircle, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { REQUEST_STATUS_LABEL } from '../../../lib/types';
import { formatFechaHoraLima } from '../../../lib/format';
import {
  buildTripWhatsAppMessage,
  buildWhatsAppUrl,
  type AdminRequest,
} from '../lib/adminUtils';

const STATUSES = ['pending', 'in_review', 'contacted', 'confirmed', 'cancelled'];
const PAGE = 15;

type Notice = { kind: 'success' | 'error'; text: string };

type ScheduleDraft = {
  confirmed_date: string;
  departure_time: string;
  meeting_point: string;
  departure_notes: string;
  confirmed_seats: string;
};

type Props = {
  /** Solicitud a la que se quiere saltar desde el resumen. */
  focusRequestId?: string | null;
  onFocusConsumed?: () => void;
};

export function RequestsAdmin({ focusRequestId = null, onFocusConsumed }: Props) {
  const [rows, setRows] = useState<AdminRequest[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<'created_at' | 'confirmed_date'>('created_at');
  const [page, setPage] = useState(0);
  const [note, setNote] = useState<Record<string, string>>({});
  // Campos de logística confirmada (solo visibles/editables por admin)
  const [sched, setSched] = useState<Record<string, ScheduleDraft>>({});
  const [statusDraft, setStatusDraft] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(focusRequestId ?? null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const schedOf = (r: AdminRequest): ScheduleDraft => sched[r.id] ?? {
    confirmed_date: r.confirmed_date ?? '',
    departure_time: r.departure_time?.slice(0, 5) ?? '',
    meeting_point: r.meeting_point ?? '',
    departure_notes: r.departure_notes ?? '',
    confirmed_seats: r.confirmed_seats ?? r.requested_seats ?? '',
  };

  // Busca en columnas propias y también en el nombre del tour y del cliente
  // (dos consultas de ids; el filtro final sigue siendo una sola consulta RLS).
  const buildSearchFilter = async (raw: string): Promise<string> => {
    const term = raw.trim().replace(/[,()%]/g, ' ').replace(/\s+/g, ' ').slice(0, 80);
    const parts = [
      `requested_destination.ilike.%${term}%`,
      `contact_phone.ilike.%${term}%`,
      `additional_notes.ilike.%${term}%`,
    ];
    if (term.length >= 2) {
      const [tourRes, profileRes] = await Promise.all([
        supabase.from('tours').select('id').ilike('title', `%${term}%`).limit(25),
        supabase.from('profiles').select('id').ilike('full_name', `%${term}%`).limit(25),
      ]);
      const tourIds = ((tourRes.data ?? []) as { id: string }[]).map((t) => t.id);
      const profileIds = ((profileRes.data ?? []) as { id: string }[]).map((p) => p.id);
      if (tourIds.length > 0) parts.push(`tour_id.in.(${tourIds.join(',')})`);
      if (profileIds.length > 0) parts.push(`user_id.in.(${profileIds.join(',')})`);
    }
    return parts.join(',');
  };

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from('tour_requests')
      .select('*, profiles(full_name, email), tours(title)')
      .range(page * PAGE, page * PAGE + PAGE - 1);

    if (focusId) {
      query = query.eq('id', focusId);
    } else {
      if (status) query = query.eq('status', status);
      if (q.trim()) query = query.or(await buildSearchFilter(q));
      query = sort === 'confirmed_date'
        ? query.order('confirmed_date', { ascending: true, nullsFirst: false })
        : query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    setLoading(false);
    if (error) {
      setNotice({ kind: 'error', text: `No se pudieron cargar las solicitudes: ${error.message}` });
      return;
    }
    setRows((data ?? []) as AdminRequest[]);
  };

  const loadCounts = async () => {
    const { data } = await supabase.from('tour_requests').select('status');
    const next: Record<string, number> = {};
    ((data ?? []) as { status: string }[]).forEach((r) => {
      next[r.status] = (next[r.status] ?? 0) + 1;
    });
    setCounts(next);
  };

  useEffect(() => { void load(); }, [page, status, sort, focusId]);
  useEffect(() => { void loadCounts(); }, []);

  // Salto desde "Próximas salidas": resetea filtros y trae solo esa solicitud.
  useEffect(() => {
    if (!focusRequestId) return;
    setStatus('');
    setQ('');
    setPage(0);
    setFocusId(focusRequestId);
    setHighlightId(focusRequestId);
    onFocusConsumed?.();
  }, [focusRequestId, onFocusConsumed]);

  // Desplaza y resalta la tarjeta enfocada durante unos segundos.
  useEffect(() => {
    if (!highlightId) return;
    const element = document.getElementById(`request-${highlightId}`);
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const timer = window.setTimeout(() => setHighlightId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [highlightId, rows]);

  const clearFocus = () => {
    setFocusId(null);
    setHighlightId(null);
  };

  const setStatusRow = async (r: AdminRequest, next: string) => {
    if (next === r.status) return;
    setNotice(null);
    const logistics = schedOf(r);

    if (next === 'confirmed') {
      if (!logistics.confirmed_date) {
        setStatusDraft((prev) => {
          const copy = { ...prev };
          delete copy[r.id];
          return copy;
        });
        setNotice({ kind: 'error', text: 'Para confirmar, primero indica la fecha del tour en la logística.' });
        return;
      }
    }

    if (next === 'cancelled') {
      const who = r.profiles?.full_name?.trim() || r.contact_phone || 'esta solicitud';
      if (!window.confirm(`¿Cancelar ${who}? La reserva pasará a "Cancelada".`)) {
        setStatusDraft((prev) => {
          const copy = { ...prev };
          delete copy[r.id];
          return copy;
        });
        return;
      }
    }

    const key = `${r.id}:status`;
    setBusy(key);
    // Al confirmar, se guarda también la logística que el admin acaba de escribir.
    // Al salir de "confirmada" hay que liberar confirmed_date (trigger 0003).
    const clearsConfirmedDate = r.status === 'confirmed' && next !== 'confirmed' && !!r.confirmed_date;
    const payload = next === 'confirmed'
      ? {
          status: next,
          confirmed_date: logistics.confirmed_date || null,
          departure_time: logistics.departure_time || null,
          meeting_point: logistics.meeting_point || null,
          departure_notes: logistics.departure_notes || null,
          confirmed_seats: logistics.confirmed_seats || null,
        }
      : { status: next, ...(clearsConfirmedDate ? { confirmed_date: null } : {}) };
    const { error } = await supabase.from('tour_requests').update(payload).eq('id', r.id);
    setBusy(null);

    if (error) {
      setNotice({ kind: 'error', text: `No se pudo cambiar el estado: ${error.message}` });
      setStatusDraft((prev) => {
        const copy = { ...prev };
        delete copy[r.id];
        return copy;
      });
      return;
    }

    setNotice({
      kind: 'success',
      text: clearsConfirmedDate
        ? `Solicitud actualizada a "${REQUEST_STATUS_LABEL[next] ?? next}". Se quitó la fecha confirmada del calendario.`
        : `Solicitud actualizada a "${REQUEST_STATUS_LABEL[next] ?? next}".`,
    });
    await load();
    void loadCounts();
    setStatusDraft((prev) => {
      const copy = { ...prev };
      delete copy[r.id];
      return copy;
    });
  };

  const saveNote = async (r: AdminRequest) => {
    const key = `${r.id}:note`;
    setBusy(key);
    setNotice(null);
    const { error } = await supabase.from('tour_requests').update({ admin_notes: note[r.id] ?? '' }).eq('id', r.id);
    setBusy(null);
    if (error) {
      setNotice({ kind: 'error', text: `No se pudo guardar la nota: ${error.message}` });
      return;
    }
    setNotice({ kind: 'success', text: 'Comentario interno guardado.' });
    await load();
  };

  const saveSchedule = async (r: AdminRequest) => {
    if (r.status !== 'confirmed') {
      setNotice({ kind: 'error', text: 'Primero confirma la solicitud: la logística se guarda al confirmar.' });
      return;
    }
    const s = schedOf(r);
    const key = `${r.id}:schedule`;
    setBusy(key);
    setNotice(null);
    const { error } = await supabase.from('tour_requests').update({
      confirmed_date: s.confirmed_date || null,
      departure_time: s.departure_time || null,
      meeting_point: s.meeting_point || null,
      departure_notes: s.departure_notes || null,
      confirmed_seats: s.confirmed_seats || null,
    }).eq('id', r.id);
    setBusy(null);
    if (error) {
      setNotice({ kind: 'error', text: `No se pudo guardar la logística: ${error.message}` });
      return;
    }
    setNotice({ kind: 'success', text: 'Logística guardada. El cliente la verá en su calendario.' });
    await load();
  };

  const selectFilter = (next: string) => {
    clearFocus();
    setStatus(next);
    setPage(0);
  };

  const totalCount = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const noticeClass = notice?.kind === 'error'
    ? 'border-red-300 bg-red-50 text-red-900'
    : 'border-emerald-300 bg-emerald-50 text-emerald-900';

  return (
    <div className="card-base p-4">
      <h2 className="sr-only">Solicitudes de clientes</h2>

      {notice && (
        <p
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`mb-3 rounded-xl border px-3 py-2 text-sm font-semibold ${noticeClass}`}
        >
          {notice.text}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 focus-within:border-andino-500 focus-within:ring-2 focus-within:ring-andino-500/20">
          <Search size={15} className="text-stone-500" aria-hidden />
          <span className="sr-only">Buscar solicitudes</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { clearFocus(); void load(); } }}
            placeholder="Buscar por tour/destino, teléfono o notas…"
            className="w-full bg-transparent py-2.5 text-sm outline-none"
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-stone-700">
          <span className="sr-only">Ordenar solicitudes</span>
          <select
            aria-label="Ordenar solicitudes"
            value={sort}
            onChange={(e) => { clearFocus(); setSort(e.target.value as typeof sort); setPage(0); }}
            className="min-h-11 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
          >
            <option value="created_at">Más recientes</option>
            <option value="confirmed_date">Fecha de viaje</option>
          </select>
        </label>
        <button
          onClick={() => { clearFocus(); void load(); }}
          className="min-h-11 rounded-xl bg-andino-700 px-4 py-2 text-sm font-bold text-white"
        >
          Buscar
        </button>
      </div>

      <div role="group" aria-label="Filtrar por estado" className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={status === ''}
          onClick={() => selectFilter('')}
          className={`min-h-11 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${status === '' ? 'border-andino-700 bg-andino-700 text-white' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'}`}
        >
          Todas <span className="ml-1 rounded-full bg-black/10 px-1.5 py-0.5 text-[11px]">{totalCount}</span>
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => selectFilter(s)}
            className={`min-h-11 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${status === s ? 'border-andino-700 bg-andino-700 text-white' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'}`}
          >
            {REQUEST_STATUS_LABEL[s] ?? s}
            <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[11px] ${status === s ? 'bg-white/20' : 'bg-stone-100'}`}>{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {status || q.trim() || focusId ? (
        <p className="mt-2 text-xs text-stone-600">
          Mostrando {rows.length} resultado{rows.length === 1 ? '' : 's'}
          {focusId ? ' de la solicitud seleccionada' : ''}.
        </p>
      ) : null}

      <div className="mt-3 space-y-3">
        {loading && <p role="status" className="text-sm text-stone-600">Cargando solicitudes…</p>}
        {!loading && rows.map((r) => {
          const client = r.profiles?.full_name?.trim() || r.contact_phone || 'Cliente sin nombre';
          const waUrl = buildWhatsAppUrl(r.contact_phone, buildTripWhatsAppMessage(r));
          const rowBusy = busy !== null && busy.startsWith(`${r.id}:`);
          const currentStatus = statusDraft[r.id] ?? r.status;
          return (
            <div
              key={r.id}
              id={`request-${r.id}`}
              className={`scroll-mt-24 rounded-xl border p-3 text-sm transition-colors ${
                highlightId === r.id
                  ? 'border-andino-500 bg-andino-50 ring-2 ring-andino-500/30'
                  : r.status === 'pending'
                    ? 'border-amber-400 bg-amber-50/60'
                    : 'border-stone-200 bg-white'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <b className="min-w-0 break-words">{r.tours?.title ?? r.requested_destination ?? '(sin destino)'}</b>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-800">
                  {REQUEST_STATUS_LABEL[r.status] ?? r.status}
                </span>
                <span className="ml-auto text-xs text-stone-600">
                  {formatFechaHoraLima(r.created_at)} · {r.travelers_count} viajeros · {r.preferred_date ?? 'sin fecha'}
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-600">
                {client}
                {r.contact_phone ? ` · tel: ${r.contact_phone}` : ' · sin teléfono'}
                {r.requested_seats ? ` · Asiento solicitado: [${r.requested_seats}]` : ''}
                {r.confirmed_seats ? ` · Asiento asignado: [${r.confirmed_seats}]` : ''}
              </p>
              {r.additional_notes && <p className="mt-1 text-xs text-stone-600">Notas: {r.additional_notes}</p>}

              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <label className="text-xs font-semibold text-stone-700">
                  <span className="sr-only">Estado de la solicitud de {client}</span>
                  <select
                    aria-label={`Estado de la solicitud de ${client}`}
                    value={currentStatus}
                    disabled={rowBusy}
                    onChange={(e) => {
                      const next = e.target.value;
                      setStatusDraft((prev) => ({ ...prev, [r.id]: next }));
                      void setStatusRow(r, next);
                    }}
                    className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60 sm:w-auto"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{REQUEST_STATUS_LABEL[s]}</option>)}
                  </select>
                </label>

                {waUrl ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[#075e54]/40 bg-[#e7ffdb] px-3 py-1.5 text-xs font-bold text-[#075e54] hover:bg-[#d6ffc4] focus-visible:outline-2 focus-visible:outline-[#075e54]"
                  >
                    <MessageCircle size={14} aria-hidden /> Escribir por WhatsApp
                  </a>
                ) : (
                  <span className="text-xs text-stone-500">Sin teléfono para WhatsApp</span>
                )}

                <label className="flex-1 text-xs font-semibold text-stone-700">
                  <span className="sr-only">Comentario interno de {client}</span>
                  <input
                    aria-label={`Comentario interno de ${client}`}
                    value={note[r.id] ?? r.admin_notes ?? ''}
                    onChange={(e) => setNote({ ...note, [r.id]: e.target.value })}
                    placeholder="Comentario interno (no visible al cliente)…"
                    className="min-h-11 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <button
                  onClick={() => void saveNote(r)}
                  disabled={rowBusy}
                  className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-60"
                >
                  Guardar nota
                </button>
              </div>

              {/* Logística del tour: editable antes de confirmar; alimenta el calendario del cliente */}
              {r.status !== 'cancelled' && (
                <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50/60 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Logística del tour {r.status === 'confirmed' ? '(visible en el calendario del cliente)' : '(se guarda al confirmar)'}
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-stone-700">
                      Fecha del tour
                      <input
                        type="date"
                        value={schedOf(r).confirmed_date}
                        onChange={(e) => setSched({ ...sched, [r.id]: { ...schedOf(r), confirmed_date: e.target.value } })}
                        className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-xs font-semibold text-stone-700">
                      Hora de salida
                      <input
                        type="time"
                        value={schedOf(r).departure_time}
                        onChange={(e) => setSched({ ...sched, [r.id]: { ...schedOf(r), departure_time: e.target.value } })}
                        className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-xs font-semibold text-stone-700 sm:col-span-2">
                      Asiento(s) confirmados / asignados {r.requested_seats && <span className="font-normal text-stone-600">(el cliente solicitó: {r.requested_seats})</span>}
                      <input
                        value={schedOf(r).confirmed_seats}
                        placeholder="Ej. 03, 04 (asientos del 01 al 15)"
                        onChange={(e) => setSched({ ...sched, [r.id]: { ...schedOf(r), confirmed_seats: e.target.value } })}
                        className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm font-semibold text-emerald-950"
                      />
                    </label>
                    <label className="text-xs font-semibold text-stone-700 sm:col-span-2">
                      Punto de partida
                      <input
                        value={schedOf(r).meeting_point}
                        placeholder="Ej. Jr. Dos de Mayo 569 (oficina) o recojo en hotel"
                        onChange={(e) => setSched({ ...sched, [r.id]: { ...schedOf(r), meeting_point: e.target.value } })}
                        className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-xs font-semibold text-stone-700 sm:col-span-2">
                      Instrucciones para el viajero
                      <textarea
                        value={schedOf(r).departure_notes}
                        rows={2}
                        placeholder="Ej. Llevar abrigo, bloqueador, agua. Recojo 15 min antes."
                        onChange={(e) => setSched({ ...sched, [r.id]: { ...schedOf(r), departure_notes: e.target.value } })}
                        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
                      />
                    </label>
                  </div>
                  {r.status === 'confirmed' ? (
                    <button
                      onClick={() => void saveSchedule(r)}
                      disabled={rowBusy}
                      className="mt-2 min-h-11 rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
                    >
                      {busy === `${r.id}:schedule` ? 'Guardando…' : 'Guardar logística'}
                    </button>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-emerald-900">
                      Al cambiar el estado a “Confirmada” se guardará esta logística (la fecha es obligatoria).
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!loading && rows.length === 0 && <p className="text-sm text-stone-600">Sin resultados.</p>}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          disabled={page === 0 || loading}
          onClick={() => setPage(page - 1)}
          className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-1 text-sm disabled:opacity-40"
        >
          ← Anterior
        </button>
        <span className="text-xs text-stone-600">Página {page + 1}</span>
        <button
          disabled={loading}
          onClick={() => setPage(page + 1)}
          className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-1 text-sm disabled:opacity-40"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
