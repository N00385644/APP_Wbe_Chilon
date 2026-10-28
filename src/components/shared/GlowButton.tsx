import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';

/** Cada cuánto puede nacer una burbuja al mover el cursor (ms). */
const BUBBLE_EVERY = 85;
/** Cuántas gotas salpican al pulsar. */
const DROPS = 12;

type Props = {
  children: ReactNode;
  /** Enlace interno (React Router). Tiene prioridad sobre `href`. */
  to?: string;
  /** Enlace externo (WhatsApp, redes…). */
  href?: string;
  /** Color del agua, de la paleta de la empresa. */
  variant?: 'amarillo' | 'verde';
  icon?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
  ariaLabel?: string;
};

/**
 * Botón "agua" (estilo Oleada).
 *
 * - En reposo es una pastilla de vidrio con la tinta de la casa; al entrar el
 *   cursor, el agua la inunda **desde ese mismo punto** (un círculo que se
 *   expande) y el texto pasa a blanco.
 * - Con el vaso lleno el brillo persigue al ratón, salen burbujas al moverlo y
 *   el botón se eleva; al pulsar se aplasta (jelly), suelta una onda y una
 *   salpicadura de gotas que caen fuera del botón.
 * - Inspirado en «Botones de agua» (2026-10-18); reimplementación propia, sin
 *   código de terceros ni fuentes externas (aquí manda Inter/Outfit).
 * - En táctil el agua entra al pulsar y se retira sola a los 800 ms. Con el
 *   teclado: al enfocar (`:focus-visible`) se llena, y Enter/Espacio salpica.
 * - `prefers-reduced-motion`: sin burbujas ni gotas y la marea entra de golpe.
 */
export function GlowButton({
  children,
  to,
  href,
  variant = 'amarillo',
  icon,
  iconRight,
  className = '',
  ariaLabel,
}: Props) {
  const faceRef = useRef<HTMLAnchorElement>(null);
  const lastBubble = useRef(0);
  const touchTimer = useRef(0);
  const reduceRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      reduceRef.current = mq.matches;
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      if (touchTimer.current) window.clearTimeout(touchTimer.current);
    };
  }, []);

  /** Punto del cursor relativo a la pastilla. */
  const localPoint = (e: ReactPointerEvent<HTMLAnchorElement>) => {
    const face = faceRef.current;
    if (!face) return null;
    const r = face.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const setVars = (x: number, y: number) => {
    const face = faceRef.current;
    if (!face) return;
    face.style.setProperty('--mx', `${x}px`);
    face.style.setProperty('--my', `${y}px`);
  };

  const bubble = (x: number, y: number) => {
    const face = faceRef.current;
    if (!face) return;
    const b = document.createElement('i');
    const size = 5 + Math.random() * 10;
    b.className = 'glow-bub';
    b.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;--dx:${(Math.random() - 0.5) * 34}px`;
    b.addEventListener('animationend', () => b.remove());
    face.appendChild(b);
  };

  const ripple = (x: number, y: number) => {
    const face = faceRef.current;
    if (!face) return;
    const r = document.createElement('i');
    r.className = 'glow-rip';
    r.style.left = `${x}px`;
    r.style.top = `${y}px`;
    r.addEventListener('animationend', () => r.remove());
    face.appendChild(r);
  };

  const splash = (clientX: number, clientY: number) => {
    const face = faceRef.current;
    if (!face) return;
    const light = getComputedStyle(face).getPropertyValue('--spot').trim() || '#fbbf24';
    for (let i = 0; i < DROPS; i++) {
      const drop = document.createElement('i');
      const angle = Math.random() * Math.PI * 2;
      const radius = 30 + Math.random() * 60;
      const size = 5 + Math.random() * 8;
      drop.className = 'glow-drop';
      drop.style.cssText =
        `left:${clientX}px;top:${clientY}px;width:${size}px;height:${size}px;background:${light};` +
        `--dx:${Math.cos(angle) * radius}px;--dy:${Math.sin(angle) * radius - 20}px`;
      drop.addEventListener('animationend', () => drop.remove());
      document.body.appendChild(drop);
    }
  };

  const enter = (e: ReactPointerEvent<HTMLAnchorElement>) => {
    const p = localPoint(e);
    if (!p) return;
    setVars(p.x, p.y);
    faceRef.current?.classList.add('is-on');
  };

  const move = (e: ReactPointerEvent<HTMLAnchorElement>) => {
    const p = localPoint(e);
    if (!p) return;
    setVars(p.x, p.y);
    if (reduceRef.current) return;
    const now = performance.now();
    if (now - lastBubble.current > BUBBLE_EVERY) {
      lastBubble.current = now;
      bubble(p.x, p.y);
    }
  };

  const down = (e: ReactPointerEvent<HTMLAnchorElement>) => {
    const p = localPoint(e);
    faceRef.current?.classList.add('is-on', 'is-press');
    if (p) setVars(p.x, p.y);
    if (reduceRef.current) return;
    if (p) ripple(p.x, p.y);
    splash(e.clientX, e.clientY);
  };

  const up = (e: ReactPointerEvent<HTMLAnchorElement>) => {
    const face = faceRef.current;
    face?.classList.remove('is-press');
    if (e.pointerType === 'touch' && face) {
      window.clearTimeout(touchTimer.current);
      touchTimer.current = window.setTimeout(() => face.classList.remove('is-on'), 800);
    }
  };

  const leave = () => {
    faceRef.current?.classList.remove('is-on', 'is-press');
  };

  const key = (e: KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const face = faceRef.current;
    if (!face || reduceRef.current) return;
    const r = face.getBoundingClientRect();
    ripple(r.width / 2, r.height / 2);
    splash(r.left + r.width / 2, r.top + r.height / 2);
  };

  const focus = () => {
    const face = faceRef.current;
    if (face?.matches(':focus-visible')) face.classList.add('is-on');
  };

  const blur = () => {
    faceRef.current?.classList.remove('is-on');
  };

  const shared = {
    className: 'glow-face',
    onPointerEnter: enter,
    onPointerMove: move,
    onPointerLeave: leave,
    onPointerDown: down,
    onPointerUp: up,
    onPointerCancel: up,
    onFocus: focus,
    onBlur: blur,
    onKeyDown: key,
  };

  const content = (
    <>
      <span className="glow-tide" aria-hidden="true" />
      <span className="glow-shine" aria-hidden="true" />
      <span className="glow-label">
        {icon}
        <span>{children}</span>
        {iconRight}
      </span>
    </>
  );

  return (
    <span className={`glow-wrap glow-${variant} w-full sm:w-auto ${className}`}>
      {to ? (
        <Link ref={faceRef} to={to} aria-label={ariaLabel} {...shared}>
          {content}
        </Link>
      ) : (
        <a
          ref={faceRef}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ariaLabel}
          {...shared}
        >
          {content}
        </a>
      )}
    </span>
  );
}
