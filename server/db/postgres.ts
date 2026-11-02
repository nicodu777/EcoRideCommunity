/**
 * Connexion à la base relationnelle PostgreSQL.
 *
 * On utilise le driver standard `pg` (node-postgres) : il fonctionne avec
 * le PostgreSQL de Docker, de Replit ou de Neon (même URL de connexion).
 * Drizzle ORM génère des requêtes paramétrées ($1, $2...) : les valeurs
 * saisies par l'utilisateur ne sont jamais concaténées dans le SQL.
 */
import pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { env } from "../config/env";

export type Database = NodePgDatabase<typeof schema>;

/** Objet transaction fourni par `db.transaction(async (tx) => ...)`. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Un repository peut travailler sur la base ou dans une transaction en cours. */
export type Executor = Database | Transaction;

export function createPostgresDatabase(): { db: Database; close: () => Promise<void> } {
  const pool = new pg.Pool({ connectionString: env.databaseUrl, max: 10 });
  const db = drizzle(pool, { schema });
  return { db, close: () => pool.end() };
}
