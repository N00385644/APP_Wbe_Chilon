// WhatsApp Business de Turismo Chilón — handoff del árbol de decisiones.
// Sin API keys: se usa deep-link wa.me con texto pre-rellenado. El equipo de
// la empresa continúa la conversación allí.
// Nota técnica: WhatsApp no permite iframe embebido (X-Frame-Options: DENY),
// por eso el chat muestra un "preview" interno + botón que abre wa.me.

import type { BookingDraft } from '../engine/chatTree';
import { totalTravelers } from '../../../schemas/requests';

export const WHATSAPP_NUMBER = '51901195392';
export const WHATSAPP_DISPLAY = '+51 901 195 392';
export const WHATSAPP_BASE = `https://wa.me/${WHATSAPP_NUMBER}`;

export function waLink(message: string): string {
  return `${WHATSAPP_BASE}?text=${encodeURIComponent(message)}`;
}

// Imágenes de marca en local (public/): logo oficial con fondo transparente
// procesado desde img/descargar.png + foto real de la flota.
export const BRAND_IMAGES = {
  logo: '/logo-chilon.png',
  portada: '/tours/wa-bus-01.jpg',
  logoAlt: '/logo-chilon.png',
} as const;

export function buildBookingMessage(d: BookingDraft, tourTitle?: string): string {
  const adults = typeof d.adults === 'number' && Number.isInteger(d.adults) ? d.adults : 1;
  const children = typeof d.children === 'number' && Number.isInteger(d.children) ? d.children : 0;
  const total = totalTravelers(adults, children);
  const fecha = d.preferred_date ?? (d.date_is_flexible ? 'flexible' : 'por definir');
  const lines = [
    'Hola Turismo Chilón, vengo del asistente web y quiero continuar por aquí.',
    '',
    `• Destino: ${d.requested_destination ?? tourTitle ?? '—'}`,
    `• Fecha: ${fecha}`,
    `• Viajeros: ${total} (adultos: ${adults}, menores: ${children})`,
  ];
  if (d.contact_phone) lines.push(`• Mi teléfono: ${d.contact_phone}`);
  if (d.additional_notes) lines.push(`• Notas: ${d.additional_notes.slice(0, 300)}`);
  lines.push('', '¿Me confirman disponibilidad y precio? Gracias.');
  return lines.join('\n');
}

export function buildTourMessage(tourTitle: string, question: 'precio' | 'reserva' | 'info' = 'info'): string {
  const q =
    question === 'precio'
      ? `¿Cuál es el precio y horario del tour "${tourTitle}"?`
      : question === 'reserva'
        ? `Quiero reservar el tour "${tourTitle}". ¿Me confirman disponibilidad y precio?`
        : `Me interesa el tour "${tourTitle}". ¿Me dan más información?`;
  return `Hola Turismo Chilón, vengo del asistente web.\n${q}`;
}

export function buildFaqMessage(topic: string, detail?: string): string {
  return [
    'Hola Turismo Chilón, vengo del asistente web.',
    `Mi consulta es sobre: ${topic}.`,
    detail ? `Detalle: ${detail}` : '',
    '¿Me pueden ayudar?',
  ]
    .filter(Boolean)
    .join('\n');
}
