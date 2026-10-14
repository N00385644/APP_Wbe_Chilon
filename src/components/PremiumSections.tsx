import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, ArrowRight, ShieldCheck, Snowflake, Satellite, Users, CalendarDays, Send } from 'lucide-react';
import { TourCard } from './catalog';
import { Reveal } from './Reveal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Tour } from '../lib/types';
import { SOCIALS } from '../lib/site';

export function DestinosSection({ tours }: { tours: Tour[] }) {
  const destacados = tours.slice(0, 3);
  if (destacados.length === 0) return null;
  return (
    <section aria-labelledby="destinos-title" className="mt-16 sm:mt-20">
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-stone-200/80 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-andino-700 mb-1">
              <MapPin size={13} className="text-amber-500" /> Destinos turísticos
            </div>
            <h2 id="destinos-title" className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Cajamarca, destino por destino
            </h2>
            <p className="mt-1 text-sm text-stone-500">Fotos reales, descripciones claras y consulta directa por destino.</p>
          </div>
          <Link to="/tours" className="inline-flex items-center gap-1 text-sm font-bold text-andino-700 hover:translate-x-1 transition-all">
            <span>Ver todos los circuitos</span><ArrowRight size={16} />
          </Link>
        </div>
      </Reveal>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {destacados.map((t, i) => (
          <Reveal key={t.id} delay={i * 90}>
            <TourCard tour={t} index={i} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function MovilidadSection() {
  const feats = [
    { icon: <Users size={18} className="text-emerald-600" />, title: 'Interior amplio', desc: 'Configuración pensada para grupos, con acceso cómodo y visibilidad panorámica.' },
    { icon: <Snowflake size={18} className="text-sky-600" />, title: 'Climatizadas', desc: 'Unidades climatizadas para el clima cambiante de la sierra cajamarquina.' },
    { icon: <Satellite size={18} className="text-andino-600" />, title: 'GPS y SOAT vigente', desc: 'Flota monitoreada y en regla para viajar con tranquilidad.' },
    { icon: <ShieldCheck size={18} className="text-amber-600" />, title: 'Choferes homologados', desc: 'Conductores homologados para turismo y operación minera.' },
  ];
  return (
    <section aria-labelledby="movilidad-title" className="mt-16 sm:mt-20 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl">
      <div className="grid gap-0 lg:grid-cols-2">
        <div className="relative min-h-[280px] bg-stone-950">
          <img src="/tours/wa-bus-01.jpg" alt="Hyundai H350 Solati blanca de Turismo Chilón en campo cajamarquino" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-stone-800">Hyundai H350 Solati · 2019</span>
            <span className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold text-stone-900">Flota propia</span>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <Reveal>
            <span className="text-xs font-bold uppercase tracking-wider text-andino-700">Nuestra movilidad</span>
            <h2 id="movilidad-title" className="mt-1 text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Viaja en la H350 Solati
            </h2>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              La protagonista 3D del inicio es nuestra unidad real: mírala arriba en 360° y aquí
              tienes lo verificado por la empresa. Sin cifras inventadas: capacidad y equipamiento
              exactos se confirman por WhatsApp según el grupo.
            </p>
          </Reveal>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {feats.map((f, i) => (
              <Reveal key={f.title} delay={i * 70}>
                <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center gap-2 font-bold text-sm text-stone-900">{f.icon}{f.title}</div>
                  <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={`https://wa.me/${SOCIALS.whatsapp}?text=${encodeURIComponent('Hola Turismo Chilón, deseo información de la movilidad H350 para mi grupo')}`}
                target="_blank" rel="noopener noreferrer"
                className="btn-3d inline-flex items-center gap-2 rounded-xl bg-andino-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-andino-800">
                Consultar disponibilidad <ArrowRight size={15} />
              </a>
              <Link to="/tours" className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100">
                Ver tours para esta unidad
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function ExperienciasSection({ tours }: { tours: Tour[] }) {
  const list = tours.slice(3, 6);
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="exp-title" className="mt-16 sm:mt-20 rounded-3xl bg-gradient-to-br from-andino-900 via-andino-800 to-stone-950 p-6 sm:p-10 text-white shadow-xl border border-white/10 relative overflow-hidden">
      <div className="radial-hero-glow absolute inset-0 opacity-40 pointer-events-none" />
      <div className="relative z-10">
        <Reveal>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Experiencias y tours</span>
          <h2 id="exp-title" className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">Circuitos listos para reservar</h2>
          <p className="mt-2 text-sm text-white/75 max-w-2xl">Información estructurada desde la base de datos: sin precios ni horarios inventados, solo lo publicado por el administrador.</p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => (
            <Link key={t.id} to={`/tours/${t.slug}`} className="group rounded-2xl overflow-hidden border border-white/15 bg-white/5 hover:bg-white/10 hover:-translate-y-1 transition-all">
              {t.image_url
                ? <img src={t.image_url} alt={t.title} loading="lazy" className="h-36 w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                : <div className="grid h-36 place-items-center text-4xl bg-andino-950">🏔️</div>}
              <div className="p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  <Clock size={11} /> {t.duration ?? t.destination ?? 'Cajamarca'}
                </p>
                <p className="mt-1 font-bold text-sm sm:text-base leading-snug">{t.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContactoSection({ tours }: { tours: Tour[] }) {
  const { user } = useAuth();
  const [nombre, setNombre] = useState('');
  const [destino, setDestino] = useState('');
  const [personas, setPersonas] = useState(2);
  const [fecha, setFecha] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const destinos = useMemo(() => tours.map((t) => t.title), [tours]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (nombre.trim().length < 2) { setMsg({ ok: false, text: 'Escribe tu nombre (mín. 2 caracteres).' }); return; }
    if (!destino) { setMsg({ ok: false, text: 'Elige un destino de interés.' }); return; }
    if (personas < 1 || personas > 50) { setMsg({ ok: false, text: 'Personas: entre 1 y 50.' }); return; }
    if (!fecha) { setMsg({ ok: false, text: 'Elige la fecha deseada.' }); return; }
    setBusy(true);
    try {
      if (user) {
        const { error } = await supabase.from('tour_requests').insert({
          user_id: user.id,
          requested_destination: destino,
          travelers_count: personas,
          adults: personas,
          children: 0,
          preferred_date: fecha,
          additional_notes: `Contacto web — Nombre: ${nombre}`,
          status: 'pending',
        });
        if (error) throw error;
        setMsg({ ok: true, text: 'Solicitud registrada en tu perfil. Te confirmaremos por WhatsApp.' });
      } else {
        const text = encodeURIComponent(`Hola Turismo Chilón, soy ${nombre}. Me interesa: ${destino}. Personas: ${personas}. Fecha deseada: ${fecha}.`);
        window.open(`https://wa.me/${SOCIALS.whatsapp}?text=${text}`, '_blank', 'noopener');
        setMsg({ ok: true, text: 'Te abrimos WhatsApp con tu consulta lista. Inicia sesión para guardarla en tu perfil.' });
      }
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'No se pudo enviar. Intenta por WhatsApp.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="contacto-title" className="mt-16 sm:mt-20 grid gap-6 lg:grid-cols-2 items-start">
      <Reveal>
        <span className="text-xs font-bold uppercase tracking-wider text-andino-700">Contacto y reservas</span>
        <h2 id="contacto-title" className="mt-1 text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">Solicita información</h2>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed">
          Sin pagos por adelantado ni reservas simuladas: si inicias sesión se guarda en{' '}
          <Link to="/perfil" className="font-bold text-andino-700 underline">tus solicitudes</Link>; si no,
          preparamos tu mensaje de WhatsApp. Integración lista para el backend existente.
        </p>
        <div className="mt-4 space-y-2 text-sm text-stone-600">
          <p className="flex items-center gap-2"><CalendarDays size={15} className="text-andino-600" /> Respuesta por WhatsApp en horario de oficina</p>
          <p className="flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-600" /> Tus datos solo se usan para coordinar el tour</p>
        </div>
      </Reveal>
      <Reveal delay={100}>
        <form onSubmit={submit} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl grid gap-3" noValidate>
          <label className="grid gap-1 text-sm">
            <span className="font-bold text-stone-800">Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre completo" autoComplete="name"
              className="rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:border-andino-500 focus:ring-2 focus:ring-andino-500/20 focus:outline-none" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-bold text-stone-800">Destino de interés</span>
              <select value={destino} onChange={(e) => setDestino(e.target.value)}
                className="rounded-xl border border-stone-300 px-3 py-2.5 text-sm bg-white focus:border-andino-500 focus:ring-2 focus:ring-andino-500/20 focus:outline-none">
                <option value="">Seleccionar…</option>
                {destinos.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-bold text-stone-800">N.º personas</span>
              <input type="number" min={1} max={50} value={personas} onChange={(e) => setPersonas(Number(e.target.value))}
                className="rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:border-andino-500 focus:ring-2 focus:ring-andino-500/20 focus:outline-none" />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="font-bold text-stone-800">Fecha deseada</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:border-andino-500 focus:ring-2 focus:ring-andino-500/20 focus:outline-none" />
          </label>
          {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-xs font-semibold rounded-xl px-3 py-2 ${msg.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</p>}
          <button disabled={busy} className="btn-3d mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-andino-700 px-5 py-3 text-sm font-bold text-white hover:bg-andino-800 disabled:opacity-50">
            <Send size={15} /> {busy ? 'Enviando…' : user ? 'Enviar solicitud' : 'Consultar por WhatsApp'}
          </button>
        </form>
      </Reveal>
    </section>
  );
}
