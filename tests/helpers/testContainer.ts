/**
 * Outils de test : une vraie base PostgreSQL en mémoire (PGlite, PostgreSQL
 * compilé en WebAssembly) créée avec NOS scripts sql/schema.sql et
 * sql/seed.sql. Les tests exécutent donc le vrai SQL de l'application.
 */
import fs from "fs";
import path from "path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@shared/schema";
import type { Database } from "../../server/db/postgres";
import type { TokenVerifier, VerifiedIdentity } from "../../server/security/TokenVerifier";
import { createContainer } from "../../server/container";
import { InMemoryPreferenceRepository, InMemoryAdminLogRepository } from "../../server/repositories/PreferenceRepository";

const root = path.resolve(import.meta.dirname, "..", "..");

export async function createTestDatabase(): Promise<{ db: Database; client: PGlite }> {
  const client = new PGlite();
  await client.exec(fs.readFileSync(path.join(root, "sql", "schema.sql"), "utf-8"));
  await client.exec(fs.readFileSync(path.join(root, "sql", "seed.sql"), "utf-8"));
  // PGlite et node-postgres exposent la même API Drizzle (PgDatabase)
  const db = drizzle(client, { schema }) as unknown as Database;
  return { db, client };
}

/**
 * Faux vérificateur : le « token » est simplement l'UID Firebase.
 * Permet de simuler n'importe quel utilisateur sans appeler Google.
 */
export class FakeTokenVerifier implements TokenVerifier {
  async verify(token: string): Promise<VerifiedIdentity> {
    if (!token.startsWith("demo-uid-") && !token.startsWith("0Kn4")) throw new Error("token invalide");
    return { uid: token, email: `${token}@test.local` };
  }
}

export const TEST_JWT_SECRET = "secret-de-test-suffisamment-long-pour-hs256";

export async function createTestContainer() {
  const { db, client } = await createTestDatabase();
  const container = createContainer({
    db,
    tokenVerifier: new FakeTokenVerifier(),
    jwtSecret: TEST_JWT_SECRET,
    preferenceRepository: new InMemoryPreferenceRepository(),
    adminLogRepository: new InMemoryAdminLogRepository(),
  });
  return { container, db, client };
}

/** Identifiants du jeu de données (sql/seed.sql). */
export const SEED = {
  admin: { id: 1, token: "0Kn4RzhaOmgo1jFG5t97cils05o1" },
  marie: { id: 2, token: "demo-uid-marie" },     // chauffeuse, Tesla électrique, 50 crédits
  pierre: { id: 3, token: "demo-uid-pierre" },   // chauffeur + passager, 35 crédits
  sophie: { id: 4, token: "demo-uid-sophie" },   // passagère, 20 crédits
  lucas: { id: 5, token: "demo-uid-lucas" },     // passager, 12 crédits
  employee: { email: "employe@ecoride.com", password: "Employe2026!" },
  trips: { parisLyonMarie: 1, parisLyonPierre: 2, lyonMarseille: 3, lilleParisDone: 4 },
};
