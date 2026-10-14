export type Tour = {
  id: string; slug: string; title: string;
  short_description: string | null; description: string | null;
  destination: string | null; duration: string | null;
  price_from: number | null; currency: string;
  itinerary: string | null; includes: string | null; excludes: string | null;
  meeting_point: string | null; recommendations: string | null;
  image_url: string | null; is_published: boolean;
};

export type TourImage = {
  id: string; tour_id: string; image_url: string;
  caption: string | null; display_order: number;
};

export type Faq = {
  id: string; category: string; question: string; answer: string;
  keywords: string | null; is_published: boolean; display_order: number;
};

export type TourRequest = {
  id: string; user_id: string; tour_id: string | null;
  requested_destination: string | null; preferred_date: string | null;
  date_is_flexible: boolean; adults: number; children: number;
  travelers_count: number; contact_phone: string | null;
  additional_notes: string | null; status: string;
  admin_notes: string | null; created_at: string;
  // Logística confirmada por la agencia (solo admin la edita)
  confirmed_date: string | null; departure_time: string | null;
  meeting_point: string | null; departure_notes: string | null;
};

/** Solicitud confirmada con datos del tour asociado (para el calendario). */
export type ScheduledRequest = TourRequest & {
  tours: Pick<Tour, 'title' | 'slug' | 'image_url' | 'duration' | 'meeting_point' | 'recommendations'> | null;
};

export type Conversation = { id: string; user_id: string; title: string | null; created_at: string };
export type Message = { id: string; conversation_id: string; role: 'user' | 'assistant'; content: string; created_at: string };

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', in_review: 'En revisión', contacted: 'Contactado',
  confirmed: 'Reserva confirmada', cancelled: 'Cancelada',
};
