-- =============================================================
-- Migración 0004: tours reales de Turismo Chilón (capturas de
-- turismochilon.com, carpeta img/). Precios dejados VACÍOS a pedido
-- del cliente ("a confirmar" por WhatsApp). Todos publicados.
-- Portada = captura web; flyer = imagen de referencia (puede mostrar
-- precios antiguos: son referenciales, el precio válido se confirma
-- por WhatsApp). Re-ejecutable (on conflict do nothing).
-- =============================================================

insert into public.tours
  (slug, title, short_description, description, destination, duration,
   price_from, currency, meeting_point, includes, excludes, recommendations,
   image_url, is_published)
values
  ('granja-porcon', 'Granja Porcón — Full Day',
   'Forestación, zoológico, piscigranja y el tradicional llamado de vacas, a 30 km de Cajamarca.',
   'Cooperativa Agraria Atahualpa Jerusalén, más conocida como Granja Porcón: combina historia, paisajes y actividades vivenciales. Recorre su forestación, zoológico y piscigranja, visita la cascada Lazareto, participa del llamado de vacas y prueba sus derivados lácteos.',
   'Granja Porcón', 'Full day (8:30 a. m. – 6:00 p. m.)',
   null, 'PEN', 'Plaza de Armas de Cajamarca',
   'Movilidad turística y guía (según flyer de referencia).',
   'Alimentación (según flyer de referencia).',
   'Llevar bloqueador, gorra, agua, calzado cómodo y abrigo ligero.',
   '/tours/granja-porcon-web.png', true),

  ('cumbemayo', 'Cumbemayo — Bosque de Piedras',
   'Tercera Maravilla del Perú: acueducto preincaico y bosque de frailones a 3500 m s. n. m.',
   'Cumbemayo, a 20 km de Cajamarca, alberga el impresionante acueducto preincaico —obra de ingeniería hidráulica— y el bosque de piedras de Los Frailones, formaciones rocosas con formas caprichosas en plena puna cajamarquina.',
   'Cumbemayo', 'Full day',
   null, 'PEN', 'Plaza de Armas de Cajamarca',
   'Movilidad turística y guía (según flyer de referencia).',
   null,
   'Llevar abrigo, bloqueador, agua y calzado de caminata. Altura: 3500 m s. n. m.',
   '/tours/cumbemayo-web.png', true),

  ('namora', 'Namora — Tierra de las Guitarras',
   'Guitarras, alfajores y paseo en botes de totora en la laguna San Nicolás.',
   'Namora es famosa por sus artesanos guitarreros y sus alfajores. El tour recorre la Alameda de los Incas, Los Sapitos, los talleres de guitarras y la laguna San Nicolás, donde se pasea en botes de totora.',
   'Namora', 'Medio día',
   null, 'PEN', 'Plaza de Armas de Cajamarca',
   'Movilidad turística y guía (según flyer de referencia).',
   null, null,
   '/tours/namora-web.png', true),

  ('ventanillas-otuzco', 'Ventanillas de Otuzco + Puente Colgante',
   'Necrópolis preincaica con nichos tallados en roca volcánica, a 8 km de Cajamarca.',
   'Las Ventanillas de Otuzco son una necrópolis preincaica con cientos de nichos funerarios tallados en roca volcánica. El circuito se combina con el Puente Colgante, el Jardín de las Hortensias y la fábrica de quesos.',
   'Otuzco', 'Medio día',
   null, 'PEN', 'Plaza de Armas de Cajamarca',
   'Movilidad turística y guía (según flyer de referencia).',
   null, null,
   '/tours/otuzco-web.png', true),

  ('hacienda-collpa', 'Ex Hacienda La Collpa',
   'Hacienda ganadera fundada en 1915: llamado de vacas, capilla y laguna artificial.',
   'La Ex Hacienda La Collpa, en la campiña cajamarquina, conserva su casa hacienda y capilla. Incluye el tradicional llamado de vacas por su nombre, laguna artificial y muestra de cerámica.',
   'La Collpa', 'Medio día',
   null, 'PEN', 'Plaza de Armas de Cajamarca',
   'Movilidad turística y guía (según flyer de referencia).',
   null, null,
   '/tours/collpa-web.png', true),

  ('yanamarca-llacanora', 'Castillo de Yanamarca — Tour de tarde',
   'Castillo de estilo europeo-andino, en el horario usual de 3:30 p. m. a 7:00 p. m.',
   'El Castillo de Yanamarca es una construcción contemporánea de estilo europeo con motivos andinos, en un entorno campestre. Se realiza usualmente por las tardes, de 3:30 p. m. a 7:00 p. m. Las Cascadas de Llacanora no forman parte de los circuitos estándar actuales: pídelas como cotización personalizada por WhatsApp.',
   'Yanamarca', 'Tardes (3:30 p. m. – 7:00 p. m.)',
   25.00, 'PEN', 'Plaza de Armas de Cajamarca',
   'Movilidad turística y guía (según flyer de referencia).',
   null,
   'Llevar calzado cómodo, agua y abrigo ligero.',
   '/tours/yanamarca-web.png', true),

  ('playas-norte-5d4n', 'Playas del Norte — 5D/4N (Tumbes · Máncora · Chiclayo)',
   'City tours, Sipán, manglares de Puerto Pizarro, avistamiento de ballenas y Aqua Park.',
   'Paquete de 5 días / 4 noches por el norte: Chiclayo (city tour, Tumbas Reales de Sipán, King Kong de Lambayeque), Máncora y Los Órganos (full day de playa, avistamiento de ballenas y tortugas según temporada), Piura–Catacaos (artesanía), Tumbes–Puerto Pizarro (manglares, islas) con paso por la frontera con Ecuador, y Aqua Park. Incluye hospedajes, comidas indicadas, entradas, lancha, bus turístico y guía. Salidas grupales publicadas en flyer (consultar fechas vigentes por WhatsApp).',
   'Tumbes · Máncora · Chiclayo', '5 días / 4 noches',
   null, 'PEN', 'Punto de embarque coordinado (salida nocturna)',
   'Hospedajes, comidas indicadas, entradas, lancha/motos, bus turístico, guía y botiquín (según folleto de referencia).',
   null,
   'Llevar ropa de playa, bloqueador, repelente y documentos de identidad (zona de frontera).',
   '/tours/norte-card.png', true)
