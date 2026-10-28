import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Tour, TourImage } from '../../../lib/types';

const inputCls = 'min-h-11 rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-sm';

export function ToursAdmin() {
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
          <input aria-label="Título del tour" placeholder="Título*" value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
          <input aria-label="Slug del tour" placeholder="slug (ej. cumbemayo)*" value={form.slug ?? ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputCls} />
          <input aria-label="Destino del tour" placeholder="Destino" value={form.destination ?? ''} onChange={(e) => setForm({ ...form, destination: e.target.value })} className={inputCls} />
          <input aria-label="Duración del tour" placeholder="Duración (ej. Full day 8h)" value={form.duration ?? ''} onChange={(e) => setForm({ ...form, duration: e.target.value })} className={inputCls} />
          <textarea aria-label="Descripción breve" placeholder="Descripción breve" value={form.short_description ?? ''} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className={inputCls} />
          <textarea aria-label="Descripción completa" placeholder="Descripción completa" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={3} />
          <div className="flex gap-2">
            <input aria-label="Precio desde en soles" type="number" placeholder="Precio desde (PEN) — vacío = a confirmar" value={form.price_from ?? ''} onChange={(e) => setForm({ ...form, price_from: e.target.value === '' ? null : Number(e.target.value) })} className={`flex-1 ${inputCls}`} />
            <input aria-label="Punto de encuentro del tour" placeholder="Punto de encuentro" value={form.meeting_point ?? ''} onChange={(e) => setForm({ ...form, meeting_point: e.target.value })} className={`flex-1 ${inputCls}`} />
          </div>
          <input aria-label="URL de imagen de portada" placeholder="URL de imagen de portada (opcional)" value={form.image_url ?? ''} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className={inputCls} />
          {form.image_url && (
            <img src={form.image_url} alt="Portada" className="h-28 w-full rounded-lg border object-cover" loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={!!form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Publicado</label>
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
                          <button onClick={() => void setCover(im.image_url)} title="Usar como portada" aria-label={`Usar como portada: ${im.caption ?? im.image_url}`}
                            className={`min-h-11 flex-1 rounded-md border px-1 py-1 text-[11px] ${form.image_url === im.image_url ? 'border-green-700 bg-green-50 font-bold text-green-800' : 'hover:bg-stone-50'}`}>
                            {form.image_url === im.image_url ? '★ Portada' : 'Portada'}
                          </button>
                          <button onClick={() => void removeImage(im.id)} title="Quitar" aria-label={`Quitar imagen: ${im.caption ?? im.image_url}`}
                            className="min-h-11 rounded-md border px-2 py-1 text-[11px] text-red-700 hover:bg-red-50">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-stone-500">Aún no hay imágenes. Agrega la primera abajo.</p>
                )}
                <div className="mt-2 grid gap-1.5">
                  <select aria-label="Elegir imagen bundled" value={imgUrl.startsWith('/tours/') ? imgUrl : ''} onChange={(e) => setImgUrl(e.target.value)}
                    className={`${inputCls} text-xs`}>
                    <option value="">Elegir imagen bundled (/tours/…)…</option>
                    {BUNDLED_TOUR_IMAGES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input aria-label="URL de la imagen de referencia" placeholder="…o pega URL de imagen (https://…)" value={imgUrl.startsWith('/tours/') ? '' : imgUrl}
                    onChange={(e) => setImgUrl(e.target.value)} className={inputCls} />
                  {imgUrl.startsWith('/tours/') && <p className="text-[11px] text-stone-500">Seleccionada: {imgUrl} (puedes editarla arriba si prefieres URL externa)</p>}
                  <input aria-label="Descripción de la imagen" placeholder="Descripción de la imagen (ej. Flyer Full Day)" value={imgCaption}
                    onChange={(e) => setImgCaption(e.target.value)} className={inputCls} />
                  {(imgUrl || imgCaption) && imgUrl && (
                    <img src={imgUrl} alt="Vista previa" className="h-24 w-full rounded-lg border object-cover" loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <button onClick={() => void addImage()} className="min-h-11 rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-900">
                    + Agregar imagen de referencia
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={save} className="min-h-11 rounded-lg bg-andino-700 px-4 py-2 font-bold text-white">Guardar</button>
            {form.id && <button onClick={cancel} className="min-h-11 rounded-lg border px-4 py-2">Cancelar</button>}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-xl border bg-white p-3 text-sm">
            {t.image_url
              ? <img src={t.image_url} alt="" className="h-10 w-14 rounded-md object-cover" loading="lazy" />
              : <span className="grid h-10 w-14 place-items-center rounded-md bg-andino-100">🏔️</span>}
            <div>
              <b>{t.title}</b> <span className="text-xs text-stone-400">/{t.slug} {t.is_published ? '· publicado' : '· borrador'}</span>
              <p className="text-xs text-stone-500">{t.destination} · {t.price_from != null ? `S/ ${t.price_from}` : 'precio a confirmar'}</p>
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => edit(t)} className="min-h-11 rounded-lg border px-2 py-1 text-xs">Editar</button>
              <button onClick={() => remove(t.id)} className="min-h-11 rounded-lg border px-2 py-1 text-xs text-red-700">Eliminar</button>
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
