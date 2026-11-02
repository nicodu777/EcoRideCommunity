/**
 * Configuration de drizzle-kit (outil en ligne de commande de Drizzle).
 *   npm run db:push      → applique shared/schema.ts sur la base de DATABASE_URL
 *   npm run db:generate  → génère le script SQL de migration dans migrations/
 */
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL manquant : copiez .env.example en .env");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
