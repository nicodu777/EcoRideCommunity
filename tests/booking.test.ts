/**
 * ====================================================================
 * Jeu d'essai : réservation d'un covoiturage et mouvements de crédits
 * ====================================================================
 * Chaque test indique les données en entrée et le résultat attendu.
 * Base : sql/seed.sql (Sophie 20 crédits, Lucas 12 crédits,
 * trajet n°2 Paris -> Lyon de Pierre à 18 crédits, 3 places).
 * ====================================================================
 */
import { describe, test, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { users, trips, platformEarnings, notifications } from "@shared/schema";
import { createTestContainer, SEED } from "./helpers/testContainer";
import type { Container } from "../server/container";
import type { Database } from "../server/db/postgres";

let container: Container;
let db: Database;

async function credits(userId: number) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  return Number(u.credits);
}
async function seats(tripId: number) {
  const [t] = await db.select().from(trips).where(eq(trips.id, tripId));
  return t.availableSeats;
}
async function user(id: number) {
  const [u] = await db.select().from(users).where(eq(users.id, id));
  return u;
}

beforeEach(async () => {
  ({ container, db } = await createTestContainer()); // base neuve pour chaque test
});

describe("US6 - Participer à un covoiturage", () => {
  test("cas nominal : Sophie (20 cr.) réserve 1 place à 18 cr. : 2 crédits restants, 1 place en moins", async () => {
    const booking = await container.services.bookings.reserve(SEED.sophie.id, { tripId: SEED.trips.parisLyonPierre, seatsBooked: 1 });

    expect(booking.status).toBe("confirmed");
    expect(Number(booking.totalPrice)).toBe(18);
    expect(await credits(SEED.sophie.id)).toBe(2);
    expect(await seats(SEED.trips.parisLyonPierre)).toBe(2);
  });

  test("crédits insuffisants : Lucas (12 cr.) ne peut pas payer 18 cr. : refus, rien n'est modifié", async () => {
    await expect(
      container.services.bookings.reserve(SEED.lucas.id, { tripId: SEED.trips.parisLyonPierre, seatsBooked: 1 }),
    ).rejects.toThrow(/Crédits insuffisants/);

    expect(await credits(SEED.lucas.id)).toBe(12);
    expect(await seats(SEED.trips.parisLyonPierre)).toBe(3);
  });

  test("plus de places : 4 places demandées sur 3 disponibles : refus", async () => {
    await expect(
      container.services.bookings.reserve(SEED.marie.id, { tripId: SEED.trips.parisLyonPierre, seatsBooked: 4 }),
    ).rejects.toThrow(/places/);
  });

  test("un chauffeur ne peut pas réserver son propre trajet", async () => {
    await expect(
      container.services.bookings.reserve(SEED.pierre.id, { tripId: SEED.trips.parisLyonPierre, seatsBooked: 1 }),
    ).rejects.toThrow(/propre trajet/);
  });

  test("double réservation du même trajet : refus", async () => {
    await container.services.bookings.reserve(SEED.marie.id, { tripId: SEED.trips.parisLyonPierre, seatsBooked: 1 });
    await expect(
      container.services.bookings.reserve(SEED.marie.id, { tripId: SEED.trips.parisLyonPierre, seatsBooked: 1 }),
    ).rejects.toThrow(/déjà une réservation/);
  });
});

describe("US10 - Annulations", () => {
  test("le passager annule : crédits rendus et place libérée", async () => {
    const booking = await container.services.bookings.reserve(SEED.sophie.id, { tripId: SEED.trips.parisLyonPierre, seatsBooked: 1 });
    await container.services.bookings.cancel(SEED.sophie.id, booking.id);

    expect(await credits(SEED.sophie.id)).toBe(20);
    expect(await seats(SEED.trips.parisLyonPierre)).toBe(3);
  });

  test("un autre utilisateur ne peut pas annuler la réservation de Sophie", async () => {
    const booking = await container.services.bookings.reserve(SEED.sophie.id, { tripId: SEED.trips.parisLyonPierre, seatsBooked: 1 });
    await expect(container.services.bookings.cancel(SEED.lucas.id, booking.id)).rejects.toThrow(/introuvable/);
  });

  test("le chauffeur annule : tous les passagers sont remboursés et notifiés", async () => {
    // Sophie a déjà payé 25 cr. pour le trajet 1 de Marie (seed)
    await container.services.trips.cancel(await user(SEED.marie.id), SEED.trips.parisLyonMarie);

    expect(await credits(SEED.sophie.id)).toBe(45);
    const notes = await db.select().from(notifications).where(eq(notifications.userId, SEED.sophie.id));
    expect(notes.map((n) => n.title)).toContain("Trajet annulé");
  });
});

