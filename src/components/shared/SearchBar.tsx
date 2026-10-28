// Buscador de la marca: logo arrastrable + pastilla de vidrio con lupa, campo y botón dorado con chispas.
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Search, X } from 'lucide-react';

/** Una chispa del lienzo. */
type Part = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  c: string;
};

/** Paleta de las chispas: oro-400, ámbar claro, lago-400 y andino-400. */
const COLORS = ['#fbbf24', '#fde68a', '#60bffa', '#6aa872'];
const HINT = 'Arrastra el logo hacia el botón «Buscar».';
/** Distancia (fracción del ancho) para considerar el logo «sobre» el botón. */
const DROP_P = 0.85;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Texto accesible del campo (label oculto). */
  label: string;
  /** id del input; si no se pasa, se genera uno. */
  id?: string;
  /** Texto del botón dorado. */
  actionLabel?: string;
  /** Muestra el logo de la agencia (arrastrable) encima del campo. */
  withLogo?: boolean;
  /** Elemento al que llevar la vista al enviar (id sin «#»). */
  resultsId?: string;
  className?: string;
};

/**
 * Buscador con la identidad de la agencia: logo arrastrable, pastilla de vidrio
 * con lupa, campo y botón dorado «Buscar».
 *
 * - Inspirado en el buscador interactivo de Chilón Tours
 *   (`Chilón Tours · Buscador con logo interactivo.html`) y reimplementado con
 *   Tailwind y la paleta del proyecto; sin fuentes externas (Inter/Outfit).
 * - **Logo arrastrable**: se mueve con el ratón, el dedo o las flechas del
 *   teclado. Cuanto más se acerca al botón «Buscar», más se enciende éste
 *   (`--p` de `.search-cta`) y más chispas brotan de su borde. Al soltarlo
 *   encima, lanza la búsqueda (igual que pulsar «Buscar»).
 * - Las chispas se dibujan en un `<canvas>` propio (sin librerías), con el DPR
 *   acotado a 2 y el bucle parado cuando no hay nada que animar.
 * - El filtrado es local y reactivo (lo hace cada página), así que el botón no
 *   envía nada: cierra el teclado en móvil y lleva la vista a los resultados.
 * - Con `prefers-reduced-motion` no hay chispas ni inercia, pero el arrastre y
 *   la búsqueda siguen funcionando.
 * - Responsive: en pantallas estrechas el botón se pega al campo y el logo
 *   reduce su tamaño.
 */
