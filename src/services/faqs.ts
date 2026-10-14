// Fuente única de lectura de FAQs publicadas (RLS pública).
import { supabase } from '../lib/supabase';
import type { Faq } from '../lib/types';

export async function fetchPublishedFaqs(): Promise<Faq[]> {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .eq('is_published', true)
    .order('display_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as Faq[];
}

export type FaqCard = Pick<Faq, 'category' | 'question' | 'answer'>;

/** Vista reducida para el menú guiado (30 primeras por display_order). */
export async function fetchFaqCards(): Promise<FaqCard[]> {
  const { data, error } = await supabase
    .from('faqs')
    .select('category,question,answer')
    .eq('is_published', true)
    .order('display_order')
    .limit(30);
  if (error) throw new Error(error.message);
  return (data ?? []) as FaqCard[];
}