describe("US11 - Démarrage, arrivée, validation et paiement du chauffeur", () => {
  test("validation : le chauffeur reçoit 18 - 2 = 16 crédits, la plateforme garde 2 crédits", async () => {
    const pierre = await user(SEED.pierre.id);
    const booking = await container.services.bookings.reserve(SEED.sophie.id, { tripId: SEED.trips.parisLyonPierre, seatsBooked: 1 });

    await container.services.trips.start(pierre, SEED.trips.parisLyonPierre);
    await container.services.trips.complete(pierre, SEED.trips.parisLyonPierre);
    const validated = await container.services.bookings.validate(SEED.sophie.id, booking.id);

    expect(validated.status).toBe("validated");
    expect(await credits(SEED.pierre.id)).toBe(35 + 16);
    const fees = await db.select().from(platformEarnings).where(eq(platformEarnings.bookingId, booking.id));
    expect(Number(fees[0].amount)).toBe(2);
  });

  test("on ne peut pas terminer un trajet qui n'a pas démarré", async () => {
    await expect(
      container.services.trips.complete(await user(SEED.pierre.id), SEED.trips.parisLyonPierre),
    ).rejects.toThrow(/démarré/);
  });

  test("un chauffeur ne peut pas démarrer le trajet d'un autre", async () => {
    await expect(
      container.services.trips.start(await user(SEED.marie.id), SEED.trips.parisLyonPierre),
    ).rejects.toThrow(/introuvable/);
  });
});

describe("US12 - Litige tranché par un employé", () => {
  test("problème signalé puis remboursement du passager : le chauffeur n'est pas payé", async () => {
    const pierre = await user(SEED.pierre.id);
    const booking = await container.services.bookings.reserve(SEED.sophie.id, { tripId: SEED.trips.parisLyonPierre, seatsBooked: 1 });
    await container.services.trips.start(pierre, SEED.trips.parisLyonPierre);
    await container.services.trips.complete(pierre, SEED.trips.parisLyonPierre);

    const issue = await container.services.bookings.report(SEED.sophie.id, booking.id, "Le chauffeur est arrivé avec 2 heures de retard.");
    await container.services.bookings.resolveIssue(1, issue.id, "refund_passenger", "Retard confirmé par le chauffeur");

    expect(await credits(SEED.sophie.id)).toBe(20);
    expect(await credits(SEED.pierre.id)).toBe(35);
  });
});

describe("Avis - modération", () => {
  test("un avis n'est compté dans la note du chauffeur qu'après approbation", async () => {
    const pierre = await user(SEED.pierre.id);
    const booking = await container.services.bookings.reserve(SEED.sophie.id, { tripId: SEED.trips.parisLyonPierre, seatsBooked: 1 });
    await container.services.trips.start(pierre, SEED.trips.parisLyonPierre);
    await container.services.trips.complete(pierre, SEED.trips.parisLyonPierre);
    await container.services.bookings.validate(SEED.sophie.id, booking.id);

    const rating = await container.services.ratings.create(await user(SEED.sophie.id), {
      tripId: SEED.trips.parisLyonPierre, rating: 4, comment: "Très bien",
    });
    expect((await user(SEED.pierre.id)).totalRatings).toBe(0);

    await container.services.ratings.review(1, rating.id, true);
    const updated = await user(SEED.pierre.id);
    expect(updated.totalRatings).toBe(1);
    expect(Number(updated.averageRating)).toBe(4);
  });

  test("impossible de noter un trajet auquel on n'a pas participé", async () => {
    await expect(
      container.services.ratings.create(await user(SEED.lucas.id), { tripId: SEED.trips.parisLyonPierre, rating: 1 }),
    ).rejects.toThrow(/terminé ce trajet/);
  });
});

describe("US3/US4 - Recherche et filtres", () => {
  test("filtre écologique : seul le trajet en Tesla électrique est renvoyé", async () => {
    const result = await container.services.trips.search({ departure: "paris", destination: "lyon", ecologicalOnly: true });
    expect(result.trips).toHaveLength(1);
    expect(result.trips[0].isEcological).toBe(true);
  });

  test("filtre prix maximum : 20 crédits : seul le trajet à 18 crédits", async () => {
    const result = await container.services.trips.search({ departure: "Paris", destination: "Lyon", maxPrice: 20 });
    expect(result.trips.map((t) => Number(t.pricePerSeat))).toEqual([18]);
  });

  test("aucun trajet à la date demandée : la date du trajet le plus proche est proposée", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = await container.services.trips.search({ departure: "Paris", destination: "Lyon", date: today });
    expect(result.trips).toHaveLength(0);
    expect(result.suggestedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("tentative d'injection SQL dans la recherche : traitée comme du texte, aucun résultat, aucune erreur", async () => {
    const result = await container.services.trips.search({ departure: "Paris'; DROP TABLE trips; --", destination: "Lyon" });
    expect(result.trips).toHaveLength(0);
    expect(await seats(SEED.trips.parisLyonPierre)).toBe(3); // la table existe toujours
  });
});
