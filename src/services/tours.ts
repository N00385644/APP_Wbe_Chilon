// Fuente única de lectura del catálogo de tours (RLS pública: is_published).
// Centraliza los SELECT que antes estaban duplicados en hooks y ChatWidget.
import { supabase } from '../lib/supabase';
import type { Tour } from '../lib/types';

export async function fetchPublishedTours(): Promise<Tour[]> {
  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('is_published', true)
    .order('title');
  if (error) throw new Error(error.message);
  return (data ?? []) as Tour[];
}

export type TourCard = Pick<
  Tour,
  'slug' | 'title' | 'destination' | 'duration' | 'price_from' | 'currency' | 'short_description' | 'meeting_point' | 'includes'
>;

/** Vista reducida para el menú guiado (12 primeros por título). */
export async function fetchTourCards(): Promise<TourCard[]> {
  const { data, error } = await supabase
    .from('tours')
    .select('slug,title,destination,duration,price_from,currency,short_description,meeting_point,includes')
    .eq('is_published', true)
    .order('title')
    .limit(12);
  if (error) throw new Error(error.message);
  return (data ?? []) as TourCard[];
}

/**
 * Resuelve slug -> id real contra tours publicados.
 * Nunca inventa IDs ni asume que el slug equivale al UUID.
 * Devuelve null si no existe o no está publicado.
 */
export async function resolvePublishedTourIdBySlug(slug: string): Promise<string | null> {
  const s = slug.trim().slice(0, 100);
  if (!s) return null;
  const { data } = await supabase
    .from('tours')
    .select('id')
    .eq('slug', s)
    .eq('is_published', true)
    .single();
  const id = (data as { id: string } | null)?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/** Revalida un id candidato contra tours publicados (para tour_id directo). */
export async function isTourPublished(id: string): Promise<boolean> {
  const { data } = await supabase
    .from('tours')
    .select('id')
    .eq('id', id)
    .eq('is_published', true)
    .single();
  return !!(data as { id: string } | null)?.id;
}
