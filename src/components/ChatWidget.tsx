import { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, Plus, X, Menu, Copy, Check, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  MAIN_MENU_OPTIONS, START_TEXT, FAQ_OPTIONS, BOOKING_DATE_OPTIONS, BOOKING_PAX_OPTIONS,
  tourOptions, destinationOptions, fallbackDestinations, paxToNumbers,
  bookingMissing, bookingSummary, type BookingDraft, type ChatOption, type MinimalTour,
} from '../lib/chatTree';
import {
  WHATSAPP_DISPLAY, BRAND_IMAGES, waLink,
  buildBookingMessage, buildTourMessage, buildFaqMessage,
} from '../lib/whatsapp';

type Draft = BookingDraft;
type ChatMsg = {
  role: 'user' | 'assistant'; content: string; draft?: Draft | null;
  options?: ChatOption[]; showMenuBtn?: boolean; waText?: string | null;
};

const WELCOME = START_TEXT;
type PendingStep = null | 'dest' | 'date' | 'phone' | 'faq_other';
type FullTour = MinimalTour & {
  duration?: string | null; price_from?: number | null; currency?: string | null;
  short_description?: string | null; meeting_point?: string | null; includes?: string | null;
};
type FaqRow = { category: string; question: string; answer: string };

// ---------- Sub-componente: cierre a WhatsApp dentro del chat ----------
// WhatsApp bloquea iframes (X-Frame-Options), así que no se puede "abrir el
// WhatsApp dentro del chat". En su lugar: preview del mensaje + botón que
// abre wa.me (en móvil abre la app, en PC abre WhatsApp Web) con texto listo
// para que el agente IA de WhatsApp Business continúe.
function WaCta({ text, label = 'Continuar en WhatsApp' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* portapapeles no disponible */ }
  };
  return (
    <div className="mt-2 rounded-xl border border-[#00a884]/30 bg-[#e7ffdb] p-2.5">
      <p className="text-[11px] font-bold uppercase text-[#075e54]">Se envía al WhatsApp de la empresa ({WHATSAPP_DISPLAY})</p>
      <p className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap text-xs text-stone-700">{text}</p>
      <div className="mt-2 flex gap-2">
        <a
          href={waLink(text)} target="_blank" rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#00a884] px-3 py-2 text-[13px] font-bold text-white hover:bg-[#009678]"
        >
          <ExternalLink size={14} /> {label}
        </a>
        <button
          onClick={copy} title="Copiar mensaje"
          className="grid w-10 place-items-center rounded-lg border border-stone-300 bg-white hover:bg-stone-50"
        >
          {copied ? <Check size={15} className="text-green-700" /> : <Copy size={15} />}
        </button>
      </div>
      <p className="mt-1 text-[10px] text-stone-500">Al abrirse WhatsApp solo pulsa Enviar — el agente IA de la empresa te atiende allí.</p>
    </div>
  );
}

