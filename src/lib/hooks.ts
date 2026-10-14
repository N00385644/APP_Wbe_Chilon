import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { fetchPublishedTours } from '../services/tours';
import { fetchPublishedFaqs } from '../services/faqs';
import { fetchMyRequests } from '../services/requests';
import { fetchMySchedule } from '../services/schedule';
import type { Faq, Tour, TourImage, TourRequest, ScheduledRequest, Conversation, Message } from './types';

export function useTours() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchPublishedTours()
      .then(setTours)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo.'))
      .finally(() => setLoading(false));
  }, []);
  return { tours, loading, error };
}

export function useFaqs() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchPublishedFaqs()
      .then(setFaqs)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No se pudieron cargar las preguntas.'))
      .finally(() => setLoading(false));
  }, []);
  return { faqs, loading, error };
}

export function useMyRequests(userId: string | undefined) {
  const [requests, setRequests] = useState<TourRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const reload = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setRequests(await fetchMyRequests(userId));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, [userId]);
  return { requests, loading, reload };
}

/**
 * Tours confirmados del usuario con fecha y logística asignadas por la agencia.
 * Alimenta el calendario (/calendario) y el resumen de próximos tours en /perfil.
 */
export function useMySchedule(userId: string | undefined) {
  const [schedule, setSchedule] = useState<ScheduledRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const reload = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setSchedule(await fetchMySchedule(userId));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, [userId]);
  return { schedule, loading, reload };
}

export function useMyConversations(userId: string | undefined) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const reload = async () => {
    if (!userId) return;
    const { data } = await supabase.from('conversations').select('*')
      .eq('user_id', userId).order('updated_at', { ascending: false }).limit(20);
    setConvs((data ?? []) as Conversation[]);
  };
  useEffect(() => { reload(); }, [userId]);
  return { convs, reload };
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data } = await supabase.from('messages').select('*')
    .eq('conversation_id', conversationId).order('created_at');
  return (data ?? []) as Message[];
}

export function useTourImages(tourId: string | undefined) {
  const [images, setImages] = useState<TourImage[]>([]);
  useEffect(() => {
    if (!tourId) { setImages([]); return; }
    supabase.from('tour_images').select('*').eq('tour_id', tourId).order('display_order')
      .then(({ data }) => { setImages((data ?? []) as TourImage[]); });
  }, [tourId]);
  return { images };
}
