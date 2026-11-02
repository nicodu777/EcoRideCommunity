/**
 * Démarrage du serveur EcoRide.
 *
 * 1. Connexion à PostgreSQL (obligatoire) et à MongoDB (optionnelle)
 * 2. Assemblage des dépendances (container)
 * 3. Création de l'application Express, puis du front (Vite en dev,
 *    fichiers compilés en production)
 */
import { createServer } from "http";
import { env, isProduction } from "./config/env";
import { createPostgresDatabase } from "./db/postgres";
import { connectMongo } from "./db/mongo";
import {
  MongoPreferenceRepository, MongoAdminLogRepository,
  InMemoryPreferenceRepository, InMemoryAdminLogRepository,
} from "./repositories/PreferenceRepository";
import { FirebaseTokenVerifier } from "./security/TokenVerifier";
import { createContainer } from "./container";
import { createApp } from "./app";
import { serveStatic, log } from "./static";

async function main() {
  const postgres = createPostgresDatabase();
  const mongo = await connectMongo().catch((err) => {
    console.error("[mongo] connexion impossible :", err.message);
    return null;
  });

  const container = createContainer({
    db: postgres.db,
    tokenVerifier: new FirebaseTokenVerifier(env.firebaseProjectId),
    jwtSecret: env.jwtSecret,
    preferenceRepository: mongo ? new MongoPreferenceRepository(mongo.db) : new InMemoryPreferenceRepository(),
    adminLogRepository: mongo ? new MongoAdminLogRepository(mongo.db) : new InMemoryAdminLogRepository(),
  });

  const app = createApp(container, { production: isProduction });
  const server = createServer(app);

  // Le front est servi APRÈS l'API pour que la route « catch-all » du front n'intercepte pas /api
  if (isProduction) {
    serveStatic(app);
  } else {
    // Import dynamique : Vite n'est chargé (et installé) qu'en développement
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  }

  server.listen(env.port, "0.0.0.0", () => log(`EcoRide démarré sur http://localhost:${env.port}`));

  // Arrêt propre : on ferme les connexions aux bases
  const shutdown = async () => {
    server.close();
    await Promise.allSettled([postgres.close(), mongo?.close()]);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Échec du démarrage :", err);
  process.exit(1);
});
