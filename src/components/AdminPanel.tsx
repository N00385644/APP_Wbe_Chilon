import { useEffect, useState } from 'react';
import { BarChart3, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Faq, Tour, TourImage, TourRequest } from '../lib/types';
import { REQUEST_STATUS_LABEL } from '../lib/types';
import { formatFechaHoraLima } from '../lib/format';

const STATUSES = ['pending', 'in_review', 'contacted', 'confirmed', 'cancelled'];

export function AdminPanel() {
  const [tab, setTab] = useState<'requests' | 'tours' | 'faqs' | 'stats'>('requests');
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {([['requests', 'Solicitudes'], ['tours', 'Tours'], ['faqs', 'Preguntas frecuentes'], ['stats', 'Estadísticas']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === k ? 'bg-andino-700 text-white' : 'bg-white border border-stone-200 hover:bg-stone-50'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === 'requests' && <RequestsAdmin />}
        {tab === 'tours' && <ToursAdmin />}
        {tab === 'faqs' && <FaqsAdmin />}
        {tab === 'stats' && <StatsAdmin />}
      </div>
    </div>
  );
}

function RequestsAdmin() {
  const [rows, setRows] = useState<TourRequest[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [note, setNote] = useState<Record<string, string>>({});
  // Campos de logística confirmada (solo visibles/editables por admin)
  const [sched, setSched] = useState<Record<string, { confirmed_date: string; departure_time: string; meeting_point: string; departure_notes: string }>>({});
  const PAGE = 15;

  const schedOf = (r: TourRequest) => sched[r.id] ?? {
    confirmed_date: r.confirmed_date ?? '',
    departure_time: r.departure_time?.slice(0, 5) ?? '',
    meeting_point: r.meeting_point ?? '',
    departure_notes: r.departure_notes ?? '',
  };

  const load = async () => {
    let query = supabase.from('tour_requests').select('*').order('created_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (status) query = query.eq('status', status);
    if (q.trim()) query = query.or(`requested_destination.ilike.%${q}%,contact_phone.ilike.%${q}%,additional_notes.ilike.%${q}%`);
    const { data } = await query;
    setRows((data ?? []) as TourRequest[]);
  };
  useEffect(() => { load(); }, [page, status]);

  const setStatusRow = async (r: TourRequest, s: string) => {
    // El cliente nunca puede auto-confirmar: esta UI es solo admin (RLS lo refuerza).
    const { error } = await supabase.from('tour_requests').update({ status: s }).eq('id', r.id);
    if (!error) load();
  };
  const saveNote = async (r: TourRequest) => {
    const { error } = await supabase.from('tour_requests').update({ admin_notes: note[r.id] ?? '' }).eq('id', r.id);
    if (!error) load();
  };
  const saveSchedule = async (r: TourRequest) => {
    const s = schedOf(r);
    const { error } = await supabase.from('tour_requests').update({
      confirmed_date: s.confirmed_date || null,
      departure_time: s.departure_time || null,
      meeting_point: s.meeting_point || null,
      departure_notes: s.departure_notes || null,
    }).eq('id', r.id);
    if (error) alert(error.message); else load();
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-stone-300 px-3">
          <Search size={15} className="text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Buscar por destino, teléfono o notas…" className="w-full py-2 text-sm outline-none" />
        </label>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="rounded-xl border border-stone-300 px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => <option key={s} value={s}>{REQUEST_STATUS_LABEL[s]}</option>)}
        </select>
        <button onClick={load} className="rounded-xl bg-andino-700 px-4 py-2 text-sm font-bold text-white">Buscar</button>
      </div>
      <div className="mt-3 space-y-3">
        {rows.map((r) => (
          <div key={r.id} className={`rounded-xl border p-3 text-sm ${r.status === 'pending' ? 'border-amber-300 bg-amber-50/50' : 'border-stone-200'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <b>{r.requested_destination ?? '(sin destino)'}</b>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs">{REQUEST_STATUS_LABEL[r.status] ?? r.status}</span>
              <span className="ml-auto text-xs text-stone-400">{formatFechaHoraLima(r.created_at)} · {r.travelers_count} viajeros · {r.preferred_date ?? 'sin fecha'}</span>
            </div>
            <p className="mt-1 text-xs text-stone-500">ID: {r.id} · tel: {r.contact_phone ?? '—'} · notas: {r.additional_notes ?? '—'}</p>
            <div className="mt-2 flex flex-col sm:flex-row gap-2">
              <select value={r.status} onChange={(e) => setStatusRow(r, e.target.value)} className="rounded-lg border border-stone-300 px-2 py-1 text-sm">
                {STATUSES.map((s) => <option key={s} value={s}>{REQUEST_STATUS_LABEL[s]}</option>)}
              </select>
              <input value={note[r.id] ?? r.admin_notes ?? ''} onChange={(e) => setNote({ ...note, [r.id]: e.target.value })}
                placeholder="Comentario interno (no visible al cliente)…" className="flex-1 rounded-lg border border-stone-300 px-2 py-1 text-sm" />
              <button onClick={() => saveNote(r)} className="rounded-lg border border-stone-300 px-3 py-1 text-sm hover:bg-stone-50">Guardar nota</button>
            </div>

            {/* Logística del tour confirmado: alimenta el calendario del cliente */}
            {r.status === 'confirmed' && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Logística confirmada (visible en el calendario del cliente)</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-stone-600">
                    Fecha del tour
                    <input type="date" value={schedOf(r).confirmed_date}
                      onChange={(e) => setSched({ ...sched, [r.id]: { ...schedOf(r), confirmed_date: e.target.value } })}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1 text-sm" />
                  </label>
                  <label className="text-xs text-stone-600">
                    Hora de salida
                    <input type="time" value={schedOf(r).departure_time}
                      onChange={(e) => setSched({ ...sched, [r.id]: { ...schedOf(r), departure_time: e.target.value } })}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1 text-sm" />
                  </label>
                  <label className="text-xs text-stone-600 sm:col-span-2">
                    Punto de partida
                    <input value={schedOf(r).meeting_point} placeholder="Ej. Jr. Dos de Mayo 569 (oficina) o recojo en hotel"
                      onChange={(e) => setSched({ ...sched, [r.id]: { ...schedOf(r), meeting_point: e.target.value } })}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1 text-sm" />
                  </label>
                  <label className="text-xs text-stone-600 sm:col-span-2">
                    Instrucciones para el viajero
                    <textarea value={schedOf(r).departure_notes} rows={2} placeholder="Ej. Llevar abrigo, bloqueador, agua. Recojo 15 min antes."
                      onChange={(e) => setSched({ ...sched, [r.id]: { ...schedOf(r), departure_notes: e.target.value } })}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1 text-sm" />
                  </label>
                </div>
                <button onClick={() => saveSchedule(r)}
                  className="mt-2 rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors">
                  Guardar logística
                </button>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-stone-500">Sin resultados.</p>}
      </div>
      <div className="mt-3 flex gap-2">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40">← Anterior</button>
        <button onClick={() => setPage(page + 1)} className="rounded-lg border px-3 py-1 text-sm">Siguiente →</button>
      </div>
    </div>
  );
}

function ToursAdmin() {
  const [rows, setRows] = useState<Tour[]>([]);
  const [form, setForm] = useState<Partial<Tour>>({ title: '', slug: '', currency: 'PEN', is_published: false });
  const [images, setImages] = useState<TourImage[]>([]);
  const [imgUrl, setImgUrl] = useState('');
  const [imgCaption, setImgCaption] = useState('');
  const load = async () => {
    const { data } = await supabase.from('tours').select('*').order('title');
    setRows((data ?? []) as Tour[]);
  };
  const loadImages = async (tourId: string) => {
    const { data } = await supabase.from('tour_images').select('*').eq('tour_id', tourId).order('display_order');
    setImages((data ?? []) as TourImage[]);
  };
  useEffect(() => { load(); }, []);
  const edit = (t: Tour) => {
    setForm(t);
    setImgUrl(''); setImgCaption('');
    void loadImages(t.id);
  };
  const cancel = () => {
    setForm({ title: '', slug: '', currency: 'PEN', is_published: false });
    setImages([]); setImgUrl(''); setImgCaption('');
  };
  const save = async () => {
    if (!form.title || !form.slug) return alert('Título y slug son obligatorios.');
    if (form.id) {
      const { id, ...rest } = form;
      const { error } = await supabase.from('tours').update(rest).eq('id', id);
      if (error) return alert(error.message);
      void loadImages(id);
    } else {
      const { data, error } = await supabase.from('tours').insert(form).select('id').single();
      if (error) return alert(error.message);
      if (data) {
        // Si se indicó una imagen al crear, guárdala como primera referencia
        if (imgUrl.trim()) {
          await supabase.from('tour_images').insert({
            tour_id: (data as { id: string }).id,
            image_url: imgUrl.trim().slice(0, 2000),
            caption: imgCaption.trim() || null,
            display_order: images.length,
          });
        }
        const created = await supabase.from('tours').select('*').eq('id', (data as { id: string }).id).single();
        if (created.data) { edit(created.data as Tour); load(); return; }
      }
    }
    cancel();
    load();
  };
  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este tour?')) return;
    const { error } = await supabase.from('tours').delete().eq('id', id);
    if (!error) { if (form.id === id) cancel(); load(); } else alert(error.message);
  };
  const addImage = async () => {
    if (!form.id) return alert('Primero guarda el tour (botón Guardar) y luego agrega imágenes.');
    if (!imgUrl.trim()) return alert('Pega la URL de la imagen o elige una bundled (/tours/…).');
    const { error } = await supabase.from('tour_images').insert({
      tour_id: form.id,
      image_url: imgUrl.trim().slice(0, 2000),
      caption: imgCaption.trim() || null,
      display_order: images.length,
    });
    if (error) return alert(error.message);
    setImgUrl(''); setImgCaption('');
    void loadImages(form.id);
  };
  const removeImage = async (id: string) => {
    if (!confirm('¿Quitar esta imagen de la galería?')) return;
    const { error } = await supabase.from('tour_images').delete().eq('id', id);
    if (error) return alert(error.message);
    if (form.id) void loadImages(form.id);
  };
  const setCover = async (url: string) => {
    if (!form.id) return;
    const { error } = await supabase.from('tours').update({ image_url: url }).eq('id', form.id);
    if (error) return alert(error.message);
    setForm({ ...form, image_url: url });
    load();
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border bg-white p-4 text-sm">
        <h3 className="font-bold">{form.id ? 'Editar tour' : 'Nuevo tour'}</h3>
        <div className="mt-2 grid gap-2">
          <input placeholder="Título*" value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border px-2 py-1.5" />
          <input placeholder="slug (ej. cumbemayo)*" value={form.slug ?? ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="rounded-lg border px-2 py-1.5" />
          <input placeholder="Destino" value={form.destination ?? ''} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="rounded-lg border px-2 py-1.5" />
          <input placeholder="Duración (ej. Full day 8h)" value={form.duration ?? ''} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="rounded-lg border px-2 py-1.5" />
          <textarea placeholder="Descripción breve" value={form.short_description ?? ''} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className="rounded-lg border px-2 py-1.5" />
          <textarea placeholder="Descripción completa" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border px-2 py-1.5" rows={3} />
          <div className="flex gap-2">
            <input type="number" placeholder="Precio desde (PEN) — vacío = a confirmar" value={form.price_from ?? ''} onChange={(e) => setForm({ ...form, price_from: e.target.value === '' ? null : Number(e.target.value) })} className="flex-1 rounded-lg border px-2 py-1.5" />
            <input placeholder="Punto de encuentro" value={form.meeting_point ?? ''} onChange={(e) => setForm({ ...form, meeting_point: e.target.value })} className="flex-1 rounded-lg border px-2 py-1.5" />
          </div>
          <input placeholder="URL de imagen de portada (opcional)" value={form.image_url ?? ''} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="rounded-lg border px-2 py-1.5" />
          {form.image_url && (
            <img src={form.image_url} alt="Portada" className="h-28 w-full rounded-lg border object-cover" loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Publicado</label>
          <p className="text-xs text-stone-500">No publiques precios ni itinerarios de ejemplo como información real. Deja el precio vacío si no está autorizado.</p>

          {/* Apartado: imágenes de referencia del tour */}
          <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
            <h4 className="font-bold">🖼️ Imágenes de referencia del tour</h4>
            {!form.id && <p className="mt-1 text-xs text-stone-500">Guarda el tour primero y luego podrás agregar varias imágenes aquí.</p>}
            {form.id && (
              <>
                {images.length > 0 ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {images.map((im) => (
                      <div key={im.id} className="overflow-hidden rounded-lg border bg-white">
                        <img src={im.image_url} alt={im.caption ?? 'Referencia'} className="h-24 w-full object-cover" loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <p className="truncate px-2 pt-1 text-[11px] text-stone-500">{im.caption ?? '(sin descripción)'}</p>
                        <div className="flex gap-1 p-1.5">
                          <button onClick={() => void setCover(im.image_url)} title="Usar como portada"
                            className={`flex-1 rounded-md border px-1 py-1 text-[11px] ${form.image_url === im.image_url ? 'border-green-500 bg-green-50 font-bold text-green-700' : 'hover:bg-stone-50'}`}>
                            {form.image_url === im.image_url ? '★ Portada' : 'Portada'}
                          </button>
                          <button onClick={() => void removeImage(im.id)} title="Quitar"
                            className="rounded-md border px-2 py-1 text-[11px] text-red-700 hover:bg-red-50">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-stone-500">Aún no hay imágenes. Agrega la primera abajo.</p>
                )}
                <div className="mt-2 grid gap-1.5">
                  <select value={imgUrl.startsWith('/tours/') ? imgUrl : ''} onChange={(e) => setImgUrl(e.target.value)}
                    className="rounded-lg border bg-white px-2 py-1.5 text-xs">
                    <option value="">Elegir imagen bundled (/tours/…)…</option>
                    {BUNDLED_TOUR_IMAGES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input placeholder="…o pega URL de imagen (https://…)" value={imgUrl.startsWith('/tours/') ? '' : imgUrl}
                    onChange={(e) => setImgUrl(e.target.value)} className="rounded-lg border bg-white px-2 py-1.5" />
                  {imgUrl.startsWith('/tours/') && <p className="text-[11px] text-stone-500">Seleccionada: {imgUrl} (puedes editarla arriba si prefieres URL externa)</p>}
                  <input placeholder="Descripción de la imagen (ej. Flyer Full Day)" value={imgCaption}
                    onChange={(e) => setImgCaption(e.target.value)} className="rounded-lg border bg-white px-2 py-1.5" />
                  {(imgUrl || imgCaption) && imgUrl && (
                    <img src={imgUrl} alt="Vista previa" className="h-24 w-full rounded-lg border object-cover" loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <button onClick={() => void addImage()} className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-900">
                    + Agregar imagen de referencia
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={save} className="rounded-lg bg-andino-700 px-4 py-2 font-bold text-white">Guardar</button>
            {form.id && <button onClick={cancel} className="rounded-lg border px-4 py-2">Cancelar</button>}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((t) => (
          <div key={t.id} className="rounded-xl border bg-white p-3 text-sm flex items-center gap-2">
            {t.image_url
              ? <img src={t.image_url} alt="" className="h-10 w-14 rounded-md object-cover" loading="lazy" />
              : <span className="grid h-10 w-14 place-items-center rounded-md bg-andino-100">🏔️</span>}
            <div>
              <b>{t.title}</b> <span className="text-xs text-stone-400">/{t.slug} {t.is_published ? '· publicado' : '· borrador'}</span>
              <p className="text-xs text-stone-500">{t.destination} · {t.price_from != null ? `S/ ${t.price_from}` : 'precio a confirmar'}</p>
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => edit(t)} className="rounded-lg border px-2 py-1 text-xs">Editar</button>
              <button onClick={() => remove(t.id)} className="rounded-lg border px-2 py-1 text-xs text-red-700">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const BUNDLED_TOUR_IMAGES = [
  '/tours/collpa-flyer.png', '/tours/collpa-web.png',
  '/tours/cumbemayo-flyer.png', '/tours/cumbemayo-web.png',
  '/tours/granja-porcon-flyer.png', '/tours/granja-porcon-web.png',
  '/tours/namora-flyer.png', '/tours/namora-web.png',
  '/tours/norte-card.png', '/tours/norte-cierre.png',
  '/tours/otuzco-flyer.png', '/tours/otuzco-web.png',
  '/tours/yanamarca-flyer.png', '/tours/yanamarca-web.png',
  '/tours/wa-bus-01.jpg', '/tours/wa-bus-02.jpg', '/tours/wa-bus-03.jpg',
  '/tours/wa-bus-04.jpg', '/tours/wa-bus-05.jpg', '/tours/wa-bus-06.jpg',
  '/tours/wa-bus-07.jpg', '/tours/wa-bus-08.jpg', '/tours/wa-bus-09.jpg',
  '/tours/wa-cumbemayo-01.jpg', '/tours/wa-cumbemayo-02.jpg', '/tours/wa-cumbemayo-03.jpg',
  '/tours/wa-cumbemayo-04.jpg', '/tours/wa-cumbemayo-05.jpg', '/tours/wa-cumbemayo-06.jpg',
  '/tours/wa-cumbemayo-07.jpg', '/tours/wa-cumbemayo-08.jpg',
  '/tours/wa-flyer-01.jpg', '/tours/wa-flyer-02.jpg', '/tours/wa-flyer-03.jpg',
  '/tours/wa-flyer-04.jpg', '/tours/wa-flyer-05.jpg', '/tours/wa-flyer-06.jpg',
  '/tours/wa-flyer-07.jpg', '/tours/wa-flyer-08.jpg', '/tours/wa-flyer-09.jpg',
  '/tours/wa-namora-01.jpg', '/tours/wa-namora-02.jpg', '/tours/wa-namora-03.jpg',
  '/tours/wa-namora-04.jpg', '/tours/wa-namora-05.jpg', '/tours/wa-namora-06.jpg',
  '/tours/wa-namora-07.jpg', '/tours/wa-namora-08.jpg', '/tours/wa-namora-09.jpg',
  '/tours/wa-namora-10.jpg', '/tours/wa-namora-11.jpg', '/tours/wa-namora-12.jpg',
  '/tours/wa-namora-13.jpg', '/tours/wa-namora-14.jpg', '/tours/wa-namora-15.jpg',
  '/tours/wa-norte-01.jpg',
  '/tours/wa-porcon-01.jpg', '/tours/wa-porcon-02.jpg', '/tours/wa-porcon-03.jpg',
  '/tours/wa-porcon-04.jpg', '/tours/wa-porcon-05.jpg', '/tours/wa-porcon-06.jpg',
  '/tours/wa-porcon-07.jpg', '/tours/wa-porcon-08.jpg', '/tours/wa-porcon-09.jpg',
  '/tours/wa-porcon-10.jpg',
  '/tours/wa-yanamarca-01.jpg', '/tours/wa-yanamarca-02.jpg', '/tours/wa-yanamarca-03.jpg',
  '/tours/wa-yanamarca-04.jpg', '/tours/wa-yanamarca-05.jpg', '/tours/wa-yanamarca-06.jpg',
  '/tours/wa-yanamarca-07.jpg', '/tours/wa-yanamarca-08.jpg', '/tours/wa-yanamarca-09.jpg',
  '/tours/wa-yanamarca-10.jpg', '/tours/wa-yanamarca-11.jpg',
];

function FaqsAdmin() {
  const [rows, setRows] = useState<Faq[]>([]);
  const [form, setForm] = useState<Partial<Faq>>({ category: 'Reservas y confirmaciones', question: '', answer: '', is_published: true, display_order: 0 });
  const load = async () => {
    const { data } = await supabase.from('faqs').select('*').order('display_order');
    setRows((data ?? []) as Faq[]);
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!form.question || !form.answer) return alert('Pregunta y respuesta obligatorias.');
    if (form.id) {
      const { id, ...rest } = form;
      const { error } = await supabase.from('faqs').update(rest).eq('id', id);
      if (error) return alert(error.message);
    } else {
      const { error } = await supabase.from('faqs').insert(form);
      if (error) return alert(error.message);
    }
    setForm({ category: 'Reservas y confirmaciones', question: '', answer: '', is_published: true, display_order: 0 });
    load();
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border bg-white p-4 text-sm">
        <h3 className="font-bold">{form.id ? 'Editar FAQ' : 'Nueva FAQ'}</h3>
        <div className="mt-2 grid gap-2">
          <input placeholder="Categoría" value={form.category ?? ''} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border px-2 py-1.5" />
          <input placeholder="Pregunta" value={form.question ?? ''} onChange={(e) => setForm({ ...form, question: e.target.value })} className="rounded-lg border px-2 py-1.5" />
          <textarea placeholder="Respuesta" value={form.answer ?? ''} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={4} className="rounded-lg border px-2 py-1.5" />
          <input placeholder="Palabras clave (coma)" value={form.keywords ?? ''} onChange={(e) => setForm({ ...form, keywords: e.target.value })} className="rounded-lg border px-2 py-1.5" />
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Publicada</label>
          <div className="flex gap-2">
            <button onClick={save} className="rounded-lg bg-andino-700 px-4 py-2 font-bold text-white">Guardar</button>
            {form.id && <button onClick={() => setForm({ category: 'Reservas y confirmaciones', question: '', answer: '', is_published: true, display_order: 0 })} className="rounded-lg border px-4 py-2">Cancelar</button>}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((f) => (
          <div key={f.id} className="rounded-xl border bg-white p-3 text-sm">
            <b>{f.question}</b>
            <p className="text-xs text-stone-500">{f.category} · {f.is_published ? 'publicada' : 'oculta'}</p>
            <div className="mt-1 flex gap-2">
              <button onClick={() => setForm(f)} className="rounded-lg border px-2 py-1 text-xs">Editar</button>
              <button onClick={async () => {
                if (!confirm('¿Eliminar?')) return;
                const { error } = await supabase.from('faqs').delete().eq('id', f.id);
                if (!error) load(); else alert(error.message);
              }} className="rounded-lg border px-2 py-1 text-xs text-red-700">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsAdmin() {
  const [stats, setStats] = useState<{ status: string; count: number }[]>([]);
  const [top, setTop] = useState<{ requested_destination: string; count: number }[]>([]);
  const [unanswered, setUnanswered] = useState<{ content: string; created_at: string }[]>([]);
  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from('tour_requests').select('status');
      const map = new Map<string, number>();
      ((s ?? []) as { status: string }[]).forEach((r) => map.set(r.status, (map.get(r.status) ?? 0) + 1));
      setStats([...map.entries()].map(([status, count]) => ({ status, count })));
      const { data: d } = await supabase.from('tour_requests').select('requested_destination');
      const m2 = new Map<string, number>();
      ((d ?? []) as { requested_destination: string | null }[]).forEach((r) => {
        const k = r.requested_destination || '(sin destino)';
        m2.set(k, (m2.get(k) ?? 0) + 1);
      });
      setTop([...m2.entries()].map(([requested_destination, count]) => ({ requested_destination, count })).sort((a, b) => b.count - a.count).slice(0, 10));
      const { data: u } = await supabase.from('unanswered_questions').select('content,created_at').order('created_at', { ascending: false }).limit(20);
      setUnanswered((u ?? []) as { content: string; created_at: string }[]);
    })();
  }, []);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border bg-white p-4 text-sm">
        <h3 className="flex items-center gap-2 font-bold"><BarChart3 size={16} /> Solicitudes por estado</h3>
        <ul className="mt-2 space-y-1">
          {stats.map((s) => <li key={s.status} className="flex justify-between"><span>{REQUEST_STATUS_LABEL[s.status] ?? s.status}</span><b>{s.count}</b></li>)}
        </ul>
      </div>
      <div className="rounded-2xl border bg-white p-4 text-sm">
        <h3 className="font-bold">Destinos más solicitados</h3>
        <ul className="mt-2 space-y-1">
          {top.map((t) => <li key={t.requested_destination} className="flex justify-between"><span>{t.requested_destination}</span><b>{t.count}</b></li>)}
        </ul>
      </div>
      <div className="rounded-2xl border bg-white p-4 text-sm">
        <h3 className="font-bold">Preguntas no respondidas por el chatbot</h3>
        <ul className="mt-2 space-y-1 text-xs text-stone-600">
          {unanswered.map((u, i) => <li key={i} className="rounded-lg bg-stone-50 p-2">{u.content} <span className="text-stone-400">· {formatFechaHoraLima(u.created_at)}</span></li>)}
          {unanswered.length === 0 && <li>Sin registros. El backend guarda aquí lo que la IA no pudo responder.</li>}
        </ul>
      </div>
    </div>
  );
}
