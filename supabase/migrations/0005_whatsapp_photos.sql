-- =============================================================
-- Migración 0005: fotos WhatsApp recortadas a paisaje + apartado
-- Movilidades + descripciones desde las letras de las capturas.
-- Re-ejecutable (on conflict do nothing / updates idempotentes).
-- =============================================================

-- 1) Nuevo tour: Alquiler de Movilidades (apartado de transporte)
insert into public.tours
  (slug, title, short_description, description, destination, duration,
   price_from, currency, meeting_point, includes, excludes, recommendations,
   image_url, is_published)
values
  ('transporte-movilidades', 'Alquiler de Movilidades — Transporte Turístico',
   'Unidades de 12, 15 y 18 pasajeros con A/C, Bluetooth, GPS y permiso nacional.',
   'Servicio de transporte de personal y turístico con unidades modernas de 12, 15 y 18 pasajeros: aire acondicionado, Bluetooth, cargador para celulares, cinturón de 3 puntos, GPS y permiso nacional. Cumplimos las normas y estándares de las empresas del sector minero. Cotización personalizada por WhatsApp según ruta, fecha y grupo.',
   'Cajamarca y todo el Perú', 'Según servicio contratado',
   null, 'PEN', 'Punto de recojo coordinado',
   'Conductor profesional, unidad equipada (A/C, GPS, botiquín).',
   null,
   'Indica número de pasajeros, equipaje, fecha y ruta para cotizarte.',
   '/tours/wa-bus-01.jpg', true)
on conflict (slug) do nothing;

