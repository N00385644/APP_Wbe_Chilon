// Tabla única de rutas públicas (conserva React Router + Vite).
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Header, Footer } from '../components/layout/Layout';
import { ChatWidget } from '../features/chatbot/components/ChatWidget';
import { Home } from './pages/Home';
import { Tours, TourDetail } from './pages/Tours';
import { FaqPage } from './pages/Faq';
import { Profile } from './pages/Profile';
import { CalendarPage } from './pages/Calendar';
import { Admin } from './pages/Admin';
import { Privacy } from './pages/Privacy';

const BRAND = 'Cajamarca Tours';

export function Router() {
  return (
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
  );
}
