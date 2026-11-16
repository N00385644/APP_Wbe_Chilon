// Catálogo y detalle de tours (lectura pública vía hooks centralizados).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Clock, CalendarDays, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { ToursBento, BENTO_GRID_CLS, bentoTilePattern } from '../../features/tours/components/ToursBento';
import { BackButton } from '../../components/shared/BackButton';
import { SearchBar } from '../../components/shared/SearchBar';
import { useTourImages, useTours } from '../../lib/hooks';
import { formatPEN } from '../../lib/format';
import { siteTitle, useDocumentMeta } from '../../lib/seo';

export function Tours() {
  const { tours, loading, error } = useTours();
  const [q, setQ] = useState('');
  useDocumentMeta(
    siteTitle('Tours y circuitos en Cajamarca'),
    'Catálogo de tours en Cajamarca, Perú: Cumbemayo, Ventanillas de Otuzco, Granja Porcón, Baños del Inca y más. Consulta precios y reserva por WhatsApp.',
    '/tours',
  );

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return tours.filter((t) => {
      if (!s) return true;
      return `${t.title} ${t.destination} ${t.description}`.toLowerCase().includes(s);
    });
  }, [tours, q]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <BackButton to="/" label="Volver al inicio" className="mb-6" />
      <div className="max-w-2xl mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-andino-700">Catálogo Completo</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight mt-1">
          Tours y Circuitos en Cajamarca
        </h1>
        <p className="mt-2 text-stone-600 text-sm sm:text-base">
          Encuentra el tour perfecto según tus intereses: arqueología, aguas termales, ecoturismo o historia.
        </p>

        <SearchBar
          id="buscar-tour"
          className="mt-5"
          value={q}
          onChange={setQ}
          label="Buscar tours por destino o actividad"
          placeholder="Buscar por destino o actividad… (ej. Cumbemayo, Otuzco, Porcón)"
          withLogo
          resultsId="resultados-tours"
        />
      </div>

      {!loading && !error && (
        <p id="resultados-tours" role="status" aria-live="polite" className="mb-4 scroll-mt-24 text-xs font-semibold text-stone-500 tabular-nums">
          Mostrando {list.length} de {tours.length} circuito{tours.length === 1 ? '' : 's'}
        </p>
      )}

      {error ? <p role="alert" className="alert-error p-4">No pudimos cargar los tours. Recarga la página o consúltanos por WhatsApp.</p> : loading ? (
        <div role="status" aria-live="polite" className={BENTO_GRID_CLS}>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div key={n} className={`skeleton bg-white/60 ${bentoTilePattern(n).span}`} />
          ))}
          <p className="sr-only">Cargando tours…</p>
        </div>
      ) : (
        <ToursBento tours={list} />
      )}

      {!loading && !error && list.length === 0 && (
        <div role="status" className="empty-state bg-white">
          <p className="text-sm font-bold text-stone-800">No encontramos ningún tour que coincida con tu búsqueda.</p>
          <p className="mt-1 text-xs text-stone-500">Prueba con “Cumbemayo”, “Otuzco” o “Porcón”.</p>
          <button
            onClick={() => setQ('')}
            className="mt-3 min-h-11 text-sm font-bold text-andino-700 underline underline-offset-4 hover:text-andino-800"
          >
            Limpiar búsqueda
          </button>
        </div>
      )}
    </main>
  );
}