-- 2) Galería WhatsApp (fotos recortadas a paisaje, órdenes 10+ para ir tras web/flyer)
insert into public.tour_images (tour_id, image_url, caption, display_order)
select t.id, v.image_url, v.caption, v.display_order
from public.tours t
join (values
  ('transporte-movilidades', '/tours/wa-bus-01.jpg', 'Minibús blanco en parque', 10),
  ('transporte-movilidades', '/tours/wa-bus-02.jpg', 'Capó con logo de Servicio Turístico', 11),
  ('transporte-movilidades', '/tours/wa-bus-03.jpg', 'Minibús lateral en ruta', 12),
  ('transporte-movilidades', '/tours/wa-bus-04.jpg', 'Minibús con puerta abierta en campo', 13),
  ('transporte-movilidades', '/tours/wa-bus-05.jpg', 'Minibús frontal en campamento', 14),
  ('transporte-movilidades', '/tours/wa-bus-06.jpg', 'Minibús lateral en trocha', 15),
  ('transporte-movilidades', '/tours/wa-bus-07.jpg', 'Minibús exterior en Alameda', 16),
  ('transporte-movilidades', '/tours/wa-bus-08.jpg', 'Interior con asientos reclinables', 17),
  ('transporte-movilidades', '/tours/wa-bus-09.jpg', 'Calle arbolada en ruta', 18),
  ('transporte-movilidades', '/tours/wa-flyer-09.jpg', 'Ficha Movilidades: unidades 12, 15 y 18 Pax con A/C, Bluetooth, cargador, cinturón 3 puntos, GPS, permiso nacional', 19),
  ('cumbemayo', '/tours/wa-cumbemayo-01.jpg', 'Sendero entre ichu', 10),
  ('cumbemayo', '/tours/wa-cumbemayo-02.jpg', 'Cañón y farallones', 11),
  ('cumbemayo', '/tours/wa-cumbemayo-03.jpg', 'Sendero entre rocas', 12),
  ('cumbemayo', '/tours/wa-cumbemayo-04.jpg', 'Pradera altoandina', 13),
  ('cumbemayo', '/tours/wa-cumbemayo-05.jpg', 'Canal de piedra tallado', 14),
  ('cumbemayo', '/tours/wa-cumbemayo-06.jpg', 'Sendero junto al acueducto', 15),
  ('cumbemayo', '/tours/wa-cumbemayo-07.jpg', 'Frailones rocosos', 16),
  ('cumbemayo', '/tours/wa-cumbemayo-08.jpg', 'Canal preincaico tallado en roca', 17),
  ('namora', '/tours/wa-namora-01.jpg', 'Máscara colibrí de taller artesanal', 10),
  ('namora', '/tours/wa-namora-02.jpg', 'Letras del mirador sobre la laguna', 11),
  ('namora', '/tours/wa-namora-03.jpg', 'Laguna San Nicolás y embarcadero', 12),
  ('namora', '/tours/wa-namora-04.jpg', 'Local campestre Namororco', 13),
  ('namora', '/tours/wa-namora-05.jpg', 'Guitarra gigante artesanal', 14),
  ('namora', '/tours/wa-namora-06.jpg', 'Laguna, totorales y botes', 15),
  ('namora', '/tours/wa-namora-07.jpg', 'Columpio mirador sobre la laguna', 16),
  ('namora', '/tours/wa-namora-08.jpg', 'Puesto artesanal Namororco', 17),
  ('namora', '/tours/wa-namora-09.jpg', 'Restaurante campestre', 18),
  ('namora', '/tours/wa-namora-10.jpg', 'Laguna y totorales', 19),
  ('namora', '/tours/wa-namora-11.jpg', 'Movilidad en la ruta a Namora', 20),
  ('namora', '/tours/wa-namora-12.jpg', 'Laguna San Nicolás', 21),
  ('namora', '/tours/wa-namora-13.jpg', 'Mirador NAMORA sobre la laguna', 22),
  ('namora', '/tours/wa-namora-14.jpg', 'Laguna y cerros', 23),
  ('namora', '/tours/wa-namora-15.jpg', 'Columpio circular del mirador', 24),
  ('playas-norte-5d4n', '/tours/wa-norte-01.jpg', 'Movilidad frente al Museo Tumbas Reales de Sipán', 10),
  ('granja-porcon', '/tours/wa-porcon-01.jpg', 'Llama adornada en Granja Porcón', 10),
  ('granja-porcon', '/tours/wa-porcon-02.jpg', 'Grupo familiar en la pampa', 11),
  ('granja-porcon', '/tours/wa-porcon-03.jpg', 'Visitante en el mirador del bosque', 12),
  ('granja-porcon', '/tours/wa-porcon-04.jpg', 'Valle y caserío de Porcón', 13),
  ('granja-porcon', '/tours/wa-porcon-05.jpg', 'Pradera con cerro de fondo', 14),
  ('granja-porcon', '/tours/wa-porcon-06.jpg', 'Campo altoandino', 15),
  ('granja-porcon', '/tours/wa-porcon-07.jpg', 'Valle verde de Porcón', 16),
  ('granja-porcon', '/tours/wa-porcon-08.jpg', 'Instalaciones y cerro boscoso', 17),
  ('granja-porcon', '/tours/wa-porcon-09.jpg', 'Llama en el campo', 18),
  ('granja-porcon', '/tours/wa-porcon-10.jpg', 'Grupo de visitantes en la pampa', 19),
  ('yanamarca-llacanora', '/tours/wa-yanamarca-01.jpg', 'Vista aérea del Castillo de Yanamarca', 10),
  ('yanamarca-llacanora', '/tours/wa-yanamarca-02.jpg', 'Fachada, escalinata y león dorado', 11),
  ('yanamarca-llacanora', '/tours/wa-yanamarca-03.jpg', 'Salón restaurante del castillo', 12),
  ('yanamarca-llacanora', '/tours/wa-yanamarca-04.jpg', 'Fachada frontal del castillo', 13),
  ('yanamarca-llacanora', '/tours/wa-yanamarca-05.jpg', 'Vista lateral del castillo', 14),
  ('yanamarca-llacanora', '/tours/wa-yanamarca-06.jpg', 'Torre lateral entre jardines', 15),
  ('yanamarca-llacanora', '/tours/wa-yanamarca-07.jpg', 'Muro de piedra con castillo al fondo', 16),
  ('yanamarca-llacanora', '/tours/wa-yanamarca-08.jpg', 'Fachada del castillo', 17),
  ('yanamarca-llacanora', '/tours/wa-yanamarca-09.jpg', 'Salón interior del castillo', 18),
  ('yanamarca-llacanora', '/tours/wa-yanamarca-10.jpg', 'Muro de piedra y explanada', 19),
  ('yanamarca-llacanora', '/tours/wa-yanamarca-11.jpg', 'Castillo y explanada', 20)
) as v(slug, image_url, caption, display_order) on v.slug = t.slug
on conflict do nothing;

