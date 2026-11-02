/**
 * ====================================================================
 * Tests de sécurité de l'API (requêtes HTTP réelles via Supertest)
 * ====================================================================
 * Ces tests reproduisent les failles trouvées dans la première version
 * et vérifient qu'elles sont corrigées (veille OWASP Top 10 :
 * A01 Broken Access Control, A07 Identification and Authentication Failures).
 * ====================================================================
 */
import { describe, test, expect, beforeAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Express } from "express";
import { createApp } from "../server/app";
import { createTestContainer, SEED, TEST_JWT_SECRET } from "./helpers/testContainer";

let app: Express;
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  const { container } = await createTestContainer();
  app = createApp(container, { production: false });
});

describe("A01 - Contrôle d'accès", () => {
  test("route admin sans token → 401", async () => {
    await request(app).get("/api/admin/users").expect(401);
  });

  test("route admin avec le token d'une passagère → 403", async () => {
    await request(app).get("/api/admin/users").set(bearer(SEED.sophie.token)).expect(403);
  });

  test("l'ancien en-tête x-user-id n'ouvre plus l'espace admin", async () => {
    await request(app).post("/api/admin/employees").set("x-user-id", "1").send({}).expect(401);
  });

  test("route admin avec le token de l'administrateur → 200, sans l'UID Firebase des comptes", async () => {
    const res = await request(app).get("/api/admin/users").set(bearer(SEED.admin.token)).expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).not.toHaveProperty("firebaseUid");
  });

  test("impossible de se donner le rôle admin via son profil", async () => {
    await request(app).patch("/api/users/me").set(bearer(SEED.sophie.token)).send({ role: "admin" }).expect(400);
  });

  test("mass assignment : les crédits envoyés dans le profil sont ignorés", async () => {
    const res = await request(app).patch("/api/users/me").set(bearer(SEED.sophie.token)).send({ firstName: "Sophie", credits: "99999" }).expect(200);
    expect(Number(res.body.credits)).toBe(20);
  });

  test("réservation : le passager vient du token et le prix est recalculé par le serveur", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set(bearer(SEED.sophie.token))
      .send({ tripId: SEED.trips.parisLyonPierre, seatsBooked: 1, passengerId: SEED.lucas.id, totalPrice: "0" })
      .expect(201);
    expect(res.body.passengerId).toBe(SEED.sophie.id);
    expect(Number(res.body.totalPrice)).toBe(18);
  });

  test("on ne peut pas publier un trajet avec le véhicule d'un autre chauffeur", async () => {
    await request(app).post("/api/trips").set(bearer(SEED.pierre.token)).send({
      vehicleId: 1, // Tesla de Marie
      departure: "Paris", destination: "Nantes",
      departureTime: new Date(Date.now() + 86400000).toISOString(),
      arrivalTime: new Date(Date.now() + 2 * 86400000).toISOString(),
      totalSeats: 2, pricePerSeat: 10,
    }).expect(400);
  });

  test("la messagerie d'un trajet est réservée à ses participants", async () => {
    await request(app).get(`/api/chat/trip/${SEED.trips.lyonMarseille}`).set(bearer(SEED.lucas.token)).expect(403);
  });
});

describe("A07 - Authentification des employés", () => {
  test("l'ancien faux token « Bearer 1 » est refusé", async () => {
    await request(app).get("/api/employee/pending-ratings").set(bearer("1")).expect(401);
  });

  test("un JWT signé avec un autre secret est refusé", async () => {
    const forged = jwt.sign({ type: "employee" }, "secret-de-l-attaquant-qui-ne-connait-pas-le-vrai", { subject: "1" });
    await request(app).get("/api/employee/pending-ratings").set(bearer(forged)).expect(401);
  });

  test("mauvais mot de passe → 401 avec un message générique", async () => {
    const res = await request(app).post("/api/employee/login").send({ email: SEED.employee.email, password: "faux" }).expect(401);
    expect(res.body.message).toBe("Identifiants invalides");
  });

  test("bon mot de passe → JWT valide, accès à la modération, hash jamais renvoyé", async () => {
    const login = await request(app).post("/api/employee/login").send(SEED.employee).expect(200);
    expect(login.body.employee).not.toHaveProperty("password");
    expect(jwt.verify(login.body.token, TEST_JWT_SECRET)).toBeTruthy();

    await request(app).get("/api/employee/pending-ratings").set(bearer(login.body.token)).expect(200);
  });
});

describe("Validation des entrées", () => {
  test("JSON mal formé → 400", async () => {
    await request(app).post("/api/trips/search").set("Content-Type", "application/json").send("{pas du json").expect(400);
  });

  test("route API inconnue → 404 JSON", async () => {
    const res = await request(app).get("/api/n-existe-pas").expect(404);
    expect(res.body.message).toBeDefined();
  });

  test("recherche publique accessible sans compte (visiteur)", async () => {
    const res = await request(app).post("/api/trips/search").send({ departure: "Paris", destination: "Lyon" }).expect(200);
    expect(res.body.trips.length).toBe(2);
  });
});
