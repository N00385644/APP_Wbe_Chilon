// Aviso de privacidad (contenido estático).
import { BackButton } from '../../components/shared/BackButton';

export function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-sm text-stone-700 leading-relaxed">
      <BackButton to="/" label="Volver al inicio" className="mb-6" />
      <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Aviso de Privacidad</h1>
      <p className="mt-1 text-xs text-stone-400">Última actualización: {new Date().getFullYear()}</p>

      <div className="mt-6 space-y-4">
        <p><b>1. Datos que recopilamos:</b> Nombre, correo electrónico (vía Google Auth), teléfono de contacto (solo si lo proporcionas para coordinar el recojo) y detalles de tu solicitud (fechas y cantidad de pasajeros).</p>
        <p><b>2. Finalidad del tratamiento:</b> Los datos se utilizan única y exclusivamente para gestionar tus solicitudes de viaje, responder tus consultas a través del asistente virtual y coordinar la confirmación con nuestro equipo.</p>
        <p><b>3. Seguridad y Privacidad:</b> No almacenamos datos bancarios, contraseñas ni vendemos información a terceros. Toda comunicación con el asistente virtual respeta los estándares de seguridad.</p>
        <p><b>4. Derechos ARCO:</b> Puedes solicitar la rectificación o eliminación de tus datos en cualquier momento escribiendo a informes@turismochilon.com.</p>
      </div>
    </main>
  );
}
