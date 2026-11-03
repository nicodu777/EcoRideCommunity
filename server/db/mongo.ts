/**
 * Connexion à la base NoSQL MongoDB.
 *
 * Pourquoi une base NoSQL en plus de PostgreSQL ?
 * - les préférences d'un chauffeur ont une structure libre (fumeur, animaux,
 *   plus une liste de préférences personnalisées de longueur variable) :
 *   un document JSON s'y prête mieux qu'une table à colonnes fixes ;
 * - le journal des actions de l'administrateur est un flux d'événements
 *   en ajout seul, avec des détails différents selon l'action.
 *
 * Si MONGO_URL n'est pas défini, l'application démarre quand même :
 * seules ces deux fonctionnalités renvoient une erreur 503.
 */
import { MongoClient, type Db } from "mongodb";
import { env } from "../config/env";

export async function connectMongo(): Promise<{ db: Db; close: () => Promise<void> } | null> {
  if (!env.mongoUrl) {
    console.warn("[mongo] MONGO_URL absent : préférences et journal admin désactivés");
    return null;
  }
  const client = new MongoClient(env.mongoUrl, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(); // nom de base pris dans l'URL (.../ecoride)
  // Un seul document de préférences par chauffeur
  await db.collection("driver_preferences").createIndex({ userId: 1 }, { unique: true });
  await db.collection("admin_logs").createIndex({ createdAt: -1 });
  return { db, close: () => client.close() };
}
