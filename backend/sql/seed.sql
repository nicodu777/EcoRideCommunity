-- ====================================================================
-- EcoRide - Données de test (seed)
-- ====================================================================
-- Ce script insère des données de démonstration dans la base de données
-- Il est exécuté automatiquement après la création du schéma
-- ====================================================================

-- ====================================================================
-- UTILISATEURS DE TEST
-- ====================================================================

-- Compte administrateur principal
INSERT INTO users (email, firebase_uid, first_name, last_name, role, credits, is_verified)
VALUES ('admin@ecoride.com', 'admin-firebase-uid-001', 'Admin', 'EcoRide', 'admin', 100.00, TRUE)
ON CONFLICT (email) DO NOTHING;

-- Conducteur 1 : Marie avec véhicule électrique
INSERT INTO users (email, firebase_uid, first_name, last_name, role, credits, is_verified, average_rating, total_ratings, bio)
VALUES ('marie.dupont@email.com', 'driver-firebase-uid-001', 'Marie', 'Dupont', 'driver', 50.00, TRUE, 4.80, 25, 'Conductrice éco-responsable, je roule en Tesla Model 3')
ON CONFLICT (email) DO NOTHING;

-- Conducteur 2 : Pierre avec véhicule hybride
INSERT INTO users (email, firebase_uid, first_name, last_name, role, credits, is_verified, average_rating, total_ratings, bio)
VALUES ('pierre.martin@email.com', 'driver-firebase-uid-002', 'Pierre', 'Martin', 'driver', 35.00, TRUE, 4.50, 15, 'Conducteur régulier Paris-Lyon, véhicule hybride Toyota')
ON CONFLICT (email) DO NOTHING;

-- Passager 1 : Sophie
INSERT INTO users (email, firebase_uid, first_name, last_name, role, credits, is_verified)
VALUES ('sophie.bernard@email.com', 'passenger-firebase-uid-001', 'Sophie', 'Bernard', 'passenger', 20.00, TRUE)
ON CONFLICT (email) DO NOTHING;

-- Passager 2 : Lucas
INSERT INTO users (email, firebase_uid, first_name, last_name, role, credits, is_verified)
VALUES ('lucas.petit@email.com', 'passenger-firebase-uid-002', 'Lucas', 'Petit', 'passenger', 25.00, TRUE)
ON CONFLICT (email) DO NOTHING;

-- Passager 3 : Emma
INSERT INTO users (email, firebase_uid, first_name, last_name, role, credits, is_verified)
VALUES ('emma.roux@email.com', 'passenger-firebase-uid-003', 'Emma', 'Roux', 'passenger', 18.00, FALSE)
ON CONFLICT (email) DO NOTHING;

-- ====================================================================
-- TRAJETS DE TEST
-- ====================================================================

-- Trajet 1 : Paris → Lyon (électrique, écologique)
INSERT INTO trips (driver_id, departure, destination, departure_time, arrival_time, available_seats, total_seats, price_per_seat, description, vehicle_type, vehicle_brand, vehicle_model, is_ecological, status)
SELECT id, 'Paris', 'Lyon', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '4 hours', 3, 4, 25.00, 'Trajet confortable en Tesla, WiFi disponible', 'electric', 'Tesla', 'Model 3', TRUE, 'pending'
FROM users WHERE email = 'marie.dupont@email.com'
ON CONFLICT DO NOTHING;

-- Trajet 2 : Lyon → Marseille (hybride)
INSERT INTO trips (driver_id, departure, destination, departure_time, arrival_time, available_seats, total_seats, price_per_seat, description, vehicle_type, vehicle_brand, vehicle_model, is_ecological, status)
SELECT id, 'Lyon', 'Marseille', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '3 hours', 2, 3, 20.00, 'Départ tôt le matin, arrêt possible à Valence', 'hybrid', 'Toyota', 'Prius', FALSE, 'pending'
FROM users WHERE email = 'pierre.martin@email.com'
ON CONFLICT DO NOTHING;

