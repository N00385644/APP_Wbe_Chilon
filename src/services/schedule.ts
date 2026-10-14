// Fuente única de lectura de la agenda (solicitudes confirmed + join tours).
import { supabase } from '../lib/supabase';
import type { ScheduledRequest } from '../lib/types';

export async function fetchMySchedule(userId: string): Promise<ScheduledRequest[]> {
  const { data, error } = await supabase
    .from('tour_requests')
    .select('*, tours(title, slug, image_url, duration, meeting_point, recommendations)')
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .order('confirmed_date', { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ScheduledRequest[];
}
