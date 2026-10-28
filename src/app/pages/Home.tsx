// Página de inicio: composición de secciones (sin lógica de datos propia,
// solo compone hooks + componentes de features).
import { Link } from 'react-router-dom';
import { Youtube, Sparkles, Compass, ArrowRight } from 'lucide-react';
import { Hero } from '../../components/layout/Layout';
import { ToursBento } from '../../features/tours/components/ToursBento';
import { FaqList } from '../../features/faqs/components/FaqList';
import { MovilidadSection, ContactoSection } from '../../components/PremiumSections';
import { Reveal } from '../../components/shared/Reveal';
import { useFaqs, useTours } from '../../lib/hooks';
import { SOCIALS } from '../../lib/site';

export function Home() {
  const { tours } = useTours();
  const { faqs } = useFaqs();

  return (
    <>
      <Hero />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Única rejilla de destacados: evita el solape Destinos(0-3) + Destacados(0-6) + Experiencias(3-6).
            Movilidad conserva la foto real de la flota; el resto de secciones útiles se mantienen. */}
        <MovilidadSection />

        {/* SECCIÓN 1: Tours Destacados */}
        <section aria-labelledby="destacados-title" className="mt-6 sm:mt-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-stone-200/80 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-andino-700 mb-1">
                <Sparkles size={13} className="text-amber-500" /> Circuitos Populares
              </div>
              <h2 id="destacados-title" className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight text-balance">
                Tours destacados en Cajamarca
              </h2>
              <p className="mt-1 text-sm text-stone-500">Selección publicada por la agencia: fotos reales y consulta directa.</p>
            </div>
            <Link
              to="/tours"
              className="inline-flex items-center gap-1 text-sm font-bold text-andino-700 hover:text-andino-800 mouse:hover:translate-x-1 transition-[color,transform] duration-160"
            >
              <span>Ver todos los circuitos</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {tours.length > 0 ? (
            <ToursBento tours={tours.slice(0, 6)} className="mt-6" />
          ) : (
            <div role="status" className="empty-state mt-6 bg-white/60">
              <p className="text-3xl" aria-hidden>🏔️</p>
              <p className="mt-2 text-sm font-semibold text-stone-700">Aún no hay tours publicados</p>
              <p className="mt-1 text-sm text-stone-500">
                El administrador puede activarlos desde el panel. Mientras tanto, consúltanos por WhatsApp.
              </p>
            </div>
          )}
        </section>

        {/* SECCIÓN 2: ¿Cómo reservar? & FAQ Destacadas */}
        <section className="mt-16 grid gap-8 lg:grid-cols-2 items-start">
          {/* Tarjeta 3D "¿Cómo reservar?" */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-andino-900 via-andino-800 to-andino-950 p-6 sm:p-8 text-white shadow-xl border border-white/10">
            <div className="radial-hero-glow absolute inset-0 opacity-40 pointer-events-none" />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-badge text-amber-300 text-xs font-bold mb-3">
                <Compass size={14} /> Proceso Simple y Transparente
              </span>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                ¿Cómo planificar tu viaje?
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-white/80">
                Diseñado para que consultes rápido sin trámites complicados:
              </p>

              <ol className="mt-6 space-y-4">
                <li className="flex items-start gap-3">
                  <span className="grid place-items-center w-7 h-7 rounded-xl bg-amber-400 text-stone-900 font-extrabold text-xs shrink-0 shadow-sm">
                    1
                  </span>
                  <div>
                    <strong className="block text-sm text-white">Consulta tus tours favoritos</strong>
                    <span className="text-xs text-white/75">Revisa destinos o chatea con nuestro asistente virtual guiado.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid place-items-center w-7 h-7 rounded-xl bg-amber-400 text-stone-900 font-extrabold text-xs shrink-0 shadow-sm">
                    2
                  </span>
                  <div>
                    <strong className="block text-sm text-white">Indica fecha y cantidad de viajeros</strong>
                    <span className="text-xs text-white/75">Te daremos la tarifa exacta y recomendaciones de equipaje.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid place-items-center w-7 h-7 rounded-xl bg-amber-400 text-stone-900 font-extrabold text-xs shrink-0 shadow-sm">
                    3
                  </span>
                  <div>
                    <strong className="block text-sm text-white">Envía tu solicitud de reserva</strong>
                    <span className="text-xs text-white/75">Queda registrada en tu perfil con número de seguimiento.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="grid place-items-center w-7 h-7 rounded-xl bg-amber-400 text-stone-900 font-extrabold text-xs shrink-0 shadow-sm">
                    4
                  </span>
                  <div>
                    <strong className="block text-sm text-white">Confirmación por WhatsApp</strong>
                    <span className="text-xs text-white/75">Un asesor se pondrá en contacto para coordinar recojo y detalles.</span>
                  </div>
                </li>
              </ol>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                <span>Consulta gratuita · Sin pagos por adelantado requeridos</span>
                <Link to="/tours" className="text-amber-300 font-bold underline hover:text-white">
                  Ver tours ahora
                </Link>
              </div>
            </div>
          </div>

          {/* Preguntas Frecuentes Rápidas */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-andino-700">Dudas resueltas</span>
                <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">Preguntas frecuentes</h2>
              </div>
              <Link to="/faq" className="text-sm font-bold text-andino-700 underline">
                Ver todas
              </Link>
            </div>
            <FaqList faqs={faqs.slice(0, 5)} filter="" />
          </div>
        </section>

        {/* SECCIÓN 3: Video Institucional con Marco 3D */}
        <section className="mt-16 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl">
          <div className="grid gap-0 lg:grid-cols-12 items-center">
            <div className="p-6 sm:p-10 lg:col-span-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold mb-3">
                <Youtube size={15} /> Video Oficial
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                Conoce a Turismo Chilón en acción
              </h2>
              <p className="mt-3 text-sm text-stone-600 leading-relaxed">
                Descubre nuestra flota moderna de vans y buses, a nuestro equipo de guías certificados y los hermosos paisajes andinos que visitamos a diario.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={SOCIALS.youtubeVideo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-3d inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 shadow-md"
                >
                  <Youtube size={18} /> Ver en YouTube
                </a>
                <a
                  href={SOCIALS.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-colors duration-200"
                >
                  Instagram
                </a>
              </div>
            </div>

            <div className="lg:col-span-7 aspect-video w-full bg-stone-950 p-2 sm:p-4">
              <div className="w-full h-full rounded-2xl overflow-hidden shadow-inner">
                <iframe
                  src={SOCIALS.youtubeEmbed}
                  title="Video institucional de Turismo Chilón"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              </div>
            </div>
          </div>
        </section>

        <ContactoSection tours={tours} />
        <Reveal className="mt-10">
          <p className="text-center text-[11px] text-stone-400">
            Contenido comercial verificado por Turismo Chilón S.R.L. — sin precios ni horarios inventados.
          </p>
        </Reveal>
      </main>
    </>
  );
}
