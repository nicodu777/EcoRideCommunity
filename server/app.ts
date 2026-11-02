/**
 * Construction de l'application Express (sans démarrer le serveur).
 *
 * Séparer « construire » et « démarrer » permet aux tests automatisés
 * d'envoyer des requêtes HTTP à l'application sans ouvrir de port.
 */
import express, { type Express } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { Container } from "./container";
import { createApiRouter } from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

export function createApp(container: Container, options: { production: boolean }): Express {
  const app = express();
  app.disable("x-powered-by"); // ne pas annoncer la technologie utilisée
  app.set("trust proxy", 1);   // derrière le proxy de l'hébergeur (Render) : vraie IP du client pour le rate limit

  /**
   * En-têtes de sécurité HTTP (helmet) :
   * - Content-Security-Policy : le navigateur n'exécute que les scripts de
   *   notre domaine et de Google (Firebase) → limite l'impact d'une faille XSS ;
   * - X-Content-Type-Options, X-Frame-Options (anti clickjacking), HSTS...
   * En développement, Vite injecte des scripts inline : la CSP est désactivée.
   */
  app.use(helmet({
    contentSecurityPolicy: options.production ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://apis.google.com"],
        connectSrc: ["'self'", "https://*.googleapis.com", "https://*.firebaseio.com", "https://*.firebaseapp.com"],
        frameSrc: ["https://*.firebaseapp.com"],
        imgSrc: ["'self'", "data:", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
      },
    } : false,
  }));

  app.use(express.json({ limit: "100kb" })); // un corps de requête énorme est refusé

  // Limite globale anti-abus sur l'API : 300 requêtes / 15 min / IP
  app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false }));

  app.use("/api", createApiRouter(container));
  app.use(errorHandler);
  return app;
}
