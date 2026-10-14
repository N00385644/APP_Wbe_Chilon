// Fuente única de escritura/lectura de solicitudes del usuario.
// El chat, el formulario de contacto y el perfil usan este módulo;
// las reglas de recorte y coherencia viven en src/schemas/requests.ts.
import { supabase } from '../lib/supabase';
import type { TourRequest } from '../lib/types';

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
};

export async function createTourRequest(payload: CreateRequestInput): Promise<{ id: string }> {
  const { data, error } = await supabase.from('tour_requests').insert(payload).select('id').single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function fetchMyRequests(userId: string): Promise<TourRequest[]> {
  const { data, error } = await supabase
    .from('tour_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as TourRequest[];
}

export async function cancelMyRequest(id: string): Promise<void> {
  const { error } = await supabase.from('tour_requests').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw new Error(error.message);
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
