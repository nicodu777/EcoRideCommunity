/**
 * Point d'entrée du serveur Express — Backend EcoRide
 *
 * Je configure ici l'application Express avec ses middlewares globaux,
 * l'enregistrement des routes API, et le démarrage sur le port 5001.
 * Le frontend (Vite, port 5000) communique avec ce serveur via proxy.
 */

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

const app = express();

// Middleware CORS — autorise le frontend Vite (port 5000) à appeler l'API
app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = ["http://localhost:5000", "http://0.0.0.0:5000"];
  const origin = req.headers.origin as string;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware de log des requêtes API
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      const time = new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      console.log(`${time} [api] ${logLine}`);
    }
  });

  next();
});

(async () => {
  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  // Le backend tourne sur le port 5001
  // Le frontend (port 5000) proxie les appels /api vers ici via Vite
  const port = 5001;
  app.listen(port, "0.0.0.0", () => {
    console.log(`[backend] Serveur API démarré sur le port ${port}`);
  });
})();
