
-- Datos de prueba para el entorno local. Las contrasenas son de desarrollo y no deben
-- existir en el despliegue de produccion: Admin123 para el administrador, Viajero123
-- para la cuenta de usuario.

insert into public.usuarios (id, nombre, email, password_hash, rol)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'Administrador TripTicks',
    'admin@tripticks.com',
    '$2b$10$RhzpBs1H1QuBWPZE1jucneIQUPUDq0voX.Sv6MEmKGHRGjB/8O7JG',
    'administrador'
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'Ana Martinez',
    'ana@ejemplo.com',
    '$2b$10$TWW5tmsm7bgGtI8M17FVNOjUPqMpcdLXM08rg/UQi.9gEcH/TbKHy',
    'usuario'
  )
on conflict (email) do nothing;

insert into public.viajes (
  id, titulo, destino, descripcion, itinerario, precio,
  fecha_salida, fecha_regreso, cupos_totales, cupos_disponibles, imagen_url
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Retiro Alpino Exclusivo en los Dolomitas',
    'Dolomitas, Italia',
    'Despierta con vistas panoramicas de cumbres escarpadas en un refugio cuidadosamente seleccionado. El itinerario equilibra expediciones guiadas con tardes de descanso y cenas de ingredientes locales.',
    '[
      {"dia": 1, "titulo": "Llegada y bienvenida alpina", "descripcion": "Traslado privado desde el aeropuerto de Venecia al lodge y cena de bienvenida con vinos de la region."},
      {"dia": 2, "titulo": "Senderismo en Tre Cime di Lavaredo", "descripcion": "Excursion privada de medio dia por uno de los paisajes mas iconicos de los Dolomitas."},
      {"dia": 3, "titulo": "Lago di Braies y tarde de spa", "descripcion": "Navegacion en bote de madera por el lago y circuito termal con vistas al valle."}
    ]'::jsonb,
    2450.00, '2026-10-12', '2026-10-18', 12, 4,
    'https://images.unsplash.com/photo-1781555263061-9ddbb1905af2?auto=format&fit=crop&q=80&w=2000'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Safari Fotografico en el Serengueti',
    'Serengueti, Tanzania',
    'Nueve dias siguiendo la gran migracion con un guia naturalista y un fotografo profesional. Campamentos moviles montados a pocos metros de los corredores de fauna.',
    '[
      {"dia": 1, "titulo": "Arusha y briefing fotografico", "descripcion": "Recepcion en el aeropuerto del Kilimanjaro y taller de ajustes de camara para safari."},
      {"dia": 2, "titulo": "Crater del Ngorongoro", "descripcion": "Jornada completa de avistamiento en la caldera con almuerzo junto al lago Magadi."},
      {"dia": 3, "titulo": "Serengueti central", "descripcion": "Traslado al campamento movil y salida al atardecer tras los grandes felinos."}
    ]'::jsonb,
    3890.00, '2026-11-05', '2026-11-13', 10, 7,
    'https://images.unsplash.com/photo-1580867604157-92950a0a9daa?auto=format&fit=crop&q=80&w=2000'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'Ruta de los Templos de Kioto',
    'Kioto, Japon',
    'Nueve dias entre jardines zen, ceremonias del te y barrios historicos, programados para coincidir con la floracion de los cerezos. Incluye dos noches en un ryokan tradicional.',
    '[
      {"dia": 1, "titulo": "Llegada a Kioto", "descripcion": "Tren desde Osaka y paseo introductorio por el barrio de Gion al anochecer."},
      {"dia": 2, "titulo": "Fushimi Inari y Kiyomizu-dera", "descripcion": "Ascenso temprano entre los mil torii y tarde en el distrito de Higashiyama."},
      {"dia": 3, "titulo": "Arashiyama y ceremonia del te", "descripcion": "Bosque de bambu, villa Okochi Sanso y ceremonia privada con una maestra local."}
    ]'::jsonb,
    3150.00, '2027-03-28', '2027-04-05', 14, 14,
    'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?auto=format&fit=crop&q=80&w=2000'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'Travesia Patagonica: Torres del Paine',
    'Patagonia, Chile',
    'Diez dias de trekking por el circuito W con alojamiento en refugios de montana. Nivel exigente, pensado para caminantes con experiencia previa en alta montana.',
    '[
      {"dia": 1, "titulo": "Puerto Natales", "descripcion": "Revision de equipo, charla de seguridad y cena en el puerto."},
      {"dia": 2, "titulo": "Valle del Frances", "descripcion": "Ascenso al mirador con vista al glaciar colgante y campamento en Cuernos."},
      {"dia": 3, "titulo": "Base de las Torres", "descripcion": "Salida antes del amanecer para ver las torres con la primera luz."}
    ]'::jsonb,
    2980.00, '2026-12-02', '2026-12-11', 8, 2,
    'https://images.unsplash.com/photo-1586600822178-26dec0f653a9?auto=format&fit=crop&q=80&w=2000'
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'Auroras Boreales en Laponia',
    'Rovaniemi, Finlandia',
    'Siete noches en cabanas de cristal dentro del circulo polar artico, con caza de auroras guiada, paseo en trineo de huskies y visita a una granja de renos.',
    '[
      {"dia": 1, "titulo": "Llegada al circulo polar", "descripcion": "Entrega de equipo termico e instalacion en la cabana de cristal."},
      {"dia": 2, "titulo": "Caza de auroras", "descripcion": "Salida nocturna en motonieve a un lago helado lejos de la contaminacion luminica."},
      {"dia": 3, "titulo": "Trineo de huskies y renos", "descripcion": "Recorrido por el bosque nevado y almuerzo en una granja de renos sami."}
    ]'::jsonb,
    2240.00, '2027-01-15', '2027-01-21', 16, 11,
    'https://images.unsplash.com/photo-1613476775431-f085e65e9605?auto=format&fit=crop&q=80&w=2000'
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    'Islas Griegas en Velero',
    'Cicladas, Grecia',
    'Ocho dias navegando entre Paros, Naxos y Santorini en un velero de doce metros con patron. Fondeos en calas sin acceso por tierra y cocina mediterranea a bordo.',
    '[
      {"dia": 1, "titulo": "Embarque en Paros", "descripcion": "Briefing de navegacion, reparto de camarotes y primera cena en el puerto de Naoussa."},
      {"dia": 2, "titulo": "Travesia a Naxos", "descripcion": "Cinco horas de navegacion y fondeo en la bahia de Plaka para banarse."},
      {"dia": 3, "titulo": "Pequenas Cicladas", "descripcion": "Ruta por Koufonisia y Schinoussa con paradas en calas de agua turquesa."}
    ]'::jsonb,
    1890.00, '2027-06-10', '2027-06-17', 6, 0,
    'https://images.unsplash.com/photo-1622299077374-2b90018ae5be?auto=format&fit=crop&q=80&w=2000'
  )
on conflict (id) do nothing;
