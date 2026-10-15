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
  requested_seats?: string | null;
  confirmed_seats?: string | null;
};

export async function createTourRequest(payload: CreateRequestInput): Promise<{ id: string }> {
  const { data, error } = await supabase.from('tour_requests').insert(payload).select('id').single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

/**
 * Consulta los asientos ya ocupados para un tour y fecha determinados.
 * Utiliza la función RPC segura get_occupied_seats o fallback directo.
 */
export async function fetchOccupiedSeats(params: { tourId?: string | null; date?: string | null }): Promise<string[]> {
  if (!params.date) return [];
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_occupied_seats', {
      p_tour_id: params.tourId || null,
      p_date: params.date,
    });
    if (!rpcError && Array.isArray(rpcData)) {
      return (rpcData as { seat: string }[]).map((r) => r.seat).filter(Boolean);
    }
  } catch {
    // Si la RPC no está presente aún en el entorno, fallback a consulta directa
  }

  try {
    let query = supabase
      .from('tour_requests')
      .select('requested_seats, confirmed_seats')
      .neq('status', 'cancelled');

    if (params.tourId) query = query.eq('tour_id', params.tourId);
    query = query.or(`confirmed_date.eq.${params.date},and(confirmed_date.is.null,preferred_date.eq.${params.date})`);

    const { data, error } = await query;
    if (error || !data) return [];

    const set = new Set<string>();
    for (const r of data) {
      const s = r.confirmed_seats || r.requested_seats;
      if (s) {
        s.split(',').forEach((x: string) => {
          const trimmed = x.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    }
    return Array.from(set);
  } catch {
    return [];
  }
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
