/**
 * Configuration centralisée de l'application.
 *
 * Toutes les valeurs sensibles (URL de base, secret JWT...) viennent des
 * variables d'environnement (fichier .env en local, variables Docker ou
 * Replit en production). Aucun secret n'est écrit dans le code source.
 */
import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name} (voir .env.example)`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  /** URL PostgreSQL, ex. postgres://ecoride:ecoride@localhost:5432/ecoride */
  get databaseUrl() { return required("DATABASE_URL"); },
  /** URL MongoDB (optionnelle : sans elle, les préférences sont désactivées) */
  mongoUrl: process.env.MONGO_URL ?? "",
  /** Identifiant du projet Firebase, utilisé pour vérifier la signature des tokens */
  get firebaseProjectId() { return required("FIREBASE_PROJECT_ID"); },
  /** Secret de signature des JWT employés (32 caractères aléatoires minimum) */
  get jwtSecret() {
    const secret = required("JWT_SECRET");
    if (secret.length < 32) throw new Error("JWT_SECRET doit faire au moins 32 caractères");
    return secret;
  },
};

export const isProduction = env.nodeEnv === "production";
