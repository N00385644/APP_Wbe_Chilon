import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense, type ReactNode } from 'react';
import { 
  LogIn, LogOut, User, ShieldCheck, Menu, X, 
  Instagram, Youtube, Mail, Phone, MapPinned,
  Compass, CheckCircle2, Rotate3d
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SOCIALS } from '../../lib/site';
import { GlowButton } from '../shared/GlowButton';

// Three.js pesa ~600KB: se carga bajo demanda para no frenar el primer
// render; mientras tanto se muestra un esqueleto con el logo (solo opacity).
// H350Viewer usa el GLB real /models/hyundai-h350-solati.glb (607KB, 5 meshes).
const H350Viewer = lazy(() =>
  import('../viewer3d/H350Viewer').then((m) => ({ default: m.H350Viewer })),
);

const LOGO_URL = '/logo-chilon.png';

// Visor 3D (~645KB JS + ~607KB GLB): en escritorio con buena conexión se
// carga cuando el navegador queda libre; en móvil o con ahorro de datos
// solo si el cliente pulsa "Ver en 3D".
function shouldAutoLoad3d(): boolean {
  if (typeof window === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || /2g/.test(conn?.effectiveType ?? '')) return false;
  return window.matchMedia('(min-width: 768px)').matches;
}

function Viewer3dGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!shouldAutoLoad3d()) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) {
      w.requestIdleCallback(() => setShow(true));
      return;
    }
    const id = window.setTimeout(() => setShow(true), 1500);
    return () => window.clearTimeout(id);
  }, []);

  const placeholder = (children?: ReactNode) => (
    <div className="grid h-[400px] place-items-center overflow-hidden rounded-3xl border border-white/20 bg-andino-950/60 sm:h-[480px]">
      <div className="flex flex-col items-center gap-4 px-4 text-center">
        <img src={LOGO_URL} alt="" className="h-24 w-24 rounded-3xl bg-white object-contain p-2 opacity-90" />
        {children}
      </div>
    </div>
  );

  if (!show) {
    return placeholder(
      <>
        <p className="max-w-xs text-sm text-stone-300">Conoce por dentro y por fuera la movilidad en la que viajarás.</p>
        <button
          type="button"
          onClick={() => setShow(true)}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-andino-900 hover:bg-andino-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Rotate3d size={18} aria-hidden /> Ver la unidad en 3D
        </button>
      </>,
    );
  }

  return (
    <Suspense fallback={placeholder(<p className="animate-pulse text-sm text-stone-300" role="status">Cargando vista 3D…</p>)}>
      <H350Viewer />
    </Suspense>
  );
}

