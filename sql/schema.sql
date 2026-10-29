-- ====================================================================
-- EcoRide - Script de création de la base de données (PostgreSQL 16)
-- ====================================================================
-- Exécuté automatiquement par Docker au premier démarrage du conteneur
-- (docker-entrypoint-initdb.d), ou à la main :
--   psql -U ecoride -d ecoride -f sql/schema.sql
--
-- Ce script correspond exactement à shared/schema.ts (Drizzle ORM).
-- Les tables sont créées dans l'ordre des dépendances (clés étrangères).
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- Utilisateurs : passagers, chauffeurs (ou les deux) et administrateur
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    firebase_uid    TEXT NOT NULL UNIQUE,            -- identifiant du compte Firebase Authentication
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    phone           TEXT,
    role            TEXT NOT NULL DEFAULT 'passenger'
                    CONSTRAINT users_role_check CHECK (role IN ('passenger', 'driver', 'both', 'admin')),
    average_rating  NUMERIC(3, 2) NOT NULL DEFAULT 0,
    total_ratings   INTEGER NOT NULL DEFAULT 0,
    credits         NUMERIC(10, 2) NOT NULL DEFAULT 20.00   -- 20 crédits offerts à l'inscription
                    CONSTRAINT users_credits_positive CHECK (credits >= 0),
    is_suspended    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- Véhicules : un utilisateur possède 0..n véhicules
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
    id                       SERIAL PRIMARY KEY,
    owner_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plate                    TEXT NOT NULL UNIQUE,
    first_registration_date  DATE NOT NULL,
    brand                    TEXT NOT NULL,
    model                    TEXT NOT NULL,
    color                    TEXT NOT NULL,
    energy                   TEXT NOT NULL
                             CONSTRAINT vehicles_energy_check CHECK (energy IN ('electric', 'hybrid', 'gasoline', 'diesel')),
    seats                    INTEGER NOT NULL
                             CONSTRAINT vehicles_seats_check CHECK (seats BETWEEN 1 AND 8),
    created_at               TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- Trajets : un chauffeur propose 0..n trajets ; un trajet utilise 1 véhicule
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trips (
    id               SERIAL PRIMARY KEY,
    driver_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id       INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,  -- un véhicule utilisé ne peut pas être supprimé
    departure        TEXT NOT NULL,
    destination      TEXT NOT NULL,
    departure_time   TIMESTAMP NOT NULL,
    arrival_time     TIMESTAMP NOT NULL,
    available_seats  INTEGER NOT NULL,
    total_seats      INTEGER NOT NULL,
    price_per_seat   NUMERIC(10, 2) NOT NULL,          -- en crédits
    description      TEXT,
    status           TEXT NOT NULL DEFAULT 'pending',
    started_at       TIMESTAMP,
    completed_at     TIMESTAMP,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT trips_status_check CHECK (status IN ('pending', 'started', 'completed', 'cancelled')),
    CONSTRAINT trips_seats_check  CHECK (available_seats >= 0 AND available_seats <= total_seats),
    CONSTRAINT trips_price_check  CHECK (price_per_seat > 2),          -- couvre les 2 crédits de la plateforme
    CONSTRAINT trips_dates_check  CHECK (arrival_time > departure_time)
);

-- Index pour accélérer la recherche (ville de départ, d'arrivée, date)
CREATE INDEX IF NOT EXISTS trips_search_idx ON trips (departure, destination, departure_time);

-- --------------------------------------------------------------------
-- Réservations : un passager réserve 1..n places sur un trajet
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id            SERIAL PRIMARY KEY,
    trip_id       INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    passenger_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seats_booked  INTEGER NOT NULL CONSTRAINT bookings_seats_check CHECK (seats_booked > 0),
    total_price   NUMERIC(10, 2) NOT NULL,
    status        TEXT NOT NULL DEFAULT 'confirmed'
                  CONSTRAINT bookings_status_check CHECK (status IN
                    ('confirmed', 'cancelled', 'awaiting_validation', 'validated', 'disputed', 'refunded')),
    message       TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- Employés : comptes créés par l'administrateur (mot de passe haché bcrypt)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id             SERIAL PRIMARY KEY,
    email          TEXT NOT NULL UNIQUE,
    password       TEXT NOT NULL,
    first_name     TEXT NOT NULL,
    last_name      TEXT NOT NULL,
    phone          TEXT,
    position       TEXT NOT NULL,
    permissions    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],   -- ex. {ratings, trip_issues}
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_by     INTEGER NOT NULL REFERENCES users(id),
    last_login_at  TIMESTAMP,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- Avis des passagers sur les chauffeurs (modérés par un employé)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ratings (
    id           SERIAL PRIMARY KEY,
    trip_id      INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    rater_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- auteur de l'avis (passager)
    ratee_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- personne notée (chauffeur)
    rating       INTEGER NOT NULL CONSTRAINT ratings_value_check CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT,
    is_approved  BOOLEAN,                                                   -- NULL = en attente de modération
    reviewed_by  INTEGER REFERENCES employees(id),
    reviewed_at  TIMESTAMP,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Un seul avis par passager et par trajet
CREATE UNIQUE INDEX IF NOT EXISTS ratings_one_per_trip ON ratings (trip_id, rater_id);

-- --------------------------------------------------------------------
-- Litiges signalés par les passagers après un trajet
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_issues (
    id                 SERIAL PRIMARY KEY,
    trip_id            INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    booking_id         INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    reporter_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issue_description  TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'pending',     -- 'pending' | 'resolved'
    decision           TEXT,                                -- 'pay_driver' | 'refund_passenger'
    handled_by         INTEGER REFERENCES employees(id),
    resolution         TEXT,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at        TIMESTAMP
);

-- --------------------------------------------------------------------
-- Crédits gagnés par la plateforme (2 crédits par réservation payée)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_earnings (
    id          SERIAL PRIMARY KEY,
    trip_id     INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount      NUMERIC(10, 2) NOT NULL,
    date        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- Messagerie entre participants d'un trajet
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
    id          SERIAL PRIMARY KEY,
    trip_id     INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message     TEXT NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- Notifications (annulation d'un trajet, trajet à valider...)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMIT;
