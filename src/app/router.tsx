// Tabla única de rutas públicas (conserva React Router + Vite).
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Header, Footer } from '../components/layout/Layout';
import { ChatWidget } from '../features/chatbot/components/ChatWidget';
import { Home } from './pages/Home';
import { Tours, TourDetail } from './pages/Tours';

// Páginas secundarias en chunks propios: la portada y los tours cargan primero.
const FaqPage = lazy(() => import('./pages/Faq').then((m) => ({ default: m.FaqPage })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const CalendarPage = lazy(() => import('./pages/Calendar').then((m) => ({ default: m.CalendarPage })));
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })));
const Privacy = lazy(() => import('./pages/Privacy').then((m) => ({ default: m.Privacy })));

const pageFallback = (
  <main className="grid min-h-[50vh] place-items-center p-16 text-sm text-stone-500" role="status">
    Cargando…
  </main>
);

export function Router() {
  return (
    <BrowserRouter>
      <Header />
      <Suspense fallback={pageFallback}>
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
      </Suspense>
      <Footer />
      <ChatWidget />
    </BrowserRouter>
  );
}
