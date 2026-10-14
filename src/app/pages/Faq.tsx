// Centro de ayuda: FAQs publicadas con buscador local.
import { useState } from 'react';
import { FaqList } from '../../features/faqs/components/FaqList';
import { BackButton } from '../../components/shared/BackButton';
import { useFaqs } from '../../lib/hooks';

export function FaqPage() {
  const { faqs } = useFaqs();
  const [q, setQ] = useState('');

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <BackButton to="/" label="Volver al inicio" className="mb-6" />
      <div className="max-w-2xl mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-andino-700">Centro de Ayuda</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight mt-1">
          Preguntas Frecuentes
        </h1>
        <p className="mt-2 text-stone-600 text-sm">
          Información sobre medios de pago, reservas, clima en Cajamarca y cancelaciones.
        </p>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por tema: pagos, niños, Cumbemayo, cancelaciones…"
          className="mt-4 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-800 shadow-sm focus:border-andino-500 focus:outline-none focus:ring-2 focus:ring-andino-500/20"
        />
      </div>

      <FaqList faqs={faqs} filter={q} />
    </main>
  );
}
