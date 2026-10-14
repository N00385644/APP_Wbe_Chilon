// Puerta del panel administrativo (guarda de rol; el contenido vive en features/admin).
import { Link, Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BackButton } from '../../components/shared/BackButton';
import { AdminPanel } from '../../features/admin/components/AdminPanel';

export function Admin() {
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