export function Header() {
  const { user, profile, signInWithGoogle, signOut } = useAuth();
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();
  const { pathname } = useLocation();
  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`));

  // Accesibilidad: cerrar el menú móvil con Escape sin cambiar navegación.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

  const linkCls = (to: string) =>
    `relative px-3 py-1.5 rounded-lg font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-andino-600 ${
      isActive(to)
        ? 'text-andino-800 bg-andino-50 font-bold ring-1 ring-andino-200'
        : 'text-stone-700 hover:text-andino-700 hover:bg-andino-50/70'
    }`;

  const links = (
    <>
      <Link
        className={linkCls('/')}
        to="/"
        aria-current={isActive('/') ? 'page' : undefined}
        onClick={() => setMenu(false)}
      >
        Inicio
      </Link>
      <Link
        className={linkCls('/tours')}
        to="/tours"
        aria-current={isActive('/tours') ? 'page' : undefined}
        onClick={() => setMenu(false)}
      >
        Tours
      </Link>
      <Link
        className={linkCls('/faq')}
        to="/faq"
        aria-current={isActive('/faq') ? 'page' : undefined}
        onClick={() => setMenu(false)}
      >
        Preguntas frecuentes
      </Link>
      {user && (
        <Link
          className={linkCls('/calendario')}
          to="/calendario"
          aria-current={isActive('/calendario') ? 'page' : undefined}
          onClick={() => setMenu(false)}
        >
          Mi calendario
        </Link>
      )}
      <Link
        className={`relative px-3 py-1.5 rounded-lg font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-andino-600 ${
          isActive('/perfil')
            ? 'text-andino-800 bg-andino-50 ring-1 ring-andino-200'
            : 'text-stone-700 hover:text-andino-700 hover:bg-andino-50/70'
        }`}
        to="/perfil"
        aria-current={isActive('/perfil') ? 'page' : undefined}
        onClick={() => setMenu(false)}
      >
        Mis solicitudes
      </Link>
      {profile?.is_admin && (
        <Link
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-tierra-700 font-bold bg-tierra-50 border border-tierra-200 hover:bg-tierra-100 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-andino-600"
          to="/admin"
          aria-current={isActive('/admin') ? 'page' : undefined}
          onClick={() => setMenu(false)}
        >
          <ShieldCheck size={16} /> Admin
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-stone-200/80 shadow-sm">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
        {/* Logotipo oficial */}
        <Link 
          to="/" 
          className="group flex items-center gap-2.5 font-extrabold text-andino-900 text-lg sm:text-xl tracking-tight transition-transform duration-200 ease-out mouse:hover:scale-[1.02] active:scale-[0.97]"
        >
          <img
            src={LOGO_URL}
            alt="Logo Chilón Tours"
            className="logo-badge h-10 w-10 rounded-2xl bg-white object-contain p-0.5 shadow-glow"
          />
          <div className="leading-tight">
            <span className="animate__animated animate__pulse animate__infinite animate__slower block text-[10px] font-semibold text-andino-600 tracking-wider uppercase">Turismo Chilón S.R.L.</span>
          </div>
        </Link>

        {/* Navegación Desktop (solo pantallas grandes: en tablet se usa el menú hamburguesa) */}
        <nav aria-label="Navegación principal" className="hidden lg:flex items-center gap-2 text-sm">
          {links}
        </nav>

        {/* Acciones de Usuario */}
        <div className="flex items-center gap-2.5">
          {!user ? (
            <button 
              onClick={signInWithGoogle} 
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-andino-700 to-andino-800 px-4 py-2 text-white text-sm font-semibold shadow-md hover:from-andino-800 hover:to-andino-900 hover:shadow-glow active:scale-95 transition-[box-shadow,transform] duration-200"
            >
              <LogIn size={16} /> Continuar con Google
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-2.5">
              <button 
                onClick={() => nav('/perfil')} 
                title={profile?.email ?? ''} 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white/90 text-sm font-medium text-stone-700 hover:border-andino-300 hover:text-andino-800 transition-[color,border-color,box-shadow] duration-200 shadow-sm"
              >
                <User size={16} className="text-andino-600" /> {profile?.full_name ?? 'Mi cuenta'}
              </button>
              <button 
                onClick={signOut} 
                className="inline-flex items-center gap-1 p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-160 active:scale-90" 
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}

          {/* Botón Menú Mobile */}
          <button
            onClick={() => setMenu(!menu)}
            aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menu}
            aria-controls="menu-movil"
            className="lg:hidden rounded-xl border border-stone-200 bg-white p-2 text-stone-700 hover:bg-stone-100 transition-colors shadow-sm min-h-11 min-w-11 grid place-items-center"
          >
            {menu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Menú Mobile Desplegable */}
      {menu && (
        <nav id="menu-movil" aria-label="Menú móvil" className="enter-drop origin-top lg:hidden border-t border-stone-200 bg-white/95 backdrop-blur-xl px-4 py-4 flex flex-col gap-2.5 text-sm shadow-xl">
          {links}
          <div className="pt-2 border-t border-stone-100 mt-1">
            {!user ? (
              <button 
                onClick={() => { setMenu(false); nav('/perfil'); }} 
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-andino-700 px-4 py-2.5 text-white text-sm font-semibold shadow-md active:scale-95"
              >
                <LogIn size={16} /> Entrar / Crear cuenta
              </button>
            ) : (
              <button 
                onClick={() => { setMenu(false); signOut(); }} 
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-stone-600 text-sm font-medium hover:bg-stone-50"
              >
                <LogOut size={16} /> Cerrar sesión ({profile?.full_name ?? 'mi cuenta'})
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-[#0b0f0e] text-white pt-8 pb-14 sm:pt-12 sm:pb-20">
      {/* Fondo cinematográfico: gradiente andino + grano + halo */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-900 via-andino-950 to-stone-900" aria-hidden />
      <div className="hero-grain absolute inset-0 opacity-[0.5]" aria-hidden />
      <div className="radial-hero-glow absolute inset-0 opacity-50 pointer-events-none" aria-hidden />
      <div className="mx-auto max-w-6xl px-4 relative z-10">
        {/* Encabezado Principal */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <h1 id="hero-title" className="stagger-item text-[2rem] sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-balance" style={{ animationDelay: '60ms' }}>
            Descubre la magia de{' '}
            <span className="bg-gradient-to-r from-amber-300 via-emerald-300 to-teal-200 bg-clip-text text-transparent">
              Cajamarca
            </span>
          </h1>

          <p className="stagger-item mt-4 text-base sm:text-lg text-stone-300 leading-relaxed max-w-2xl mx-auto" style={{ animationDelay: '120ms' }}>
            Cumbemayo, Baños del Inca, Ventanillas de Otuzco y Granja Porcón. Explora circuitos con guías oficiales,
            gira nuestra movilidad en 360° y reserva con total tranquilidad.
          </p>

          {/* Botones de Acción — pastilla "halo" con la paleta de la empresa */}
          <div className="stagger-item mt-6 grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3.5" style={{ animationDelay: '180ms' }}>
            <GlowButton
              to="/tours"
              variant="amarillo"
              ariaLabel="Explorar tours disponibles en Cajamarca"
              icon={<Compass size={18} aria-hidden />}
            >
              Explorar Tours
            </GlowButton>
            <GlowButton
              href="https://wa.me/51901195392?text=Hola%20Turismo%20Chil%C3%B3n%2C%20deseo%20informaci%C3%B3n%20para%20reservar%20un%20tour"
              variant="verde"
              ariaLabel="Consultar disponibilidad por WhatsApp"
            >
              Reservar por WhatsApp
            </GlowButton>
          </div>
        </div>

        {/* Escena 3D protagonista: modelo real de la unidad */}
        <div className="mt-4 sm:mt-6">
          <Viewer3dGate />
        </div>

      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-stone-200/90 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm text-stone-600 sm:grid-cols-2 lg:grid-cols-4">
        {/* Columna 1: Datos de Contacto Oficiales */}
        <div>
          <div className="flex items-center gap-2 text-andino-900 font-extrabold text-lg mb-3">
            <img src={LOGO_URL} alt="Logo Chilón Tours" className="logo-badge h-8 w-8 rounded-xl bg-white object-contain p-0.5 shadow-sm" loading="lazy" />
            <span>Turismo Chilón S.R.L.</span>
          </div>
          <p className="text-xs text-stone-500 mb-3">Viajes que inspiran · Cajamarca, Perú.</p>
          <div className="space-y-2 text-xs sm:text-sm">
            <p className="flex items-center gap-2"><MapPinned size={15} className="text-andino-600 shrink-0" /> {SOCIALS.address}</p>
            <p className="flex items-center gap-2"><Mail size={15} className="text-andino-600 shrink-0" /> {SOCIALS.email}</p>
            <p className="flex items-center gap-2"><Phone size={15} className="text-andino-600 shrink-0" /> {SOCIALS.phone1} · {SOCIALS.phone2}</p>
          </div>
        </div>

        {/* Columna 2: Compromiso y Garantía */}
        <div>
          <h4 className="font-bold text-stone-900 mb-3 uppercase tracking-wider text-xs">Garantías de Servicio</h4>
          <ul className="space-y-2 text-xs sm:text-sm text-stone-600">
            <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> Unidades climatizadas y monitoreadas</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> Conductores homologados minero y turismo</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> Boletos y guiado profesional incluidos</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> Pagos seguros con Yape, Plin y bancos</li>
          </ul>
        </div>

        {/* Columna 3: Enlaces funcionales */}
        <nav aria-label="Enlaces del sitio">
          <h4 className="font-bold text-stone-900 mb-3 uppercase tracking-wider text-xs">Explora</h4>
          <ul className="space-y-2 text-xs sm:text-sm font-medium">
            <li><Link to="/tours" className="text-stone-600 hover:text-andino-700 hover:underline underline-offset-4">Tours y circuitos</Link></li>
            <li><Link to="/faq" className="text-stone-600 hover:text-andino-700 hover:underline underline-offset-4">Preguntas frecuentes</Link></li>
            <li><Link to="/calendario" className="text-stone-600 hover:text-andino-700 hover:underline underline-offset-4">Mi calendario</Link></li>
            <li><Link to="/perfil" className="text-stone-600 hover:text-andino-700 hover:underline underline-offset-4">Mis solicitudes</Link></li>
            <li><Link to="/privacidad" className="text-stone-600 hover:text-andino-700 hover:underline underline-offset-4">Aviso de privacidad</Link></li>
          </ul>
        </nav>

        {/* Columna 4: Redes Sociales */}
        <div className="sm:col-span-2 lg:col-span-1">
          <h4 className="font-bold text-stone-900 mb-3 uppercase tracking-wider text-xs">Síguenos en Redes</h4>
          <div className="flex flex-wrap gap-2.5">
            <a 
              href={SOCIALS.instagram} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 font-semibold text-stone-700 hover:border-pink-300 hover:text-pink-600 hover:bg-pink-50 transition-colors duration-200 shadow-sm"
            >
              <Instagram size={16} /> Instagram
            </a>
            <a 
              href={SOCIALS.tiktok} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 font-semibold text-stone-700 hover:border-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors duration-200 shadow-sm"
            >
              🎵 TikTok
            </a>
            <a 
              href={SOCIALS.youtubeVideo} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 font-semibold text-stone-700 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors duration-200 shadow-sm"
            >
              <Youtube size={16} /> YouTube
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-stone-100 bg-stone-50/50 py-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Turismo Chilón S.R.L. Todos los derechos reservados. Cajamarca, Perú.</p>
          <Link to="/privacidad" className="underline hover:text-stone-800 transition-colors">
            Aviso de privacidad y protección de datos
          </Link>
        </div>
      </div>
    </footer>
  );
}
