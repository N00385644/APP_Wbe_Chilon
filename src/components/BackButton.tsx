import { Link, useNavigate } from 'react-router-dom';
import type { MouseEvent } from 'react';
import { ArrowLeft } from 'lucide-react';

type Props = {
  to?: string;
  label?: string;
  className?: string;
};

/**
 * Flecha profesional para regresar.
 * - Si hay historial, hace navigate(-1) (respeta de dónde vino el usuario).
 * - Si no, cae a `to` (por defecto /tours).
 * - Press feedback 160ms ease-out + :active scale(0.97) según emil-design-eng.
 */
export function BackButton({ to = '/tours', label = 'Volver', className = '' }: Props) {
  const nav = useNavigate();

  const goBack = (e: MouseEvent) => {
    // Si vino por link interno hay historial; si entró directo, ir a `to`.
    if (window.history.length > 1) {
      e.preventDefault();
      nav(-1);
    }
  };

  return (
    <Link
      to={to}
      onClick={goBack}
      aria-label={`${label} — regresar a la página anterior`}
      className={`back-btn inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white/90 px-3.5 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:border-andino-300 hover:text-andino-800 hover:shadow-md ${className}`}
    >
      <ArrowLeft size={16} className="back-btn-icon text-andino-600" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
