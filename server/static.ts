/**
 * Fichiers du front compilé (production) + petite fonction de log.
 *
 * Séparé de vite.ts pour que la production ne charge jamais Vite,
 * qui est une dépendance de développement uniquement.
 */
import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const time = new Date().toLocaleTimeString("fr-FR");
  console.log(`${time} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(`Dossier du front introuvable : ${distPath}. Lancez d'abord « npm run build ».`);
  }
  app.use(express.static(distPath));
  // Toute URL inconnue renvoie index.html : c'est le routeur React qui affiche la bonne page
  app.use("*", (_req, res) => res.sendFile(path.resolve(distPath, "index.html")));
}