-- Trajet 3 : Bordeaux → Toulouse (électrique)
INSERT INTO trips (driver_id, departure, destination, departure_time, arrival_time, available_seats, total_seats, price_per_seat, description, vehicle_type, vehicle_brand, vehicle_model, is_ecological, status)
SELECT id, 'Bordeaux', 'Toulouse', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '2 hours', 4, 4, 15.00, 'Trajet direct sans arrêt', 'electric', 'Tesla', 'Model Y', TRUE, 'pending'
FROM users WHERE email = 'marie.dupont@email.com'
ON CONFLICT DO NOTHING;

-- ====================================================================
-- RÉSERVATIONS DE TEST
-- ====================================================================

-- Réservation de Sophie pour le trajet Paris-Lyon
INSERT INTO bookings (trip_id, passenger_id, seats_booked, total_price, status, message)
SELECT t.id, u.id, 1, 25.00, 'confirmed', 'Super, j''ai hâte de voyager !'
FROM trips t, users u 
WHERE t.departure = 'Paris' AND t.destination = 'Lyon' AND u.email = 'sophie.bernard@email.com'
ON CONFLICT DO NOTHING;

-- Réservation de Lucas pour le trajet Paris-Lyon
INSERT INTO bookings (trip_id, passenger_id, seats_booked, total_price, status)
SELECT t.id, u.id, 2, 50.00, 'pending'
FROM trips t, users u 
WHERE t.departure = 'Paris' AND t.destination = 'Lyon' AND u.email = 'lucas.petit@email.com'
ON CONFLICT DO NOTHING;

-- ====================================================================
-- ÉVALUATIONS DE TEST
-- ====================================================================

-- Note de Sophie pour Marie (ancien trajet)
INSERT INTO ratings (trip_id, rater_id, ratee_id, rating, comment, is_approved)
SELECT 
    (SELECT id FROM trips LIMIT 1),
    (SELECT id FROM users WHERE email = 'sophie.bernard@email.com'),
    (SELECT id FROM users WHERE email = 'marie.dupont@email.com'),
    5, 'Excellente conductrice, très ponctuelle et véhicule très propre !', TRUE
ON CONFLICT DO NOTHING;

-- ====================================================================
-- EMPLOYÉS (pour l'espace admin)
-- ====================================================================

-- Modérateur
INSERT INTO employees (email, password_hash, first_name, last_name, role)
VALUES ('moderateur@ecoride.com', '$2a$10$dummyhashformoderator', 'Jean', 'Moderateur', 'moderator')
ON CONFLICT (email) DO NOTHING;

-- Administrateur employé
INSERT INTO employees (email, password_hash, first_name, last_name, role)
VALUES ('admin.employe@ecoride.com', '$2a$10$dummyhashforadmin', 'Marie', 'Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ====================================================================
-- BADGES DE GAMIFICATION
-- ====================================================================

INSERT INTO badges (name, description, icon, condition, points)
VALUES 
    ('Éco-Warrior', 'A effectué 10 trajets en véhicule électrique', 'leaf', '{"trips_electric": 10}', 100),
    ('Premier Trajet', 'A complété son premier trajet', 'car', '{"trips_completed": 1}', 10),
    ('Voyageur Régulier', 'A effectué 50 trajets', 'road', '{"trips_completed": 50}', 250),
    ('Super Conducteur', 'Note moyenne de 4.5+ avec 20+ évaluations', 'star', '{"rating_min": 4.5, "ratings_count": 20}', 200),
    ('Ami de la Planète', 'A économisé 100kg de CO2', 'globe', '{"co2_saved": 100}', 150)
ON CONFLICT DO NOTHING;

-- ====================================================================
-- MESSAGE DE CONFIRMATION
-- ====================================================================
-- Les données de test ont été insérées avec succès !
