import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Faq } from '../../../lib/types';

const inputCls = 'min-h-11 rounded-lg border border-stone-300 px-2.5 py-2 text-sm';

export function FaqsAdmin() {
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
          <input aria-label="Categoría de la FAQ" placeholder="Categoría" value={form.category ?? ''} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls} />
          <input aria-label="Pregunta frecuente" placeholder="Pregunta" value={form.question ?? ''} onChange={(e) => setForm({ ...form, question: e.target.value })} className={inputCls} />
          <textarea aria-label="Respuesta de la FAQ" placeholder="Respuesta" value={form.answer ?? ''} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={4} className={inputCls} />
          <input aria-label="Palabras clave separadas por coma" placeholder="Palabras clave (coma)" value={form.keywords ?? ''} onChange={(e) => setForm({ ...form, keywords: e.target.value })} className={inputCls} />
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={!!form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Publicada</label>
          <div className="flex gap-2">
            <button onClick={save} className="min-h-11 rounded-lg bg-andino-700 px-4 py-2 font-bold text-white">Guardar</button>
            {form.id && <button onClick={() => setForm({ category: 'Reservas y confirmaciones', question: '', answer: '', is_published: true, display_order: 0 })} className="min-h-11 rounded-lg border px-4 py-2">Cancelar</button>}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((f) => (
          <div key={f.id} className="rounded-xl border bg-white p-3 text-sm">
            <b>{f.question}</b>
            <p className="text-xs text-stone-500">{f.category} · {f.is_published ? 'publicada' : 'oculta'}</p>
            <div className="mt-1 flex gap-2">
              <button onClick={() => setForm(f)} className="min-h-11 rounded-lg border px-2 py-1 text-xs">Editar</button>
              <button onClick={async () => {
                if (!confirm('¿Eliminar?')) return;
                const { error } = await supabase.from('faqs').delete().eq('id', f.id);
                if (!error) load(); else alert(error.message);
              }} className="min-h-11 rounded-lg border px-2 py-1 text-xs text-red-700">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
