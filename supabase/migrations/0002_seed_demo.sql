-- =============================================================
-- Migración 0002: datos iniciales DEMOSTRATIVOS (claramente no reales)
-- Los tours demo se crean como NO publicados o SIN precio, para que
-- el admin los revise antes de publicar. No publicar precios ficticios.
-- =============================================================

insert into public.tours (slug, title, short_description, description, destination, duration, price_from, currency, meeting_point, is_published)
values
  ('demo-cumbemayo', '[DEMO] Cumbemayo — Bosque de Piedras', 'Contenido demostrativo, no es oferta real.', 'Texto de ejemplo para validar el diseño. El administrador debe reemplazarlo por información confirmada antes de publicar.', 'Cumbemayo', 'Full day (ejemplo)', null, 'PEN', 'Plaza de Armas (ejemplo)', false),
  ('demo-otuzco', '[DEMO] Otuzco y Baños del Inca', 'Contenido demostrativo, no es oferta real.', 'Texto de ejemplo para validar el diseño. Reemplazar antes de publicar.', 'Otuzco', 'Medio día (ejemplo)', null, 'PEN', 'Plaza de Armas (ejemplo)', false)
on conflict (slug) do nothing;

insert into public.faqs (category, question, answer, keywords, is_published, display_order)
values
  ('Reservas y confirmaciones', '¿Una solicitud en el chat es una reserva confirmada?', 'No. Lo que se registra desde el chatbot es una solicitud pendiente. La empresa la revisa y te contacta para confirmar disponibilidad, precio y condiciones. Solo el estado “Reserva confirmada” en tu panel, tras contacto de la empresa, equivale a confirmación.', 'reserva,confirmar,solicitud,pendiente', true, 1),
  ('Precios y qué incluye', '¿Dónde veo los precios oficiales?', 'En cada tour publicado aparece el precio confirmado en soles (PEN). Si dice “Precio a confirmar”, el precio aún no está autorizado: consúltalo por el chat y la empresa te lo confirmará.', 'precio,tarifa,costo,soles,pen', true, 2),
  ('Cancelaciones y cambios', '¿Puedo cancelar o modificar mi solicitud?', 'Puedes cancelar tus solicitudes pendientes desde “Mis solicitudes”. Para cambios de fecha o viajeros, crea una nueva solicitud o contáctanos; las políticas de cancelación y devolución vigentes te las confirmará la empresa.', 'cancelar,cambio,devolucion,reembolso', true, 3),
  ('Transporte y encuentro', '¿Dónde es el punto de encuentro?', 'Cada tour publicado indica su punto de encuentro. Si no aparece, pregúntalo en el chat antes de tu fecha de viaje.', 'transporte,recojo,encuentro,punto,traslado', true, 4),
  ('Recomendaciones', '¿Qué debo llevar a los tours de altura?', 'Lleva bloqueador, gorra, agua, calzado cómodo y abrigo ligero. Si tienes alguna condición médica o necesidad de accesibilidad, indícala en las observaciones de tu solicitud.', 'altura,clima,ropa,equipaje,salud,accesibilidad', true, 5),
  ('Pagos', '¿Qué métodos de pago admiten?', '[DEMO] Contenido pendiente de confirmación por la empresa. No realices ningún pago hasta que la empresa confirme tu solicitud por un canal oficial.', 'pago,yape,plin,transferencia,tarjeta', true, 6)
on conflict do nothing;
