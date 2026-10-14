// Tarjeta visual de tour (presentación pura, sin acceso a datos).
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, ArrowRight } from 'lucide-react';
import type { Tour } from '../../../lib/types';
import { formatPEN } from '../../../lib/format';

export function TourCard({ tour, index = 0 }: { tour: Tour; index?: number }) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const raf = useRef(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // rAF throttle: evita re-render por cada pixel (jank)
    cancelAnimationFrame(raf.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    raf.current = requestAnimationFrame(() => setCoords({ x, y }));
  };

  // Emil: hover sutil (tens/día → reducir). 5deg máx, 200ms ease-out, -4px lift.
  const rotX = isHovered ? -coords.y * 10 : 0;
  const rotY = isHovered ? coords.x * 10 : 0;

  return (
    <div className="perspective-1000">
      <article
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setCoords({ x: 0, y: 0 }); }}
        style={{
          transform: `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) ${isHovered ? 'translateY(-4px)' : ''}`,
          animationDelay: `${Math.min(index, 8) * 50}ms`,
        }}
        className="stagger-item group relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-3d-card hover:shadow-3d-card-hover preserve-3d tilt-card focus-within:ring-2 focus-within:ring-andino-500/30"
      >
        {/* Contenedor de Imagen con Zoom y Brillo */}
        <div className="relative h-48 w-full overflow-hidden bg-andino-950">
          {tour.image_url ? (
            <img
              src={tour.image_url}
              alt={tour.title}
              loading="lazy"
              className="card-img-zoom h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-andino-800 to-andino-950 text-5xl text-white">
              🏔️
            </div>
          )}

          {/* Gradiente de sombra sobre la imagen */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

          {/* Insignia de Destino Flotante */}
          {tour.destination && (
            <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-stone-800 shadow-md">
              <MapPin size={12} className="text-andino-600" />
              <span>{tour.destination}</span>
            </div>
          )}

          {/* Insignia de Duración */}
          {tour.duration && (
            <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-white shadow-md">
              <Clock size={12} className="text-amber-300" />
              <span>{tour.duration}</span>
            </div>
          )}
        </div>

        {/* Cuerpo de la Tarjeta */}
        <div className="p-4 sm:p-5">
          <h3 className="font-extrabold text-stone-900 text-base sm:text-lg group-hover:text-andino-700 transition-colors line-clamp-1">
            {tour.title}
          </h3>

          <p className="mt-1.5 text-xs sm:text-sm text-stone-500 line-clamp-2 leading-relaxed">
            {tour.short_description ?? tour.description}
          </p>

          {/* Separador sutil */}
          <div className="mt-4 pt-3.5 border-t border-stone-100 flex items-center justify-between">
            <div>
              <span className="block text-[11px] font-medium text-stone-400 uppercase tracking-wider">Desde</span>
              <span className="text-lg sm:text-xl font-extrabold text-andino-800 tracking-tight">
                {formatPEN(tour.price_from)}
              </span>
            </div>

            <Link
              to={`/tours/${tour.slug}`}
              className="btn-3d inline-flex items-center gap-1.5 rounded-xl bg-andino-700 px-3.5 py-2 text-xs sm:text-sm font-bold text-white hover:bg-andino-800 transition-all active:scale-95 shadow-sm"
            >
              <span>Ver detalle</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