-- 3) Las letras de las capturas originales pasan a ser descripción (caption)
update public.tour_images set caption = 'Coop. Agraria Atahualpa Jerusalén, a 30 km de Cajamarca: la forestación más grande del Perú. Turismo, gastronomía y lácteos.'
  where image_url = '/tours/granja-porcon-web.png';
update public.tour_images set caption = 'Tour Granja Porcón Full Day: Humbocancha, zoológico, piscigranja, Cascada Lazareto y llamado de vacas (8:30 a. m.–6:00 p. m.).'
  where image_url = '/tours/granja-porcon-flyer.png';
update public.tour_images set caption = 'Cumbemayo, 3ra Maravilla del Perú (20 km, 3500 m s. n. m.): complejo de 3000 años, acueducto preincaico y bosque de Los Frailones.'
  where image_url = '/tours/cumbemayo-web.png';
update public.tour_images set caption = 'Cumbemayo, la magia de la 3ra Maravilla del Perú. Incluye movilidad y guía.'
  where image_url = '/tours/cumbemayo-flyer.png';
update public.tour_images set caption = 'Namora: guitarras, alfajores y laguna San Nicolás con botes de totora.'
  where image_url = '/tours/namora-web.png';
update public.tour_images set caption = 'Namora, Tierra de las guitarras: Alameda de los Incas, Bosque de Rocas Los Sapitos, talleres de guitarra y Laguna San Nicolás.'
  where image_url = '/tours/namora-flyer.png';
update public.tour_images set caption = 'Ventanillas de Otuzco, necrópolis preincaica a 8 km: nichos en roca volcánica de la cultura Cajamarca.'
  where image_url = '/tours/otuzco-web.png';
update public.tour_images set caption = 'Ventanillas de Otuzco + Puente Colgante, Jardín de las Hortensias y Fábrica de Quesos.'
  where image_url = '/tours/otuzco-flyer.png';
update public.tour_images set caption = 'Ex Hacienda La Collpa, campiña cajamarquina fundada en 1915: famoso Llamado de Vacas.'
  where image_url = '/tours/collpa-web.png';
update public.tour_images set caption = 'La Collpa: casa hacienda, capilla, llamado de vacas, laguna artificial y cerámica. Incluye movilidad y guía.'
  where image_url = '/tours/collpa-flyer.png';
update public.tour_images set caption = 'Castillo de Yanamarca, a 40 min de Cajamarca: construcción contemporánea de estilo europeo con motivos andinos.'
  where image_url = '/tours/yanamarca-web.png';
update public.tour_images set caption = 'Flyer ANTIGUO de referencia (precio e itinerario desactualizados: Llacanora ya no es circuito estándar).'
  where image_url = '/tours/yanamarca-flyer.png';
update public.tour_images set caption = 'Paquete Playas del Norte 5D/4N: Museo Tumbas Reales de Sipán, Chiclayo.'
  where image_url = '/tours/norte-card.png';
update public.tour_images set caption = 'Cierre del folleto norte: servicios incluidos del paquete 5D/4N.'
  where image_url = '/tours/norte-cierre.png';

-- 4) Norte: portada real es norte-card (portada/día1/día2 tenían texto denso, descartadas como foto)
update public.tours set image_url = '/tours/norte-card.png'
  where slug = 'playas-norte-5d4n';
delete from public.tour_images
  where image_url in ('/tours/norte-portada.png', '/tours/norte-dia1.png', '/tours/norte-dia2.png');