export function SearchBar({
  value,
  onChange,
  placeholder,
  label,
  id,
  actionLabel = 'Buscar',
  withLogo = false,
  resultsId,
  className = '',
}: Props) {
  const autoId = useId();
  const inputId = id ?? `buscar-${autoId}`;

  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const partsRef = useRef<Part[]>([]);

  const [msg, setMsg] = useState<{ kind: 'hint' | 'error' | 'ok'; text: string }>({
    kind: 'hint',
    text: HINT,
  });
  const [shaking, setShaking] = useState(false);

  // Estado del arrastre y del lienzo (en refs: se toca en cada frame).
  const drag = useRef({
    off: 0,
    max: 0,
    p: 0,
    acc: 0,
    active: false,
    startX: 0,
    startOff: 0,
    vel: 0,
    prev: 0,
    lastT: 0,
    raf: 0,
    shakeTimer: 0,
    dpr: 1,
    w: 0,
    h: 0,
    reduce: false,
  });

  /** Ajusta el lienzo al bloque y al DPR (acotado a 2). */
  const measure = useCallback(() => {
    const cv = canvasRef.current;
    const wrap = wrapRef.current;
    if (!cv || !wrap) return;
    const d = drag.current;
    d.dpr = Math.min(window.devicePixelRatio || 1, 2);
    d.w = wrap.clientWidth;
    d.h = wrap.clientHeight;
    cv.width = Math.max(1, Math.round(d.w * d.dpr));
    cv.height = Math.max(1, Math.round(d.h * d.dpr));
    cv.getContext('2d')?.setTransform(d.dpr, 0, 0, d.dpr, 0, 0);
  }, []);

  /** Suelta una chispa (con tope para no dispararse). */
  const spawn = useCallback((x: number, y: number, vx: number, vy: number, life: number) => {
    const parts = partsRef.current;
    if (parts.length > 240) return;
    parts.push({
      x,
      y,
      vx,
      vy,
      life,
      max: life,
      r: 1.4 + Math.random() * 3,
      c: COLORS[(Math.random() * COLORS.length) | 0],
    });
  }, []);

  /** Un frame de chispas: brota del botón, cae con gravedad y se apaga. */
  const frame = useCallback(() => {
    const d = drag.current;
    const cv = canvasRef.current;
    const ctx = cv?.getContext('2d');
    const btn = btnRef.current;
    d.raf = 0;
    if (!cv || !ctx) return;
    const box = cv.getBoundingClientRect();

    // Chispas solo mientras se arrastra (si no, el bucle no pararía nunca).
    if (!d.reduce && d.active && d.p > 0.02 && btn) {
      const b = btn.getBoundingClientRect();
      d.acc += d.p * 4;
      while (d.acc >= 1) {
        d.acc -= 1;
        spawn(
          b.left - box.left + Math.random() * b.width,
          b.top - box.top + 6,
          (Math.random() - 0.5) * 1.2,
          -(1.2 + Math.random() * 2.4),
          45 + Math.random() * 45,
        );
      }
    }

    ctx.clearRect(0, 0, d.w, d.h);
    const parts = partsRef.current;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vx *= 0.992;
      p.vy = p.vy * 0.992 + 0.03;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      const k = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = k;
      ctx.fillStyle = p.c;
      ctx.shadowColor = p.c;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.6 + k * 0.7), 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (d.active || parts.length) d.raf = requestAnimationFrame(frame);
  }, [spawn]);

  const kick = useCallback(() => {
    const d = drag.current;
    if (!d.raf) d.raf = requestAnimationFrame(frame);
  }, [frame]);

  /** Grado de cercanía (0..1) entre el logo y el botón; lo pinta el CSS. */
  const syncProximity = useCallback(() => {
    const d = drag.current;
    const logo = logoRef.current;
    const btn = btnRef.current;
    const track = trackRef.current;
    if (!logo || !btn || !track) return;
    const l = logo.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const dx = l.left + l.width / 2 - (b.left + b.width / 2);
    const p = Math.pow(Math.max(0, 1 - Math.abs(dx) / Math.max(1, track.clientWidth * 0.5)), 1.3);
    d.p = p;
    btn.style.setProperty('--p', p.toFixed(3));
  }, []);

  /** Coloca el logo en una posición horizontal (con o sin transición). */
  const placeLogo = useCallback(
    (px: number, smooth: boolean) => {
      const d = drag.current;
      const logo = logoRef.current;
      d.off = clamp(px, 0, d.max);
      if (logo) {
        logo.style.transition = smooth ? 'transform 340ms var(--ease-out)' : 'none';
        logo.style.setProperty('--x', `${Math.round(d.off)}px`);
      }
      syncProximity();
    },
    [syncProximity],
  );

  /** Mide el recorrido del logo (el ancho útil menos su propio ancho). */
  const layout = useCallback(() => {
    const d = drag.current;
    const track = trackRef.current;
    const logo = logoRef.current;
    measure();
    if (!track || !logo) return;
    d.max = Math.max(0, track.clientWidth - logo.offsetWidth);
    placeLogo(d.off, false);
  }, [measure, placeLogo]);

  /** Ráfaga de chispas al buscar (la que se ve al pulsar). */
  const burst = useCallback(() => {
    const cv = canvasRef.current;
    const btn = btnRef.current;
    if (!cv || !btn) return;
    const box = cv.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const cx = b.left - box.left + b.width / 2;
    const cy = b.top - box.top + b.height / 2;
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * 6.283;
      const sp = 1.5 + Math.random() * 4.5;
      spawn(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp - 1, 50 + Math.random() * 40);
    }
    kick();
  }, [spawn, kick]);

  /** Busca: valida, celebra con chispas y lleva la vista a los resultados. */
  const runSearch = useCallback(() => {
    const d = drag.current;
    const v = value.trim();
    const input = document.getElementById(inputId) as HTMLInputElement | null;

    if (!v) {
      setMsg({ kind: 'error', text: 'Escribe un destino o tour para buscar.' });
      setShaking(true);
      window.clearTimeout(d.shakeTimer);
      d.shakeTimer = window.setTimeout(() => setShaking(false), 1000);
      input?.focus();
      return;
    }

    setMsg({ kind: 'ok', text: `Buscando «${v}»…` });
    if (!d.reduce) burst();
    const target = resultsId ? document.getElementById(resultsId) : null;
    target?.scrollIntoView({ behavior: d.reduce ? 'auto' : 'smooth', block: 'start' });
    input?.blur();
  }, [value, inputId, resultsId, burst]);

  /** Fin del arrastre: el logo sigue un poco y, si queda sobre el botón, busca. */
  const endDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d.active) return;
      d.active = false;
      const fromStart = Math.abs(d.off - d.startOff);
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      logoRef.current?.style.setProperty('--r', '0deg');
      placeLogo(d.off + d.vel * 140, true);
      if (fromStart > 6 && d.p >= DROP_P) runSearch();
    },
    [placeLogo, runSearch],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!withLogo || e.button !== 0) return;
    const d = drag.current;
    const now = performance.now();
    d.active = true;
    d.startX = e.clientX;
    d.startOff = d.off;
    d.prev = d.off;
    d.lastT = now;
    d.vel = 0;
    // En un puntero sintético (pruebas) no hay captura real: no pasa nada.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* sin captura */
    }
    kick();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    const now = performance.now();
    const next = clamp(d.startOff + (e.clientX - d.startX), 0, d.max);
    const dt = Math.max(1, now - d.lastT);
    d.vel = (next - d.prev) / dt;
    d.prev = next;
    d.lastT = now;
    placeLogo(next, false);
    logoRef.current?.style.setProperty('--r', `${clamp(d.vel * 12, -9, 9).toFixed(2)}deg`);
    kick();
  };

  const onLogoKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      placeLogo(d.off + (e.key === 'ArrowLeft' ? -40 : 40), true);
      kick();
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && d.p >= DROP_P) {
      e.preventDefault();
      runSearch();
    }
  };

  useEffect(() => {
    const d = drag.current;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      d.reduce = mq.matches;
    };
    apply();
    mq.addEventListener('change', apply);

    const ro = new ResizeObserver(() => layout());
    if (wrapRef.current) ro.observe(wrapRef.current);
    layout();

    return () => {
      mq.removeEventListener('change', apply);
      ro.disconnect();
      if (d.raf) cancelAnimationFrame(d.raf);
      if (d.shakeTimer) window.clearTimeout(d.shakeTimer);
    };
  }, [layout]);

  // Un cambio de mensaje puede cambiar la altura del bloque: reajusta el lienzo.
  useEffect(() => {
    measure();
  }, [msg, measure]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    runSearch();
  };

  const change = (v: string) => {
    if (msg.kind === 'error') setMsg({ kind: 'hint', text: HINT });
    onChange(v);
  };

  const msgCls =
    msg.kind === 'hint' ? 'text-stone-500' : msg.kind === 'error' ? 'text-red-600' : 'text-andino-700';

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      />

      {withLogo && (
        <div ref={trackRef} className="relative z-0 mb-3 w-full">
          <div
            ref={logoRef}
            role="group"
            tabIndex={0}
            aria-label="Logo de Chilón Tours. Arrástralo o usa las flechas del teclado"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onLogoKey}
            className="search-logo relative w-28 max-w-full sm:w-36"
          >
            <img
              src="/brand/chilon-tours-logo.png"
              alt=""
              width={520}
              height={492}
              loading="lazy"
              decoding="async"
              draggable={false}
              className={`w-full ${shaking ? 'animate__animated animate__shakeX' : ''}`}
            />
          </div>
        </div>
      )}

      <form
        role="search"
        onSubmit={submit}
        className="relative z-[5] flex items-center gap-2 rounded-[22px] border border-stone-200/90 bg-white/85 p-2 shadow-[0_24px_60px_-18px_rgba(32,59,39,0.25),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-xl transition-[border-color,box-shadow] duration-220 focus-within:border-oro-400 focus-within:ring-4 focus-within:ring-oro-400/25"
      >
        <Search size={20} aria-hidden className="ml-3 shrink-0 text-stone-400" />
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <input
          id={inputId}
          type="search"
          value={value}
          onChange={(e) => change(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="h-[52px] min-w-0 flex-1 appearance-none bg-transparent px-1.5 text-[15px] font-medium text-stone-800 caret-oro-500 outline-none placeholder:text-stone-400 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => change('')}
            aria-label="Limpiar búsqueda"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-stone-400 transition-[color,background-color,transform] duration-160 hover:bg-stone-100 hover:text-stone-700 active:scale-90"
          >
            <X size={15} />
          </button>
        )}
        <button
          ref={btnRef}
          type="submit"
          className="search-cta h-[52px] shrink-0 rounded-[15px] bg-gradient-to-b from-oro-400 via-oro-500 to-oro-600 px-5 text-sm font-bold text-tierra-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro-600 active:brightness-95 mouse:hover:brightness-105 sm:px-7 sm:text-base"
        >
          {actionLabel}
        </button>
      </form>

      {(withLogo || msg.kind !== 'hint') && (
        <p aria-live="polite" className={`relative z-[5] mt-2 text-xs font-medium ${msgCls}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
