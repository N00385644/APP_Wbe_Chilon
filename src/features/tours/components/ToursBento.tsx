// Mosaico bento del catálogo de tours — adaptación del "interactive bento
// gallery" (21st.dev) al dominio real: cada pieza es un tour con destino,
// duración, precio y acceso al detalle. Decisiones frente al original:
//   · sin framer-motion: entrada, lift y zoom de imagen con CSS del
//     proyecto (clases `.bento-item` / `.bento-img` en index.css);
//   · sin drag para reordenar: el orden del catálogo es del servidor y
//     reordenar piezas localmente no aporta (además la rejilla es accesible);
//   · sin modal de medios ni dock: el detalle canónico es /tours/:slug.
// El hover queda tras `mouse:` (solo puntero fino) como el resto del sitio.
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin } from 'lucide-react';
import type { Tour } from '../../../lib/types';
import { formatPEN } from '../../../lib/format';

// Rejilla base del mosaico (se exporta para el esqueleto de carga).
export const BENTO_GRID_CLS =
  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 auto-rows-[230px] sm:auto-rows-[210px] lg:auto-rows-[215px]';

// Ritmo del mosaico, período 6 — verificado sin huecos intermedios en 1, 2 y
// 3 columnas para cualquier cantidad de piezas:
//   pieza 0 → grande desde sm (izquierda)
//   pieza 3 → grande solo en sm (en lg pasa a normal y cubre el hueco del centro)
//   pieza 4 → pequeña en sm, grande centrada en lg
// La descripción solo aparece en piezas grandes (donde hay aire real).
export function bentoTilePattern(i: number): { span: string; title: string; desc: string } {
  switch (i % 6) {
    case 0: return { span: 'sm:col-span-2 sm:row-span-2', title: 'sm:text-lg lg:text-xl', desc: 'hidden sm:line-clamp-2' };
    case 3: return { span: 'sm:col-span-2 sm:row-span-2 lg:col-span-1 lg:row-span-1', title: 'sm:text-lg lg:text-base', desc: 'hidden sm:line-clamp-2 lg:hidden' };
    case 4: return { span: 'lg:col-span-2 lg:row-span-2', title: 'lg:text-lg', desc: 'hidden lg:line-clamp-2' };
    default: return { span: '', title: '', desc: 'hidden' };
  }
}

function BentoTile({ tour, index }: { tour: Tour; index: number }) {
  const { span, title, desc } = bentoTilePattern(index);
  return (
    <Link
      to={`/tours/${tour.slug}`}
      aria-label={`Ver detalle de ${tour.title}`}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      className={`bento-item group relative block overflow-hidden rounded-2xl bg-andino-900 ring-1 ring-stone-900/5 shadow-3d-card outline-offset-2 transition-[transform,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-oro-500 mouse:hover:-translate-y-1 mouse:hover:shadow-3d-card-hover active:scale-[0.985] ${span}`}
    >
      {/* Portada */}
      {tour.image_url ? (
        <img
          src={tour.image_url}
          alt=""
          loading="lazy"
          className="bento-img absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden className="grid h-full w-full place-items-center bg-gradient-to-br from-andino-800 to-andino-900 text-5xl">
          🏔️
        </span>
      )}

      {/* Gradiente de lectura + refuerzo al interactuar */}
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
      <span
        aria-hidden
        className="absolute inset-0 bg-transparent transition-colors duration-220 mouse:group-hover:bg-black/15 group-focus-visible:bg-black/15"
      />

      {/* Insignias superiores: el destino trunca antes que la duración */}
      <span className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        {tour.destination && (
          <span className="badge-destino min-w-0">
            <MapPin size={12} className="shrink-0 text-andino-600" aria-hidden />
            <span className="truncate">{tour.destination}</span>
          </span>
        )}
        {tour.duration && (
          <span className="inline-flex max-w-[60%] shrink-0 items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white shadow-md backdrop-blur-md">
            <Clock size={12} className="shrink-0 text-amber-300" aria-hidden />
            <span className="truncate">{tour.duration}</span>
          </span>
        )}
      </span>

      {/* Bloque inferior: título, descripción (solo piezas grandes), precio y CTA */}
      <span className="absolute inset-x-0 bottom-0 block p-3.5 sm:p-4">
        <span className={`block font-extrabold text-balance text-white line-clamp-2 ${title}`}>
          {tour.title}
        </span>
        <span className={`mt-1.5 text-xs leading-relaxed text-white/75 ${desc}`}>
          {tour.short_description ?? tour.description}
        </span>

        <span className="mt-2.5 flex items-end justify-between gap-3">
          <span className="block">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/60">Desde</span>
            <span className="block text-base font-extrabold tracking-tight text-white sm:text-lg">
              {formatPEN(tour.price_from)}
            </span>
          </span>
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition-[background-color,color,transform] duration-160 mouse:group-hover:bg-white mouse:group-hover:text-andino-800 group-focus-visible:bg-white group-focus-visible:text-andino-800 group-active:scale-90"
          >
            <ArrowRight size={16} className="transition-transform duration-160 mouse:group-hover:translate-x-px" />
          </span>
        </span>
      </span>
    </Link>
  );
}

export function ToursBento({ tours, className = '' }: { tours: Tour[]; className?: string }) {
  return (
    <div className={`${BENTO_GRID_CLS} ${className}`.trim()}>
      {tours.map((t, i) => (
        <BentoTile key={t.id} tour={t} index={i} />
      ))}
    </div>
  );
}
