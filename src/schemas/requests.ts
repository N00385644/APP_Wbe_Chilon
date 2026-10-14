// Reglas únicas de construcción de solicitudes (límite de campos + coherencia).
// Usado por el chat (ChatWidget) y el formulario de contacto (ContactoSection):
// una sola regla, sin duplicar entre chat, formularios y admin.
import type { BookingDraft } from '../features/chatbot/engine/chatTree';
import { coerceTourLink } from '../features/chatbot/engine/chatTree';
import type { CreateRequestInput } from '../services/requests';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function clampTravelers(adultsIn: unknown, childrenIn: unknown): { adults: number; children: number } {
  const adults = Math.max(1, Math.min(50, Math.floor(Number(adultsIn ?? 1)) || 1));
  const children = Math.max(0, Math.min(50, Math.floor(Number(childrenIn ?? 0)) || 0));
  return { adults, children };
}

/**
 * Construye el payload de INSERT con un tour_id ya validado.
 * El llamador debe resolver slug->id contra tours publicados antes
 * (ver services/tours.ts). Aquí solo se sanea: un tour_id no-UUID
 * se descarta a null en lugar de inventar relaciones.
 */
export function buildTourRequestPayload(args: {
  userId: string;
  draft: BookingDraft;
  tourId: string | null;
  dateIsFlexible?: boolean;
}): CreateRequestInput {
  const { adults, children } = clampTravelers(args.draft.adults, args.draft.children);
  const tour_id = args.tourId && UUID_RE.test(args.tourId.trim()) ? args.tourId : coerceTourLink(args.tourId);
  return {
    user_id: args.userId,
    tour_id,
    requested_destination: (args.draft.requested_destination ?? '').slice(0, 200) || null,
    preferred_date: args.draft.preferred_date ?? null,
    date_is_flexible: args.dateIsFlexible ?? false,
    adults,
    children,
    travelers_count: adults + children,
    contact_phone: args.draft.contact_phone?.slice(0, 30) ?? null,
    additional_notes: args.draft.additional_notes?.slice(0, 2000) ?? null,
    status: 'pending',
  };
}
