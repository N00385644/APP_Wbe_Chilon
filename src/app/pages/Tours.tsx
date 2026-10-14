// Catálogo y detalle de tours (lectura pública vía hooks centralizados).
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Clock, CalendarDays } from 'lucide-react';
import { TourCard } from '../../features/tours/components/TourCard';
import { BackButton } from '../../components/shared/BackButton';
import { useTourImages, useTours } from '../../lib/hooks';
import { formatPEN } from '../../lib/format';

export function Tours() {
  const { tours, loading } = useTours();
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tours;
    return tours.filter((t) => `${t.title} ${t.destination} ${t.description}`.toLowerCase().includes(s));
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

        <div className="mt-5 relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por destino o actividad… (ej. Cumbemayo, Otuzco, Porcón)"
            className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-800 placeholder-stone-400 shadow-sm focus:border-andino-500 focus:outline-none focus:ring-2 focus:ring-andino-500/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-80 rounded-2xl border border-stone-200 bg-white/60 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t, i) => (
            <TourCard key={t.id} tour={t} index={i} />
          ))}
        </div>
      )}

      {!loading && list.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 p-12 text-center bg-white">
          <p className="text-stone-500 text-sm">No encontramos ningún tour que coincida con tu búsqueda.</p>
          <button
            onClick={() => setQ('')}
            className="mt-3 text-sm font-bold text-andino-700 underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </main>
  );
}

export function TourDetail() {
  const { slug } = useParams();
  const { tours, loading } = useTours();
  const t = tours.find((x) => x.slug === slug);
  const { images } = useTourImages(t?.id);

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-stone-500">Cargando detalles del tour…</main>;
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
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <span className="inline-block px-3 py-1 rounded-full glass-badge text-amber-300 text-xs font-bold mb-2">
            {t.destination ?? 'Cajamarca'}
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{t.title}</h1>
        </div>
      </div>

      {/* Galería adicional si existe */}
      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((im) => (
            <figure key={im.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm hover:scale-102 transition-transform">
              <img src={im.image_url} alt={im.caption ?? t.title} loading="lazy" className="h-28 w-full object-cover" />
              {im.caption && <figcaption className="px-2 py-1 text-[11px] text-stone-500 truncate">{im.caption}</figcaption>}
            </figure>
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
          className="btn-3d shrink-0 rounded-xl bg-white px-5 py-2.5 font-bold text-andino-900 hover:bg-stone-100 transition-all text-sm shadow-md"
        >
          Cotizar por WhatsApp
        </a>
      </div>
    </main>
  );
}
