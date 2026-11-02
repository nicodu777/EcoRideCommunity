-- ====================================================================
-- EcoRide - données supplémentaires du mode démo (après seed.sql)
-- ====================================================================
-- Un historique de trajets passés (graphiques de l'administrateur),
-- un litige à trancher et un avis à modérer (espace employé).
-- ====================================================================

BEGIN;

-- Trajet terminé il y a 2 jours : Sophie signale un problème, Lucas laisse un avis
INSERT INTO trips (id, driver_id, vehicle_id, departure, destination, departure_time, arrival_time,
                   available_seats, total_seats, price_per_seat, status, completed_at)
VALUES (5, 3, 2, 'Lyon', 'Grenoble', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '1 hour 30 minutes',
        1, 3, 10.00, 'completed', NOW() - INTERVAL '2 days');
INSERT INTO bookings (id, trip_id, passenger_id, seats_booked, total_price, status) VALUES
  (3, 5, 4, 1, 10.00, 'disputed'),
  (4, 5, 5, 1, 10.00, 'validated');
INSERT INTO trip_issues (trip_id, booking_id, reporter_id, issue_description)
VALUES (5, 3, 4, 'Le conducteur est parti avec 40 minutes de retard et ne m''a pas déposée au point prévu.');
INSERT INTO ratings (trip_id, rater_id, ratee_id, rating, comment)
VALUES (5, 5, 3, 4, 'Trajet agréable, voiture propre. Un peu de retard au départ.');

SELECT setval('trips_id_seq',    (SELECT MAX(id) FROM trips));
SELECT setval('bookings_id_seq', (SELECT MAX(id) FROM bookings));

-- Historique des deux dernières semaines (covoiturages et crédits par jour)
DO $$
DECLARE d INT; t INT; b INT;
BEGIN
  FOREACH d IN ARRAY ARRAY[13, 12, 9, 8, 8, 6, 5, 4, 4, 3, 1] LOOP
    INSERT INTO trips (driver_id, vehicle_id, departure, destination, departure_time, arrival_time,
                       available_seats, total_seats, price_per_seat, status, completed_at)
    VALUES (CASE WHEN d % 2 = 0 THEN 2 ELSE 3 END, CASE WHEN d % 2 = 0 THEN 1 ELSE 2 END,
            (ARRAY['Paris', 'Lyon', 'Lille', 'Nantes'])[1 + d % 4], (ARRAY['Rouen', 'Grenoble', 'Amiens', 'Rennes'])[1 + d % 4],
            NOW() - make_interval(days => d), NOW() - make_interval(days => d) + INTERVAL '2 hours',
            1, 3, 12.00, 'completed', NOW() - make_interval(days => d))
    RETURNING id INTO t;
    FOR i IN 1..(1 + d % 2) LOOP
      INSERT INTO bookings (trip_id, passenger_id, seats_booked, total_price, status)
      VALUES (t, 4 + i % 2, 1, 12.00, 'validated') RETURNING id INTO b;
      INSERT INTO platform_earnings (trip_id, booking_id, amount, date)
      VALUES (t, b, 2.00, NOW() - make_interval(days => d));
    END LOOP;
  END LOOP;
END $$;

COMMIT;
