import { Link, useNavigate } from 'react-router-dom';
import { useState, lazy, Suspense } from 'react';
import { 
  LogIn, LogOut, User, ShieldCheck, Menu, X, 
  Instagram, Youtube, Mail, Phone, MapPinned, Sparkles, 
  Compass, CheckCircle2, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SOCIALS } from '../lib/site';

// Three.js pesa ~600KB: se carga bajo demanda para no frenar el primer
// render; mientras tanto se muestra un esqueleto con el logo (solo opacity).
// H350Viewer usa el GLB real /models/hyundai-h350-solati.glb (607KB, 5 meshes).
const H350Viewer = lazy(() =>
  import('./H350Viewer').then((m) => ({ default: m.H350Viewer })),
);

const LOGO_URL = '/logo-chilon.png';

export function Header({ brand }: { brand: string }) {
  const { user, profile, signInWithGoogle, signOut } = useAuth();
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();

  const links = (
    <>
      <Link 
        className="relative px-3 py-1.5 rounded-lg text-stone-700 font-medium hover:text-andino-700 hover:bg-andino-50/70 transition-all duration-200" 
        to="/" 
        onClick={() => setMenu(false)}
      >
        Inicio
      </Link>
      <Link 
        className="relative px-3 py-1.5 rounded-lg text-stone-700 font-medium hover:text-andino-700 hover:bg-andino-50/70 transition-all duration-200" 
        to="/tours" 
        onClick={() => setMenu(false)}
      >
        Tours
      </Link>
      <Link 
        className="relative px-3 py-1.5 rounded-lg text-stone-700 font-medium hover:text-andino-700 hover:bg-andino-50/70 transition-all duration-200" 
        to="/faq" 
        onClick={() => setMenu(false)}
      >
        Preguntas frecuentes
      </Link>
      {user && (
        <Link 
          className="relative px-3 py-1.5 rounded-lg text-stone-700 font-medium hover:text-andino-700 hover:bg-andino-50/70 transition-all duration-200" 
          to="/calendario" 
          onClick={() => setMenu(false)}
        >
          Mi calendario
        </Link>
      )}
      <Link 
        className="relative px-3 py-1.5 rounded-lg text-stone-700 font-semibold hover:text-andino-700 hover:bg-andino-50/70 transition-all duration-200" 
        to="/perfil" 
        onClick={() => setMenu(false)}
      >
        Mis solicitudes
      </Link>
      {profile?.is_admin && (
        <Link 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-tierra-700 font-bold bg-tierra-50 border border-tierra-200 hover:bg-tierra-100 transition-all duration-200" 
          to="/admin" 
          onClick={() => setMenu(false)}
        >
          <ShieldCheck size={16} /> Admin
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-stone-200/80 shadow-sm transition-all duration-300">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
        {/* Logotipo oficial */}
        <Link 
          to="/" 
          className="group flex items-center gap-2.5 font-extrabold text-andino-900 text-lg sm:text-xl tracking-tight transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.97]"
        >
          <img
            src={LOGO_URL}
            alt="Logo Chilón Tours"
            className="logo-badge h-10 w-10 rounded-2xl bg-white object-contain p-0.5 shadow-glow"
          />
          <div className="leading-tight">
            <span>{brand}</span>
            <span className="block text-[10px] font-semibold text-andino-600 tracking-wider uppercase">Turismo Chilón S.R.L.</span>
          </div>
        </Link>

        {/* Navegación Desktop */}
        <nav className="hidden md:flex items-center gap-2 text-sm">
          {links}
        </nav>

        {/* Acciones de Usuario */}
        <div className="flex items-center gap-2.5">
          {!user ? (
            <button 
              onClick={signInWithGoogle} 
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-andino-700 to-andino-800 px-4 py-2 text-white text-sm font-semibold shadow-md hover:from-andino-800 hover:to-andino-900 hover:shadow-glow transition-all duration-200 active:scale-95"
            >
              <LogIn size={16} /> Continuar con Google
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-2.5">
              <button 
                onClick={() => nav('/perfil')} 
                title={profile?.email ?? ''} 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white/90 text-sm font-medium text-stone-700 hover:border-andino-300 hover:text-andino-800 transition-all shadow-sm"
              >
                <User size={16} className="text-andino-600" /> {profile?.full_name ?? 'Mi cuenta'}
              </button>
              <button 
                onClick={signOut} 
                className="inline-flex items-center gap-1 p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all" 
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}

          {/* Botón Menú Mobile */}
          <button 
            onClick={() => setMenu(!menu)} 
            aria-label="Abrir menú" 
            className="md:hidden rounded-xl border border-stone-200 bg-white p-2 text-stone-700 hover:bg-stone-100 transition-colors shadow-sm"
          >
            {menu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Menú Mobile Desplegable */}
      {menu && (
        <nav className="md:hidden border-t border-stone-200 bg-white/95 backdrop-blur-xl px-4 py-4 flex flex-col gap-2.5 text-sm shadow-xl">
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
    <section className="relative overflow-hidden bg-[#0b0f0e] text-white pt-8 pb-14 sm:pt-12 sm:pb-20">
      {/* Fondo cinematográfico: gradiente andino + grano + halo */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-900 via-andino-950 to-stone-900" aria-hidden />
      <div className="hero-grain absolute inset-0 opacity-[0.5]" aria-hidden />
      <div className="radial-hero-glow absolute inset-0 opacity-50 pointer-events-none" aria-hidden />
      <div className="mx-auto max-w-6xl px-4 relative z-10">
        {/* Encabezado Principal y Badge 3D */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <div className="reveal-in inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-badge text-amber-300 text-xs sm:text-sm font-semibold mb-4 shadow-sm">
            <Sparkles size={16} className="text-amber-400" />
            <span>Hyundai H350 Solati 2019 · flota propia en 3D interactivo</span>
          </div>

          <h1 className="reveal-in text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.12] tracking-tight">
            Descubre la magia de{' '}
            <span className="bg-gradient-to-r from-amber-300 via-emerald-300 to-teal-200 bg-clip-text text-transparent">
              Cajamarca
            </span>
          </h1>

          <p className="reveal-in mt-4 text-base sm:text-lg text-stone-300 leading-relaxed max-w-2xl mx-auto">
            Cumbemayo, Baños del Inca, Ventanillas de Otuzco y Granja Porcón. Explora circuitos con guías oficiales,
            gira nuestra H350 en 360° y reserva con total tranquilidad.
          </p>

          {/* Botones de Acción */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              to="/tours"
              className="btn-3d inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-andino-600 px-6 py-3 font-bold text-white text-sm sm:text-base shadow-glow hover:brightness-110 transition-all"
            >
              <Compass size={18} /> Explorar Tours <ArrowRight size={16} />
            </Link>
            <a
              href="https://wa.me/51901195392?text=Hola%20Turismo%20Chil%C3%B3n%2C%20deseo%20informaci%C3%B3n%20para%20reservar%20un%20tour"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl glass-panel-dark px-5 py-3 font-semibold text-stone-200 text-sm sm:text-base hover:bg-white/10 hover:text-white transition-all border border-white/20"
            >
              Reservar por WhatsApp
            </a>
          </div>
        </div>

        {/* Escena 3D protagonista: GLB real Hyundai H350 */}
        <div className="mt-4 sm:mt-6 transition-all duration-500">
          <Suspense
            fallback={
              <div className="grid h-[400px] place-items-center overflow-hidden rounded-3xl border border-white/20 bg-andino-950/60 sm:h-[480px]" aria-hidden>
                <img src={LOGO_URL} alt="" className="h-24 w-24 animate-pulse rounded-3xl bg-white object-contain p-2 opacity-90" />
              </div>
            }
          >
            <H350Viewer />
          </Suspense>
          <p className="mt-3 text-center text-[11px] sm:text-xs text-stone-400">
            Modelo GLB real · arrastra para rotar · scroll para explorar la página (la cámara acompaña sutilmente)
          </p>
        </div>

        {/* Indicador de scroll */}
        <div className="mt-6 flex justify-center" aria-hidden>
          <span className="scroll-hint inline-flex flex-col items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-stone-400">
            Desliza
            <span className="block h-8 w-5 rounded-full border border-white/25 p-1"><span className="scroll-dot block h-1.5 w-1.5 rounded-full bg-amber-300 mx-auto" /></span>
          </span>
        </div>

        {/* Métricas y Valores Clave de Calidad */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="glass-panel-dark rounded-2xl p-4 text-center border border-white/10 shadow-sm hover:border-andino-400/40 transition-colors">
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-400">+10 Años</p>
            <p className="text-xs sm:text-sm text-stone-300 mt-1">Liderando el turismo local</p>
          </div>
          <div className="glass-panel-dark rounded-2xl p-4 text-center border border-white/10 shadow-sm hover:border-andino-400/40 transition-colors">
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">100% Guías</p>
            <p className="text-xs sm:text-sm text-stone-300 mt-1">Oficiales y certificados</p>
          </div>
          <div className="glass-panel-dark rounded-2xl p-4 text-center border border-white/10 shadow-sm hover:border-andino-400/40 transition-colors">
            <p className="text-2xl sm:text-3xl font-extrabold text-teal-400">Vans & Buses</p>
            <p className="text-xs sm:text-sm text-stone-300 mt-1">Flota moderna con GPS y SOAT</p>
          </div>
          <div className="glass-panel-dark rounded-2xl p-4 text-center border border-white/10 shadow-sm hover:border-andino-400/40 transition-colors">
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-300">Asistencia IA</p>
            <p className="text-xs sm:text-sm text-stone-300 mt-1">Cotizaciones 24/7 en tiempo real</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-stone-200/90 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm text-stone-600 sm:grid-cols-2 lg:grid-cols-3">
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

        {/* Columna 3: Redes Sociales */}
        <div className="sm:col-span-2 lg:col-span-1">
          <h4 className="font-bold text-stone-900 mb-3 uppercase tracking-wider text-xs">Síguenos en Redes</h4>
          <div className="flex flex-wrap gap-2.5">
            <a 
              href={SOCIALS.instagram} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 font-semibold text-stone-700 hover:border-pink-300 hover:text-pink-600 hover:bg-pink-50 transition-all shadow-sm"
            >
              <Instagram size={16} /> Instagram
            </a>
            <a 
              href={SOCIALS.tiktok} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 font-semibold text-stone-700 hover:border-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all shadow-sm"
            >
              🎵 TikTok
            </a>
            <a 
              href={SOCIALS.youtubeVideo} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 font-semibold text-stone-700 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all shadow-sm"
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