export function TourDetail() {
  const { slug } = useParams();
  const { tours, loading, error } = useTours();
  const t = tours.find((x) => x.slug === slug);
  const { images } = useTourImages(t?.id);
  const [lb, setLb] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useDocumentMeta(
    t ? siteTitle(`Tour ${t.title}`) : siteTitle('Tour'),
    t?.short_description ?? 'Tour en Cajamarca con Turismo Chilón.',
    `/tours/${slug ?? ''}`,
  );

  // Galería ampliable: portada + fotos adicionales, sin duplicar la portada.
  const slides = useMemo(() => {
    const arr: { url: string; caption: string | null }[] = [];
    if (t?.image_url) arr.push({ url: t.image_url, caption: null });
    for (const im of images) {
      if (!im.image_url || im.image_url === t?.image_url) continue;
      arr.push({ url: im.image_url, caption: im.caption ?? null });
    }
    return arr;
  }, [t, images]);
  const open = lb !== null;

  // Bloqueo de scroll + foco inicial al abrir (no se re-enfoca en cada foto).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Teclado: Esc cierra y las flechas navegan entre fotos.
  useEffect(() => {
    if (!open) return;
    const total = Math.max(1, slides.length);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLb(null);
      else if (e.key === 'ArrowRight') setLb((i) => (i === null ? i : (i + 1) % total));
      else if (e.key === 'ArrowLeft') setLb((i) => (i === null ? i : (i - 1 + total) % total));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, slides.length]);

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-stone-500">Cargando detalles del tour…</main>;
  if (error) return <main className="mx-auto max-w-4xl px-4 py-16"><BackButton to="/tours" label="Volver al catálogo" /><p role="alert" className="alert-error mt-4 p-4">No pudimos cargar el tour. Recarga la página e inténtalo de nuevo.</p></main>;
  if (!t) return (
    <main className="mx-auto max-w-4xl px-4 py-16 text-center">
      <BackButton to="/tours" label="Volver al catálogo" className="mb-6" />
      <h1 className="text-xl font-bold text-stone-800">Tour no encontrado</h1>
      <p className="mt-2 text-sm text-stone-500">El tour que buscas no existe o ha sido despublicado.</p>
    </main>
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <BackButton to="/tours" label="Volver al catálogo" className="mb-5" />
      {/* Portada */}
      <div className="relative overflow-hidden rounded-3xl shadow-xl h-72 sm:h-96 w-full bg-stone-900">
        {t.image_url ? (
          <img src={t.image_url} alt={t.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-andino-900 text-6xl">🏔️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {t.image_url && (
          <button
            type="button"
            onClick={() => setLb(0)}
            aria-label={`Ampliar portada (1 de ${Math.max(1, slides.length)})`}
            className="absolute right-4 top-4 grid h-10 w-10 cursor-zoom-in place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md transition-[background-color,transform] duration-160 hover:bg-black/65 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            <Maximize2 size={16} />
          </button>
        )}
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <span className="inline-block px-3 py-1 rounded-full glass-badge text-amber-300 text-xs font-bold mb-2">
            {t.destination ?? 'Cajamarca'}
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{t.title}</h1>
        </div>
      </div>

      {/* Galería ampliable (portada + fotos adicionales) */}
      {slides.length > 1 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {slides.slice(1).map((s, i) => (
            <button
              key={`${s.url}-${i}`}
              type="button"
              onClick={() => setLb(i + 1)}
              aria-label={`Ampliar foto ${i + 2} de ${slides.length}${s.caption ? `: ${s.caption}` : ''}`}
              className="group cursor-zoom-in overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-andino-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-andino-600"
            >
              <img src={s.url} alt={s.caption ?? t.title} loading="lazy" className="card-img-zoom h-28 w-full object-cover" />
              {s.caption && <span className="block truncate px-2 py-1 text-[11px] text-stone-500">{s.caption}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Meta e Info rápida */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div className="flex flex-wrap gap-4 text-sm text-stone-600">
          {t.destination && <span className="inline-flex items-center gap-1.5 font-medium"><MapPin size={16} className="text-andino-600" /> {t.destination}</span>}
          {t.duration && <span className="inline-flex items-center gap-1.5 font-medium"><Clock size={16} className="text-amber-600" /> {t.duration}</span>}
          {t.meeting_point && <span className="inline-flex items-center gap-1.5 font-medium"><CalendarDays size={16} className="text-teal-600" /> Salida: {t.meeting_point}</span>}
        </div>
        <div>
          <span className="block text-xs font-medium text-stone-400 text-right uppercase">Tarifa por persona</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-andino-800">{formatPEN(t.price_from)}</span>
        </div>
      </div>

      {/* Descripción e Itinerario */}
      {t.description && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-stone-900">Sobre la experiencia</h2>
          <p className="mt-2 whitespace-pre-wrap text-stone-700 leading-relaxed text-sm sm:text-base">{t.description}</p>
        </div>
      )}

      {t.itinerary && (
        <div className="mt-6 rounded-2xl bg-stone-50 p-6 border border-stone-200">
          <h2 className="font-bold text-stone-900 text-base">Itinerario y Rutas</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-stone-600 leading-relaxed">{t.itinerary}</p>
        </div>
      )}

      {/* Incluye / No Incluye */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
        {t.includes && (
          <div className="rounded-2xl bg-emerald-50/70 p-5 border border-emerald-100">
            <b className="text-emerald-900 block mb-2 font-bold">✓ El tour incluye:</b>
            <p className="whitespace-pre-wrap text-emerald-800/90 leading-relaxed text-xs sm:text-sm">{t.includes}</p>
          </div>
        )}
        {t.excludes && (
          <div className="rounded-2xl bg-amber-50/70 p-5 border border-amber-100">
            <b className="text-amber-900 block mb-2 font-bold">✕ No incluye:</b>
            <p className="whitespace-pre-wrap text-amber-800/90 leading-relaxed text-xs sm:text-sm">{t.excludes}</p>
          </div>
        )}
      </div>

      {t.recommendations && (
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-bold text-stone-900 mb-2">Recomendaciones del guía</h2>
          <p className="whitespace-pre-wrap text-sm text-stone-600 leading-relaxed">{t.recommendations}</p>
        </div>
      )}

      {/* Banner de Acción y Asistente */}
      <div className="mt-8 rounded-2xl bg-gradient-to-r from-andino-700 to-andino-900 p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg">¿Deseas reservar este tour?</h3>
          <p className="text-xs sm:text-sm text-white/80 mt-1">Abre nuestro asistente virtual en la esquina inferior para cotizar al instante.</p>
        </div>
        <a
          href={`https://wa.me/51901195392?text=${encodeURIComponent(`Hola Turismo Chilón, deseo cotizar el tour: ${t.title}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-3d shrink-0 rounded-xl bg-white px-5 py-2.5 font-bold text-andino-900 hover:bg-stone-100 text-sm shadow-md"
        >
          Cotizar por WhatsApp
        </a>
      </div>

      {/* Lightbox de la galería: overlay con foco, Esc y flechas */}
      {open && lb !== null && slides[lb] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Galería de ${t.title}: foto ${lb + 1} de ${slides.length}`}
          onClick={() => setLb(null)}
          className="fade-enter fixed inset-0 z-[70] flex flex-col bg-black/90 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <span className="text-xs font-bold tabular-nums text-white/70">{lb + 1} / {slides.length}</span>
            <button
              ref={closeRef}
              type="button"
              onClick={(e) => { e.stopPropagation(); setLb(null); }}
              aria-label="Cerrar galería"
              className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-[background-color,transform] duration-160 hover:bg-white/20 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-2 pb-2 sm:px-16" onClick={(e) => e.stopPropagation()}>
            <img
              key={slides[lb].url}
              src={slides[lb].url}
              alt={slides[lb].caption ?? t.title}
              className="enter-pop max-h-[76vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setLb((i) => (i === null ? i : (i - 1 + slides.length) % slides.length))}
                  aria-label="Foto anterior"
                  className="absolute left-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-[background-color,transform] duration-160 hover:bg-white/20 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:left-4"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={() => setLb((i) => (i === null ? i : (i + 1) % slides.length))}
                  aria-label="Foto siguiente"
                  className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-[background-color,transform] duration-160 hover:bg-white/20 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:right-4"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>

          {slides[lb].caption && (
            <p className="px-4 pb-5 text-center text-xs text-white/70" onClick={(e) => e.stopPropagation()}>
              {slides[lb].caption}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