on conflict (slug) do nothing;

-- Galería: portada web (orden 0) + flyer/folletos de referencia
insert into public.tour_images (tour_id, image_url, caption, display_order)
select t.id, v.image_url, v.caption, v.display_order
from public.tours t
join (values
  ('granja-porcon', '/tours/granja-porcon-web.png', 'Granja Porcón en la web oficial', 0),
  ('granja-porcon', '/tours/granja-porcon-flyer.png', 'Flyer de referencia: itinerario Full Day (precios referenciales)', 1),
  ('cumbemayo', '/tours/cumbemayo-web.png', 'Cumbemayo en la web oficial', 0),
  ('cumbemayo', '/tours/cumbemayo-flyer.png', 'Flyer de referencia (precios referenciales)', 1),
  ('namora', '/tours/namora-web.png', 'Namora en la web oficial', 0),
  ('namora', '/tours/namora-flyer.png', 'Flyer de referencia: 4 lugares (precios referenciales)', 1),
  ('ventanillas-otuzco', '/tours/otuzco-web.png', 'Otuzco en la web oficial', 0),
  ('ventanillas-otuzco', '/tours/otuzco-flyer.png', 'Flyer de referencia (precios referenciales)', 1),
  ('hacienda-collpa', '/tours/collpa-web.png', 'La Collpa en la web oficial', 0),
  ('hacienda-collpa', '/tours/collpa-flyer.png', 'Flyer de referencia: 5 atractivos (precios referenciales)', 1),
  ('yanamarca-llacanora', '/tours/yanamarca-web.png', 'Yanamarca en la web oficial', 0),
  ('yanamarca-llacanora', '/tours/yanamarca-flyer.png', 'Flyer ANTIGUO de referencia (precio e itinerario desactualizados: Llacanora ya no es circuito estándar)', 1),
  ('playas-norte-5d4n', '/tours/norte-card.png', 'Paquete Playas del Norte 5D/4N: Museo Tumbas Reales de Sipán, Chiclayo.', 0),
  ('playas-norte-5d4n', '/tours/norte-cierre.png', 'Cierre del folleto norte: servicios incluidos del paquete 5D/4N.', 1)
) as v(slug, image_url, caption, display_order) on v.slug = t.slug
on conflict do nothing;
