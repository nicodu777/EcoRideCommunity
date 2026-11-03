-- ====================================================================
-- EcoRide - Jeu de données de démonstration
-- ====================================================================
-- Exécuté après sql/schema.sql. Les dates sont calculées à partir de
-- NOW() pour que les trajets de démonstration soient toujours à venir.
--
-- Comptes :
--  - admin@ecoride.com : se connecte via Firebase. Remplacez le
--    firebase_uid ci-dessous par l'UID réel du compte (console Firebase
--    -> Authentication) : c'est ainsi que le compte admin est créé
--    « manuellement », sans passer par l'inscription publique.
--  - employe@ecoride.com / Employe2026! : espace employé (/employee/login).
--    Seul le hash bcrypt du mot de passe est stocké.
-- ====================================================================

BEGIN;

-- Utilisateurs ---------------------------------------------------------
INSERT INTO users (id, email, firebase_uid, first_name, last_name, role, credits, average_rating, total_ratings) VALUES
  (1, 'admin@ecoride.com',        '0Kn4RzhaOmgo1jFG5t97cils05o1', 'Admin',  'EcoRide', 'admin',     0.00, 0,    0),
  (2, 'marie.dupont@email.com',   'demo-uid-marie',               'Marie',  'Dupont',  'driver',   50.00, 5.00, 1),
  (3, 'pierre.martin@email.com',  'demo-uid-pierre',              'Pierre', 'Martin',  'both',     35.00, 0,    0),
  (4, 'sophie.bernard@email.com', 'demo-uid-sophie',              'Sophie', 'Bernard', 'passenger', 20.00, 0,   0),
  (5, 'lucas.petit@email.com',    'demo-uid-lucas',               'Lucas',  'Petit',   'passenger', 12.00, 0,   0)
ON CONFLICT (email) DO NOTHING;

-- Véhicules ------------------------------------------------------------
INSERT INTO vehicles (id, owner_id, plate, first_registration_date, brand, model, color, energy, seats) VALUES
  (1, 2, 'AB-123-CD', '2022-03-15', 'Tesla',   'Model 3', 'Blanc', 'electric', 4),
  (2, 3, 'EF-456-GH', '2019-09-01', 'Toyota',  'Corolla', 'Gris',  'hybrid',   4),
  (3, 3, 'IJ-789-KL', '2016-05-20', 'Peugeot', '308',     'Bleu',  'diesel',   4)
ON CONFLICT (plate) DO NOTHING;

-- Trajets --------------------------------------------------------------
INSERT INTO trips (id, driver_id, vehicle_id, departure, destination, departure_time, arrival_time,
                   available_seats, total_seats, price_per_seat, description, status, completed_at) VALUES
  (1, 2, 1, 'Paris', 'Lyon',      NOW() + INTERVAL '3 days',               NOW() + INTERVAL '3 days 4 hours 30 minutes', 2, 3, 25.00, 'Départ porte d''Orléans, pause à mi-chemin.', 'pending', NULL),
  (2, 3, 2, 'Paris', 'Lyon',      NOW() + INTERVAL '5 days',               NOW() + INTERVAL '5 days 5 hours',            3, 3, 18.00, 'Trajet calme, musique douce.',               'pending', NULL),
  (3, 3, 3, 'Lyon',  'Marseille', NOW() + INTERVAL '7 days',               NOW() + INTERVAL '7 days 3 hours 15 minutes', 4, 4, 15.00, NULL,                                         'pending', NULL),
  (4, 2, 1, 'Lille', 'Paris',     NOW() - INTERVAL '10 days',              NOW() - INTERVAL '10 days' + INTERVAL '2 hours 30 minutes', 2, 3, 12.00, NULL, 'completed', NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- Réservations ---------------------------------------------------------
-- Sophie a réservé 1 place sur le trajet 1 (25 crédits déjà débités)
-- Lucas a fait le trajet 4 et l'a validé : Marie a reçu 12 - 2 = 10 crédits
INSERT INTO bookings (id, trip_id, passenger_id, seats_booked, total_price, status) VALUES
  (1, 1, 4, 1, 25.00, 'confirmed'),
  (2, 4, 5, 1, 12.00, 'validated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO platform_earnings (trip_id, booking_id, amount, date) VALUES
  (4, 2, 2.00, NOW() - INTERVAL '10 days');

-- Employé --------------------------------------------------------------
INSERT INTO employees (id, email, password, first_name, last_name, position, permissions, created_by) VALUES
  (1, 'employe@ecoride.com', '$2b$12$JLHs4/BeEd9HaEP3PQh4geWR2RYAqzx8Zn1Iz.ZGRs7sxWLhEDXrS',
   'Julie', 'Moreau', 'Support Client', ARRAY['ratings', 'trip_issues'], 1)
ON CONFLICT (email) DO NOTHING;

-- Avis publié (déjà approuvé par l'employé) ----------------------------
INSERT INTO ratings (trip_id, rater_id, ratee_id, rating, comment, is_approved, reviewed_by, reviewed_at) VALUES
  (4, 5, 2, 5, 'Conduite très souple, Marie est ponctuelle et sympathique.', TRUE, 1, NOW() - INTERVAL '9 days')
ON CONFLICT DO NOTHING;

-- Les SERIAL doivent repartir après les id insérés à la main
SELECT setval('users_id_seq',    (SELECT MAX(id) FROM users));
SELECT setval('vehicles_id_seq', (SELECT MAX(id) FROM vehicles));
SELECT setval('trips_id_seq',    (SELECT MAX(id) FROM trips));
SELECT setval('bookings_id_seq', (SELECT MAX(id) FROM bookings));
SELECT setval('employees_id_seq',(SELECT MAX(id) FROM employees));

COMMIT;
