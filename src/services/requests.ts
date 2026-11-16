// Fuente única de escritura/lectura de solicitudes del usuario.
// El chat, el formulario de contacto y el perfil usan este módulo;
// las reglas de recorte y coherencia viven en src/schemas/requests.ts.
import { supabase } from '../lib/supabase';
import type { TourRequest } from '../lib/types';

// Las notas internas se leen únicamente mediante una RPC que comprueba el rol admin.
export const REQUEST_PUBLIC_COLUMNS = 'id,user_id,tour_id,requested_destination,preferred_date,date_is_flexible,adults,children,travelers_count,contact_phone,additional_notes,status,created_at,updated_at,confirmed_date,departure_time,meeting_point,departure_notes,requested_seats,confirmed_seats,reminder_sent_at';

export async function fetchAdminNotes(ids: string[]): Promise<Record<string, string | null>> {
  if (!ids.length) return {};
  const { data, error } = await supabase.rpc('get_admin_request_notes', { p_ids: ids });
  if (error) throw new Error('No se pudieron cargar los comentarios internos.');
  return Object.fromEntries(((data ?? []) as { id: string; admin_notes: string | null }[])
    .map((row) => [row.id, row.admin_notes]));
}

export type CreateRequestInput = {
  user_id: string;
  tour_id: string | null;
  requested_destination: string | null;
  preferred_date: string | null;
  date_is_flexible: boolean;
  adults: number;
  children: number;
  travelers_count: number;
  contact_phone: string | null;
  additional_notes: string | null;
  status: 'pending';
  requested_seats?: string | null;
  confirmed_seats?: string | null;
};

/**
 * Consulta los asientos ya ocupados para un tour y fecha determinados.
 * La RPC devuelve solo números de asiento, sin datos personales.
 */
export async function fetchOccupiedSeats(params: { tourId?: string | null; date?: string | null }): Promise<string[]> {
  if (!params.date || !params.tourId) return [];
  const { data, error } = await supabase.rpc('get_occupied_seats', {
    p_tour_id: params.tourId,
    p_date: params.date,
  });
  // RLS solo deja leer solicitudes propias: una consulta directa no mide disponibilidad.
  if (error || !Array.isArray(data)) {
    throw new Error('No se pudo consultar la disponibilidad. Reintenta o coordina los asientos por WhatsApp.');
  }
  return (data as { seat: string }[]).map((r) => r.seat).filter(Boolean);
}

export async function fetchMyRequests(userId: string): Promise<TourRequest[]> {
  const { data, error } = await supabase
    .from('tour_requests')
    .select(REQUEST_PUBLIC_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as TourRequest[];
}

export async function cancelMyRequest(id: string): Promise<void> {
  const { data, error } = await supabase.from('tour_requests')
    .update({ status: 'cancelled' }).eq('id', id).select('id').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('La solicitud cambió de estado o ya no puedes cancelarla. Actualiza la lista.');
}

/**
 * Mensaje comprensible ante fallo de guardado. Nunca expone SQL, claves ni
 * tokens: clasifica el error crudo y devuelve texto para el visitante.
 * Además nunca afirma que la solicitud fue registrada.
 */
export function friendlySaveError(raw: unknown): string {
  const msg = raw instanceof Error ? raw.message : String(raw ?? '');
  if (/tour_id|no existe en el catálogo|debe referenciar un tour publicado/i.test(msg)) {
    return 'El tour elegido ya no está publicado. Elige otro del menú o continúa como destino libre por WhatsApp. No se guardó nada todavía.';
  }
  if (/Failed to fetch|NetworkError|network|timeout|AbortError/i.test(msg)) {
    return 'Sin conexión con el servidor: no se guardó nada. Revisa tu internet y pulsa de nuevo, o continúa por WhatsApp. Tus datos siguen aquí.';
  }
  return 'No se pudo guardar la solicitud. No se registró nada: reintenta o continúa por WhatsApp.';
}
