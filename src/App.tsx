import { useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header, Hero, Footer } from './components/layout';
import { TourCard, FaqList } from './components/catalog';
import { DestinosSection, MovilidadSection, ExperienciasSection, ContactoSection } from './components/PremiumSections';
import { Reveal } from './components/Reveal';
import { BackButton } from './components/BackButton';
import { ChatWidget } from './components/ChatWidget';
import { AdminPanel } from './components/AdminPanel';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { useFaqs, useMyRequests, useMySchedule, useTourImages, useTours } from './lib/hooks';
import { formatPEN, formatFechaHoraLima } from './lib/format';
import { formatHoraEs, formatFechaCortaEs } from './lib/calendar';
import { REQUEST_STATUS_LABEL, type TourRequest } from './lib/types';
import { SOCIALS } from './lib/site';
import { supabase } from './lib/supabase';
import { 
  MapPin, Clock, CalendarDays, Youtube, Sparkles, 
  Compass, ArrowRight, ShieldCheck, CheckCircle2, MessageSquare
} from 'lucide-react';

const BRAND = 'Cajamarca Tours';

function Home() {
  const { tours } = useTours();
  const { faqs } = useFaqs();

  return (
    <>
      <Hero />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <DestinosSection tours={tours} />
        <MovilidadSection />
        <ExperienciasSection tours={tours} />

        {/* SECCIÓN 1: Tours Destacados */}
        <section className="mt-6 sm:mt-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-stone-200/80 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-andino-700 mb-1">
                <Sparkles size={13} className="text-amber-500" /> Circuitos Populares
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                Tours destacados en Cajamarca
              </h2>
            </div>
            <Link 
              to="/tours" 
              className="inline-flex items-center gap-1 text-sm font-bold text-andino-700 hover:text-andino-800 hover:translate-x-1 transition-all"
            >
              <span>Ver todos los circuitos</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tours.slice(0, 6).map((t, i) => (
              <TourCard key={t.id} tour={t} index={i} />
            ))}
            {tours.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-stone-300 p-12 text-center bg-white/60">
                <p className="text-sm text-stone-500">
                  Aún no hay tours publicados en la base de datos. El administrador puede activarlos desde el panel.
                </p>
              </div>
            )}
          </div>
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
                    <span className="text-xs text-white/75">Revisa destinos o chatea con nuestro asistente virtual inteligente.</span>
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
                  className="btn-3d inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 shadow-md transition-all"
                >
                  <Youtube size={18} /> Ver en YouTube
                </a>
                <a 
                  href={SOCIALS.instagram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-all"
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

function Tours() {
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

function TourDetail() {
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

function FaqPage() {
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

function RequestCard({ r, onChanged }: { r: TourRequest; onChanged: () => void }) {
  const editable = r.status === 'pending';

  const cancel = async () => {
    if (!confirm('¿Cancelar esta solicitud pendiente?')) return;
    const { error } = await supabase.from('tour_requests').update({ status: 'cancelled' }).eq('id', r.id);
    if (!error) onChanged(); else alert(error.message);
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-base text-stone-900">{r.requested_destination ?? '(sin destino)'}</b>
        <span className="rounded-full bg-andino-50 border border-andino-200 text-andino-800 font-semibold px-2.5 py-0.5 text-xs">
          {REQUEST_STATUS_LABEL[r.status] ?? r.status}
        </span>
        <span className="ml-auto text-xs text-stone-400">{formatFechaHoraLima(r.created_at)}</span>
      </div>

      <p className="mt-2 text-xs text-stone-600 leading-relaxed">
        Fecha preferida: <b>{r.preferred_date ?? '—'}</b> · Viajeros: <b>{r.travelers_count}</b> (adultos {r.adults}, menores {r.children}) · Teléfono: <b>{r.contact_phone ?? '—'}</b>
      </p>

      {r.additional_notes && <p className="mt-1 text-xs text-stone-500 italic">Notas: {r.additional_notes}</p>}
      <p className="mt-2 font-mono text-[11px] text-stone-400">ID Seguimiento: {r.id}</p>

      {editable && (
        <button 
          onClick={cancel} 
          className="mt-3 rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
        >
          Cancelar solicitud
        </button>
      )}
    </div>
  );
}

function Profile() {
  const { user, profile, signInWithGoogle, signInWithEmail, signUpWithEmail, updateName, error } = useAuth();
  const { requests, reload } = useMyRequests(user?.id);
  const { schedule } = useMySchedule(user?.id);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [busy, setBusy] = useState(false);

  if (!user) {
    const submitEmail = async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      if (mode === 'in') await signInWithEmail(email, password);
      else await signUpWithEmail(email, password, name);
      setBusy(false);
    };

    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <BackButton to="/" label="Volver al inicio" className="mb-6" />
        <div className="glass-panel rounded-3xl p-8 shadow-xl border border-stone-200 text-center">
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Mis Solicitudes</h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-500 leading-relaxed">
            Inicia sesión para registrar consultas, ver tu historial de tours y recibir atención personalizada.
          </p>

          <button 
            onClick={signInWithGoogle} 
            className="btn-3d mt-6 w-full rounded-xl bg-andino-700 py-3 font-bold text-white shadow-md hover:bg-andino-800 transition-all text-sm"
          >
            Continuar con Google
          </button>

          <div className="relative my-6 text-center">
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-stone-200" />
            <span className="relative bg-white px-3 text-xs font-semibold text-stone-400 uppercase">o con correo</span>
          </div>

          <div className="flex gap-2 text-sm mb-4">
            <button 
              onClick={() => setMode('in')} 
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-colors ${mode === 'in' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
            >
              Iniciar sesión
            </button>
            <button 
              onClick={() => setMode('up')} 
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-colors ${mode === 'up' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={submitEmail} className="grid gap-3 text-sm text-left">
            {mode === 'up' && (
              <input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Nombre completo" 
                required 
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm" 
              />
            )}
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="correo@ejemplo.com" 
              required 
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm" 
            />
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Contraseña (mín. 6 caracteres)" 
              required 
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm" 
            />
            {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
            <button 
              disabled={busy} 
              className="rounded-xl bg-stone-900 py-2.5 font-bold text-white text-sm hover:bg-black transition-colors disabled:opacity-50 mt-1"
            >
              {busy ? 'Verificando…' : mode === 'in' ? 'Entrar' : 'Registrarse'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <BackButton to="/" label="Volver al inicio" className="mb-5" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-andino-700">Panel de Usuario</span>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Mi Perfil</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">Conectado como: <b>{profile?.email ?? user.email}</b></p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Nombre para mostrar</label>
        <div className="flex gap-2">
          <input 
            defaultValue={profile?.full_name ?? ''} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Tu nombre completo"
            className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm" 
          />
          <button 
            onClick={() => updateName(name || profile?.full_name || '')} 
            className="btn-3d rounded-xl bg-andino-700 px-4 py-2 font-bold text-white text-sm hover:bg-andino-800"
          >
            Guardar
          </button>
        </div>
      </div>

      {/* Resumen de próximos tours confirmados */}
      {schedule.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Tus próximos tours</h2>
            <Link to="/calendario" className="inline-flex items-center gap-1.5 rounded-xl border border-andino-300 bg-andino-50 px-3 py-1.5 text-xs font-bold text-andino-800 hover:bg-andino-100 transition-colors">
              <CalendarDays size={14} /> Ver mi calendario
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {schedule.filter((r) => r.confirmed_date).slice(0, 2).map((r) => (
              <Link key={r.id} to="/calendario"
                className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm shadow-sm hover:shadow-md transition-shadow">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white font-extrabold text-sm">
                  {r.confirmed_date!.split('-')[2]}
                </span>
                <span>
                  <b className="text-stone-900">{r.tours?.title ?? r.requested_destination ?? '(sin destino)'}</b>
                  <span className="block text-xs text-stone-600">
                    {formatFechaCortaEs(r.confirmed_date)} · {formatHoraEs(r.departure_time)} · {r.meeting_point ?? r.tours?.meeting_point ?? 'Punto por confirmar'}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Mis Solicitudes de Viaje</h2>
        <div className="mt-4 space-y-3">
          {requests.map((r) => (
            <RequestCard key={r.id} r={r} onChanged={reload} />
          ))}
          {requests.length === 0 && (
            <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center bg-white">
              <p className="text-sm text-stone-500">Aún no tienes solicitudes registradas.</p>
              <Link to="/tours" className="mt-2 inline-block font-bold text-andino-700 underline text-sm">
                Explorar tours para cotizar
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Admin() {
  const { user, profile, loading } = useAuth();

  if (loading) return <main className="p-12 text-center text-sm text-stone-500">Verificando credenciales de administrador…</main>;
  if (!user) return <Navigate to="/perfil" replace />;
  if (!profile?.is_admin) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-stone-900">Acceso Restringido</h1>
        <p className="mt-2 text-sm text-stone-500">Esta sección es de uso exclusivo para el equipo administrativo de Turismo Chilón S.R.L.</p>
        <Link to="/" className="mt-4 inline-block font-bold text-andino-700 underline">Volver al inicio</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <BackButton to="/" label="Volver al inicio" className="mb-5" />
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tierra-100 text-tierra-800 text-xs font-bold mb-1">
          <ShieldCheck size={14} /> Modo Administrador
        </div>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Panel de Gestión</h1>
        <p className="text-sm text-stone-500 mt-1">Administra solicitudes de clientes, publicaciones de tours e imágenes.</p>
      </div>

      <AdminPanel />
    </main>
  );
}

function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-sm text-stone-700 leading-relaxed">
      <BackButton to="/" label="Volver al inicio" className="mb-6" />
      <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Aviso de Privacidad</h1>
      <p className="mt-1 text-xs text-stone-400">Última actualización: {new Date().getFullYear()}</p>

      <div className="mt-6 space-y-4">
        <p><b>1. Datos que recopilamos:</b> Nombre, correo electrónico (vía Google Auth), teléfono de contacto (solo si lo proporcionas para coordinar el recojo) y detalles de tu solicitud (fechas y cantidad de pasajeros).</p>
        <p><b>2. Finalidad del tratamiento:</b> Los datos se utilizan única y exclusivamente para gestionar tus solicitudes de viaje, responder tus consultas a través del asistente virtual y coordinar la confirmación con nuestro equipo.</p>
        <p><b>3. Seguridad y Privacidad:</b> No almacenamos datos bancarios, contraseñas ni vendemos información a terceros. Toda comunicación con el asistente virtual respeta los estándares de seguridad.</p>
        <p><b>4. Derechos ARCO:</b> Puedes solicitar la rectificación o eliminación de tus datos en cualquier momento escribiendo a informes@turismochilon.com.</p>
      </div>
    </main>
  );
}

function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const { schedule, loading } = useMySchedule(user?.id);

  if (authLoading) return <main className="p-12 text-center text-sm text-stone-500">Cargando…</main>;
  if (!user) return <Navigate to="/perfil" replace />;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <BackButton to="/perfil" label="Volver a mi perfil" className="mb-5" />
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-andino-700">Agenda de viajes</span>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Mi Calendario de Tours</h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Aquí verás la fecha confirmada, la hora de salida, la ubicación de partida y todos los detalles para realizar tu tour.
        </p>
      </div>
      <ScheduleCalendar schedule={schedule} loading={loading} />
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header brand={BRAND} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tours" element={<Tours />} />
          <Route path="/tours/:slug" element={<TourDetail />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/calendario" element={<CalendarPage />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/privacidad" element={<Privacy />} />
          <Route path="*" element={<main className="p-16 text-center text-sm">Página no encontrada. <Link className="underline font-bold text-andino-700" to="/">Volver al inicio</Link></main>} />
        </Routes>
        <Footer />
        <ChatWidget />
      </BrowserRouter>
    </AuthProvider>
  );
}
