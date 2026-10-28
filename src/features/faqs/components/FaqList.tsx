// Lista visual de preguntas frecuentes (presentación pura).
import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import type { Faq } from '../../../lib/types';

export function FaqList({ faqs, filter }: { faqs: Faq[]; filter: string }) {
  const q = filter.trim().toLowerCase();
  const list = q
    ? faqs.filter((f) => `${f.question} ${f.answer} ${f.category} ${f.keywords ?? ''}`.toLowerCase().includes(q))
    : faqs;
  const [open, setOpen] = useState<string | null>(null);

  if (!list.length) {
    return (
      <div role="status" className="empty-state bg-white/50">
        <p className="text-sm font-semibold text-stone-700">No se encontraron preguntas para esa búsqueda.</p>
        <p className="mt-1 text-xs text-stone-500">Prueba con “pago”, “horario” o “cancelación”, o consúltanos por WhatsApp.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {list.map((f) => {
        const isOpen = open === f.id;
        return (
          <div
            key={f.id}
            className={`rounded-2xl border transition-[border-color,background-color,box-shadow] duration-200 overflow-hidden ${
              isOpen
                ? 'border-andino-300 bg-white shadow-md ring-2 ring-andino-500/10'
                : 'border-stone-200/90 bg-white hover:border-stone-300 hover:shadow-sm'
            }`}
          >
            <button
              onClick={() => setOpen(isOpen ? null : f.id)}
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${f.id}`}
              className="w-full px-4 sm:px-5 py-3.5 text-left flex items-start justify-between gap-3 rounded-2xl focus-visible:outline-2 focus-visible:outline-andino-600 min-h-12"
            >
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-andino-600 mb-1">
                  <Sparkles size={11} className="text-amber-500" /> {f.category}
                </span>
                <span className="block font-bold text-stone-800 text-sm sm:text-base leading-snug">
                  {f.question}
                </span>
              </div>
              <span className={`grid place-items-center w-7 h-7 rounded-xl bg-stone-100 text-stone-500 shrink-0 transition-[transform,background-color,color] duration-300 ${isOpen ? 'rotate-180 bg-andino-100 text-andino-700' : ''}`}>
                <ChevronDown size={16} />
              </span>
            </button>
            <div
              id={`faq-panel-${f.id}`}
              role="region"
              aria-label={f.question}
              aria-hidden={!isOpen}
              data-open={isOpen}
              className="disclosure"
            >
              <div>
                <div className="disclosure-body border-t border-stone-100/80 px-4 sm:px-5 pb-4 pt-3 text-sm text-stone-600 leading-relaxed">
                  <p className="whitespace-pre-wrap">{f.answer}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