export function ChatWidget() {
  const { session, signInWithGoogle } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([{ role: 'assistant', content: WELCOME, showMenuBtn: true }]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPick, setMenuPick] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingStep>(null);
  const [booking, setBooking] = useState<Draft>({});
  const [tours, setTours] = useState<FullTour[]>([]);
  const [faqs, setFaqs] = useState<FaqRow[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open, menuOpen]);

  // Catálogo local (lectura pública, sin API keys de IA)
  useEffect(() => {
    supabase.from('tours')
      .select('slug,title,destination,duration,price_from,currency,short_description,meeting_point,includes')
      .eq('is_published', true).order('title').limit(12)
      .then(({ data }) => { if (data) setTours(data as FullTour[]); });
    supabase.from('faqs')
      .select('category,question,answer').eq('is_published', true).order('display_order').limit(30)
      .then(({ data }) => { if (data) setFaqs(data as FaqRow[]); });
  }, []);

  const newChat = () => {
    setMsgs([{ role: 'assistant', content: WELCOME, showMenuBtn: true }]);
    setError(null); setTrackingId(null); setInput('');
    setPending(null); setBooking({}); setMenuOpen(false); setMenuPick(null);
  };

  const pushAssistant = (content: string, opts?: { options?: ChatOption[]; showMenuBtn?: boolean; draft?: Draft | null; waText?: string | null }) => {
    setMsgs((m) => [...m, {
      role: 'assistant', content,
      options: opts?.options, showMenuBtn: opts?.showMenuBtn ?? false,
      draft: opts?.draft ?? null, waText: opts?.waText ?? null,
    }]);
  };
  const pushUser = (content: string) => setMsgs((m) => [...m, { role: 'user', content }]);

  const money = (t: FullTour) =>
    t.price_from != null ? `S/ ${Number(t.price_from).toFixed(2)}${t.currency && t.currency !== 'PEN' ? ` ${t.currency}` : ''}` : 'a consultar';

  // ---------- Navegación del árbol (100% local, sin IA) ----------
  const route = async (value: string, label: string) => {
    pushUser(label);
    setError(null);
    if (value === 'menu') { setMenuOpen(true); return; }
    if (value === 'tours') {
      const opts = tours.length ? tourOptions(tours) : [{ value: 'menu', label: '⬅ Volver al menú' }];
      pushAssistant(
        tours.length
          ? 'Estos son nuestros tours disponibles. Elige uno para ver el detalle:'
          : 'Aún no tengo el catálogo cargado. Escríbeme el destino o continúa por WhatsApp y te ayudamos.',
        tours.length ? { options: opts } : { options: opts, waText: buildFaqMessage('tours disponibles') },
      );
      setPending(null);
      return;
    }
    if (value === 'prices') {
      const opts = tours.length
        ? tours.slice(0, 6).map((t) => ({ value: `price:${t.slug}`, label: t.title }))
        : [];
      opts.push({ value: 'menu', label: '⬅ Volver al menú' });
      pushAssistant('¿De qué tour quieres precio y horario? Elige uno:', { options: opts });
      setPending(null);
      return;
    }
    if (value === 'booking') {
      setBooking({});
      const dests = tours.length ? destinationOptions(tours) : fallbackDestinations();
      pushAssistant('Perfecto, te ayudo con tu solicitud. ¿Qué destino te gustaría visitar?', { options: dests });
      setPending('dest');
      return;
    }
    if (value === 'faqs') {
      pushAssistant('Preguntas frecuentes. Elige un tema:', { options: FAQ_OPTIONS });
      setPending(null);
      return;
    }
    if (value === 'help') {
      const wa = buildFaqMessage('hablar con un asesor');
      pushAssistant(
        `Te atiende un asesor por WhatsApp (${WHATSAPP_DISPLAY}). También puedes dejar tu solicitud aquí y la enviamos por ti. ¿Qué prefieres?`,
        {
          options: [
            { value: 'booking', label: 'Dejar una solicitud' },
            { value: 'tours', label: 'Ver tours' },
            { value: 'menu', label: '⬅ Volver al menú' },
          ],
          waText: wa,
        },
      );
      setPending(null);
      return;
    }
    if (value.startsWith('tour:')) {
      const slug = value.slice(5);
      const t = tours.find((x) => x.slug === slug);
      if (!t) {
        pushAssistant('Ese tour ya no está publicado. Elige otro o vuelve al menú.', { options: tourOptions(tours) });
        return;
      }
      pushAssistant(
        `${t.title}\n${t.short_description ?? ''}\n• Destino: ${t.destination ?? '—'}\n• Duración: ${t.duration ?? '—'}\n• Precio desde: ${money(t)}\n• Salida: ${t.meeting_point ?? 'a coordinar'}`.trim(),
        {
          options: [
            { value: `price:${slug}`, label: 'Ver precio y horario' },
            { value: `bookdest:${slug}`, label: 'Reservar este tour' },
            { value: 'tours', label: 'Ver otros tours' },
            { value: 'menu', label: '⬅ Menú principal' },
          ],
          waText: buildTourMessage(t.title, 'info'),
        },
      );
      return;
    }
    if (value.startsWith('price:')) {
      const slug = value.slice(6);
      const t = tours.find((x) => x.slug === slug);
      if (!t) {
        pushAssistant('No encontré ese tour. Elige otro.', { options: tourOptions(tours) });
        return;
      }
      pushAssistant(
        `${t.title}\n• Precio desde: ${money(t)}\n• Salida: ${t.meeting_point ?? 'a coordinar'}\n• Duración: ${t.duration ?? '—'}\n${t.includes ? `• Incluye: ${t.includes}\n` : ''}Precio final y horario se confirman por WhatsApp según fecha y grupo.`,
        {
          options: [
            { value: `bookdest:${slug}`, label: 'Reservar este tour' },
            { value: 'menu', label: '⬅ Menú principal' },
          ],
          waText: buildTourMessage(t.title, 'precio'),
        },
      );
      return;
    }
    if (value.startsWith('bookdest:')) {
      const slug = value.slice(9);
      const tour = tours.find((t) => t.slug === slug);
      setBooking({ tour_slug: slug, requested_destination: tour?.destination ?? tour?.title ?? slug });
      pushAssistant(
        `Buena elección: ${tour?.title ?? slug}. ¿Para qué fecha te gustaría ir? (puedes escribirla, ej. 2026-11-20)`,
        { options: BOOKING_DATE_OPTIONS },
      );
      setPending('date');
      return;
    }
    if (value.startsWith('dest:')) {
      const dest = value.slice(5);
      const nb = { ...booking, requested_destination: dest };
      setBooking(nb);
      pushAssistant('Anotado. ¿Para qué fecha te gustaría ir?', { options: BOOKING_DATE_OPTIONS });
      setPending('date');
      return;
    }
    if (value === 'flexible' || value === 'finde' || value === 'semana') {
      const labelMap: Record<string, string> = { flexible: 'fecha flexible', finde: 'este fin de semana', semana: 'la próxima semana' };
      const nb = { ...booking, preferred_date: null, additional_notes: `${booking.additional_notes ?? ''} [${labelMap[value]}]`.trim() };
      setBooking(nb);
      pushAssistant('¿Cuántos viajeros son?', { options: BOOKING_PAX_OPTIONS });
      setPending(null);
      return;
    }
    if (['1', '2', '3-5', '6+'].includes(value) && booking.requested_destination) {
      const { adults, children } = paxToNumbers(value);
      const nb = { ...booking, adults, children };
      setBooking(nb);
      pushAssistant('¿A qué teléfono te contactamos? (opcional — puedes omitirlo)', { options: [{ value: 'skipphone', label: 'Omitir por ahora' }] });
      setPending('phone');
      return;
    }
    if (value === 'skipphone') {
      finishBooking({ ...booking });
      return;
    }
    if (value.startsWith('faq:')) {
      answerFaq(value.slice(4));
      return;
    }
    // Cualquier otro botón: búsqueda local
    answerLocal(label);
  };

  const answerFaq = (kind: string) => {
    if (kind === 'otra') {
      pushAssistant('Escríbeme tu pregunta y la busco en la información de la agencia.');
      setPending('faq_other');
      return;
    }
    // Respuesta 100% local desde la tabla faqs (sin IA)
    const needles: Record<string, string[]> = {
      pagos: ['pago', 'precio', 'pagar', 'yape', 'plin', 'transferencia', 'cuesta'],
      cancel: ['cancel', 'cambio', 'reembolso', 'devuelv'],
      punto: ['encuentro', 'punto', 'horario', 'salida', 'recojo', 'hora'],
      dura: ['dura', 'llevar', 'duración', 'incluye', 'ropa', 'recomienda'],
    };
    const keys = needles[kind] ?? [];
    const hit = faqs.find((f) =>
      keys.some((k) => `${f.question} ${f.answer} ${f.category}`.toLowerCase().includes(k)),
    );
    const topic = FAQ_OPTIONS.find((o) => o.value === `faq:${kind}`)?.label ?? 'consulta general';
    if (hit) {
      pushAssistant(`${hit.question}\n${hit.answer}`, {
        options: [{ value: 'menu', label: '⬅ Menú principal' }],
        waText: buildFaqMessage(topic, hit.question),
      });
    } else {
      pushAssistant(
        'Tomo tu consulta. Un asesor te responde por WhatsApp con la información verificada.',
        {
          options: [{ value: 'menu', label: '⬅ Menú principal' }],
          waText: buildFaqMessage(topic),
        },
      );
    }
  };

  // Cierre de reserva: resumen + envío a WhatsApp (requisito principal)
  const finishBooking = (d: Draft) => {
    const missing = bookingMissing(d);
    const ready = missing.length === 0;
    const full: Draft = { ...d, adults: d.adults ?? 1, children: d.children ?? 0, ready_to_confirm: ready, missing };
    setBooking(full);
    setPending(null);
    pushAssistant(bookingSummary(full), {
      options: [{ value: 'menu', label: '⬅ Volver al menú' }],
      draft: full,
      waText: buildBookingMessage(full, tours.find((t) => t.slug === full.tour_slug)?.title),
    });
  };

  const handleFreeTextForStep = (text: string): boolean => {
    if (pending === 'dest') {
      const nb = { ...booking, requested_destination: text.slice(0, 200) };
      setBooking(nb);
      pushUser(text);
      pushAssistant('Anotado. ¿Para qué fecha te gustaría ir? (ej. 2026-11-20 o "fecha flexible")', { options: BOOKING_DATE_OPTIONS });
      setPending('date');
      return true;
    }
    if (pending === 'date') {
      const m = text.match(/(\d{4}-\d{2}-\d{2})/);
      const nb = { ...booking, preferred_date: m ? m[1] : null, additional_notes: m ? booking.additional_notes : `${booking.additional_notes ?? ''} [${text.slice(0, 100)}]`.trim() };
      setBooking(nb);
      pushUser(text);
      pushAssistant('¿Cuántos viajeros son? (ej. 2)', { options: BOOKING_PAX_OPTIONS });
      setPending(null);
      return true;
    }
    if (pending === 'phone') {
      const nb = { ...booking, contact_phone: text.slice(0, 30) };
      pushUser(text);
      finishBooking(nb);
      return true;
    }
    if (pending === 'faq_other') {
      pushUser(text);
      setPending(null);
      answerLocal(text);
      return true;
    }
    if (booking.requested_destination && !booking.adults && /^\d{1,2}$/.test(text.trim())) {
      const n = Math.min(20, Math.max(1, Number(text.trim())));
      const nb = { ...booking, adults: n, children: 0 };
      setBooking(nb);
      pushUser(text);
      pushAssistant('¿A qué teléfono te contactamos? (opcional)', { options: [{ value: 'skipphone', label: 'Omitir por ahora' }] });
      setPending('phone');
      return true;
    }
    return false;
  };

  // Búsqueda local por palabras clave (reemplaza a la IA): tours + faqs publicados
  const answerLocal = (text: string) => {
    const q = text.toLowerCase();
    const tourHit = tours.find((t) =>
      `${t.title} ${t.destination ?? ''} ${t.short_description ?? ''}`.toLowerCase().split(/[^a-záéíóúñü0-9]+/)
        .filter((w) => w.length > 3).some((w) => q.includes(w)),
    );
    if (tourHit) {
      pushAssistant(
        `Encontré esto para ti:\n${tourHit.title}\n${tourHit.short_description ?? ''}\n• Destino: ${tourHit.destination ?? '—'}\n• Precio desde: ${money(tourHit)}\n• Salida: ${tourHit.meeting_point ?? 'a coordinar'}`.trim(),
        {
          options: [
            { value: `bookdest:${tourHit.slug}`, label: 'Reservar este tour' },
            { value: `price:${tourHit.slug}`, label: 'Ver precio y horario' },
            { value: 'menu', label: '⬅ Menú principal' },
          ],
          waText: buildTourMessage(tourHit.title, 'info'),
        },
      );
      return;
    }
    const faqHit = faqs.find((f) =>
      `${f.question} ${f.answer} ${f.category}`.toLowerCase().split(/[^a-záéíóúñü0-9]+/)
        .filter((w) => w.length > 3).some((w) => q.includes(w)),
    );
    if (faqHit) {
      pushAssistant(`${faqHit.question}\n${faqHit.answer}`, {
        options: [{ value: 'menu', label: '⬅ Menú principal' }],
        waText: buildFaqMessage(faqHit.category, faqHit.question),
      });
      return;
    }
    pushAssistant(
      'No encontré ese dato en el catálogo publicado. Te derivo al WhatsApp de la empresa, donde su agente IA te responde con la info oficial.',
      {
        options: [
          { value: 'booking', label: 'Dejar una solicitud' },
          { value: 'menu', label: '⬅ Menú principal' },
        ],
        waText: buildFaqMessage('consulta general', text.slice(0, 200)),
      },
    );
  };

  const send = () => {
    const text = input.trim().slice(0, 2000);
    if (!text) return;
    if (handleFreeTextForStep(text)) { setInput(''); return; }
    pushUser(text);
    setInput('');
    answerLocal(text);
  };

  const confirmMenu = () => {
    if (!menuPick) return;
    const opt = MAIN_MENU_OPTIONS.find((o) => o.value === menuPick);
    setMenuOpen(false);
    setMenuPick(null);
    if (opt) void route(opt.value, opt.label);
  };

  const confirmRequest = async (draft: Draft) => {
    if (!session?.user) {
      setError('Para guardar tu solicitud aquí, primero inicia sesión con Google. O envíala directo por WhatsApp (no requiere cuenta).');
      return;
    }
    setSaving(true); setError(null);
    try {
      const adults = Math.max(1, Number(draft.adults ?? 1));
      const children = Math.max(0, Number(draft.children ?? 0));
      const payload = {
        user_id: session.user.id,
        tour_id: draft.tour_id ?? null,
        requested_destination: (draft.requested_destination ?? '').slice(0, 200) || null,
        preferred_date: draft.preferred_date ?? null,
        date_is_flexible: false,
        adults, children,
        travelers_count: adults + children,
        contact_phone: draft.contact_phone?.slice(0, 30) ?? null,
        additional_notes: draft.additional_notes?.slice(0, 2000) ?? null,
        status: 'pending',
      };
      const { data, error } = await supabase.from('tour_requests').insert(payload).select('id').single();
      if (error) throw error;
      setTrackingId(data.id);
      pushAssistant(`✅ Solicitud guardada con seguimiento: ${data.id} (pendiente, no es pago). También puedes reenviarla por WhatsApp para atención inmediata.`, {
        waText: buildBookingMessage(draft, tours.find((t) => t.slug === draft.tour_slug)?.title),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? `No se pudo guardar: ${e.message}` : 'No se pudo guardar la solicitud.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)} aria-label="Abrir asistente virtual"
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-andino-700 text-white shadow-lg hover:bg-andino-800"
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </button>
      {open && (
        <section aria-label="Asistente virtual de tours" className="fixed bottom-20 right-4 z-50 flex h-[70vh] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[#ece5dd] shadow-2xl">
          <header className="flex items-center gap-2 bg-[#075e54] px-4 py-3 text-white">
            <img src={BRAND_IMAGES.logo} alt="Turismo Chilón" className="h-8 w-8 rounded-full bg-white object-contain p-0.5" loading="lazy" />
            <div>
              <p className="text-sm font-bold leading-none">Turismo Chilón · Cajamarca Tours</p>
              <p className="text-xs text-white/70">Menú guiado · cierre por WhatsApp {WHATSAPP_DISPLAY}</p>
            </div>
            <button onClick={newChat} title="Nueva conversación" className="ml-auto rounded-lg p-1.5 hover:bg-white/10" aria-label="Nueva conversación">
              <Plus size={18} />
            </button>
          </header>

          <div role="log" aria-live="polite" className="chat-scroll relative flex-1 space-y-3 overflow-y-auto px-3 py-4">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap shadow-sm ${m.role === 'user' ? 'bg-[#dcf8c6] text-stone-900' : 'bg-white text-stone-800'}`}>
                  {m.content}
                  {m.showMenuBtn && m.role === 'assistant' && (
                    <button
                      onClick={() => setMenuOpen(true)}
                      className="mt-2 flex w-full items-center justify-center gap-1 border-t border-stone-200 pt-2 text-sm font-semibold text-[#00a0e9] hover:underline"
                    >
                      <Menu size={14} /> ☰ Menú principal
                    </button>
                  )}
                  {m.options && m.options.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {m.options.map((op) => (
                        <button
                          key={op.value}
                          onClick={() => void route(op.value, op.label)}
                          className="block w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-center text-[13px] font-medium text-[#00a0e9] shadow-sm hover:bg-stone-50"
                        >
                          {op.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.waText && <WaCta text={m.waText} />}
                  {m.draft && (m.draft.ready_to_confirm || (m.draft.missing?.length ?? 0) > 0 || m.draft.requested_destination) && (
                    <DraftCard draft={m.draft} saving={saving} logged={!!session} onConfirm={confirmRequest} onLogin={signInWithGoogle} />
                  )}
                </div>
              </div>
            ))}
            {trackingId && (
              <p className="rounded-xl bg-green-50 px-3 py-2 text-xs text-green-800">Seguimiento: {trackingId}</p>
            )}
            {error && (
              <div role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>
            )}
            <div ref={bottomRef} />

            {menuOpen && (
              <div className="absolute inset-0 z-10 flex items-end bg-black/40" onClick={() => setMenuOpen(false)}>
                <div
                  role="dialog" aria-label="Menú principal"
                  className="w-full rounded-t-2xl bg-white p-4 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-stone-300" />
                  <p className="text-center text-sm font-bold">☰ Menú principal</p>
                  <img src={BRAND_IMAGES.portada} alt="Turismo Chilón" className="mx-auto mt-2 h-20 w-full rounded-xl object-cover" loading="lazy" />
                  <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                    {MAIN_MENU_OPTIONS.map((op) => (
                      <label key={op.value} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-stone-50">
                        <input
                          type="radio" name="main-menu" value={op.value}
                          checked={menuPick === op.value}
                          onChange={() => setMenuPick(op.value)}
                          className="h-4 w-4 accent-[#00a884]"
                        />
                        <span className="flex-1 text-sm text-stone-800">{op.label}</span>
                        <span className={`grid h-5 w-5 place-items-center rounded-full border ${menuPick === op.value ? 'border-[#00a884]' : 'border-stone-300'}`}>
                          {menuPick === op.value && <span className="h-2.5 w-2.5 rounded-full bg-[#00a884]" />}
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={confirmMenu} disabled={!menuPick}
                    className="mt-3 w-full rounded-xl bg-[#00a884] px-3 py-2.5 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-40 hover:bg-[#009678]"
                  >
                    Enviar
                  </button>
                  <p className="mt-2 text-center text-[11px] text-stone-400">Sin IA externa: todo el menú funciona offline del proveedor. El cierre es por WhatsApp.</p>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-2 border-t border-stone-200 bg-[#f0f0f0] p-2"
          >
            <label htmlFor="chat-input" className="sr-only">Escribe tu mensaje</label>
            <input
              id="chat-input" enterKeyHint="send" maxLength={2000} autoComplete="off"
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={pending === 'dest' ? 'Escribe el destino…' : pending === 'date' ? 'Ej. 2026-11-20 o flexible…' : pending === 'phone' ? 'Teléfono (opcional)…' : 'Elige una opción o escribe…'}
              className="min-h-11 flex-1 rounded-full border border-stone-300 bg-white px-4 text-sm focus:border-andino-500 focus:outline-none"
            />
            <button type="submit" aria-label="Enviar mensaje" disabled={!input.trim()} className="grid h-11 w-11 place-items-center rounded-full bg-[#00a884] text-white disabled:opacity-40 hover:bg-[#009678]">
              <Send size={17} />
            </button>
          </form>
          {!session && (
            <p className="border-t border-stone-100 bg-white px-3 py-2 text-[11px] text-stone-500">
              Sin cuenta puedes usar el menú y WhatsApp. Para guardar historial aquí, <button onClick={signInWithGoogle} className="underline font-semibold text-andino-700">continúa con Google</button>.
            </p>
          )}
        </section>
      )}
    </>
  );
}

function DraftCard({ draft, saving, logged, onConfirm, onLogin }: {
  draft: Draft; saving: boolean; logged: boolean;
  onConfirm: (d: Draft) => void; onLogin: () => void;
}) {
  const waText = buildBookingMessage(draft);
  return (
    <div className="mt-2 rounded-xl border border-stone-200 bg-white p-3 text-stone-700">
      <p className="text-xs font-bold uppercase text-stone-500">Resumen de solicitud (revísalo antes de enviar)</p>
      <ul className="mt-1 text-[13px] space-y-0.5">
        <li><b>Destino:</b> {draft.requested_destination ?? '—'}</li>
        <li><b>Fecha preferida:</b> {draft.preferred_date ?? '—'}</li>
        <li><b>Viajeros:</b> {Number(draft.adults ?? 1) + Number(draft.children ?? 0)} (adultos: {draft.adults ?? 1}, menores: {draft.children ?? 0})</li>
        {draft.contact_phone && <li><b>Teléfono:</b> {draft.contact_phone}</li>}
        {draft.additional_notes && <li><b>Notas:</b> {draft.additional_notes}</li>}
      </ul>
      {(draft.missing?.length ?? 0) > 0 && (
        <p className="mt-1 text-xs text-amber-700">Falta: {draft.missing!.join(', ')}. Respóndelo en el chat.</p>
      )}
      <p className="mt-1 text-[11px] text-stone-500">Esto registra una <b>solicitud pendiente</b>, no una reserva confirmada ni un pago.</p>
      <a
        href={waLink(waText)} target="_blank" rel="noopener noreferrer"
        className="mt-2 block w-full rounded-lg bg-[#00a884] px-3 py-2 text-center text-sm font-bold text-white hover:bg-[#009678]"
      >
        Enviar por WhatsApp ({WHATSAPP_DISPLAY})
      </a>
      {logged ? (
        <button disabled={saving || !(draft.ready_to_confirm ?? false)} onClick={() => onConfirm(draft)}
          className="mt-2 w-full rounded-lg bg-andino-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40 hover:bg-andino-800">
          {saving ? 'Guardando…' : 'También guardar en la web'}
        </button>
      ) : (
        <button onClick={onLogin} className="mt-2 w-full rounded-lg border border-andino-700 px-3 py-2 text-sm font-bold text-andino-800 hover:bg-andino-50">
          Continuar con Google para guardar en la web
        </button>
      )}
    </div>
  );
}
