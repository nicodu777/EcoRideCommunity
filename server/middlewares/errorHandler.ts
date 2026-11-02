/**
 * Gestion centralisée des erreurs (dernier middleware Express).
 */
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Données invalides envoyées par le client
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Données invalides",
      errors: err.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
    });
  }
  // Erreur métier prévue
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message });
  }
  // JSON mal formé dans le corps de la requête
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ message: "JSON invalide" });
  }
  // Erreur imprévue : on la journalise côté serveur, on reste vague côté client
  console.error("[erreur]", err);
  return res.status(500).json({ message: "Erreur serveur interne" });
}

/** Évite de répéter try/catch dans chaque route asynchrone. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

/** Lit un identifiant numérique dans l'URL (/api/trips/:id) et le valide. */
export function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw AppError.badRequest("Identifiant invalide");
  return id;
}
