// Centro de ayuda: FAQs publicadas con buscador local.
import { useState } from 'react';
import { FaqList } from '../../features/faqs/components/FaqList';
import { BackButton } from '../../components/shared/BackButton';
import { SearchBar } from '../../components/shared/SearchBar';
import { useFaqs } from '../../lib/hooks';

export function FaqPage() {
  const { faqs, loading, error } = useFaqs();
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

        <SearchBar
          id="buscar-faq"
          className="mt-4"
          value={q}
          onChange={setQ}
          label="Buscar preguntas frecuentes por tema"
          placeholder="Buscar por tema: pagos, niños, Cumbemayo, cancelaciones…"
          withLogo
          resultsId="lista-faq"
        />
      </div>

      <div id="lista-faq" className="scroll-mt-24">
        {error ? <p role="alert" className="alert-error p-4">No pudimos cargar las preguntas. Recarga la página o consúltanos por WhatsApp.</p>
          : loading ? <p role="status" className="text-sm text-stone-500">Cargando preguntas…</p>
            : <FaqList faqs={faqs} filter={q} />}
      </div>
    </main>
  );
}
