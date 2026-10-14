import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Users, ChevronDown, Sparkles, ArrowRight } from 'lucide-react';
import type { Faq, Tour } from '../lib/types';
import { formatPEN } from '../lib/format';

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

export function FaqList({ faqs, filter }: { faqs: Faq[]; filter: string }) {
  const q = filter.trim().toLowerCase();
  const list = q
    ? faqs.filter((f) => `${f.question} ${f.answer} ${f.category} ${f.keywords ?? ''}`.toLowerCase().includes(q))
    : faqs;
  const [open, setOpen] = useState<string | null>(null);

  if (!list.length) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center bg-white/50">
        <p className="text-sm text-stone-500">No se encontraron preguntas para esa búsqueda.</p>
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
            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
              isOpen 
                ? 'border-andino-300 bg-white shadow-md ring-2 ring-andino-500/10' 
                : 'border-stone-200/90 bg-white hover:border-stone-300 hover:shadow-sm'
            }`}
          >
            <button 
              onClick={() => setOpen(isOpen ? null : f.id)} 
              className="w-full px-4 sm:px-5 py-3.5 text-left flex items-start justify-between gap-3"
            >
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-andino-600 mb-1">
                  <Sparkles size={11} className="text-amber-500" /> {f.category}
                </span>
                <span className="block font-bold text-stone-800 text-sm sm:text-base leading-snug">
                  {f.question}
                </span>
              </div>
              <span className={`grid place-items-center w-7 h-7 rounded-xl bg-stone-100 text-stone-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-andino-100 text-andino-700' : ''}`}>
                <ChevronDown size={16} />
              </span>
            </button>
            {isOpen && (
              <div className="px-4 sm:px-5 pb-4 pt-1 text-sm text-stone-600 leading-relaxed border-t border-stone-100/80 animate-fade-up">
                <p className="whitespace-pre-wrap">{f.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TravelersInput({ adults, children, onChange }: {
  adults: number; children: number;
  onChange: (a: number, c: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm bg-stone-50 p-3 rounded-xl border border-stone-200">
      <label className="inline-flex items-center gap-2 font-medium text-stone-700">
        <Users size={16} className="text-andino-600" /> Adultos
        <input 
          type="number" 
          min={1} 
          max={50} 
          value={adults}
          onChange={(e) => onChange(Number(e.target.value), children)}
          className="w-16 rounded-lg border border-stone-300 bg-white px-2 py-1 text-center font-bold text-stone-800 shadow-sm focus:border-andino-500 focus:ring-1 focus:ring-andino-500" 
        />
      </label>
      <label className="inline-flex items-center gap-2 font-medium text-stone-700">
        Menores
        <input 
          type="number" 
          min={0} 
          max={50} 
          value={children}
          onChange={(e) => onChange(adults, Number(e.target.value))}
          className="w-16 rounded-lg border border-stone-300 bg-white px-2 py-1 text-center font-bold text-stone-800 shadow-sm focus:border-andino-500 focus:ring-1 focus:ring-andino-500" 
        />
      </label>
    </div>
  );
}
