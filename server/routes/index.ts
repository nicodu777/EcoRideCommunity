/**
 * Index des routes - Agrégateur de tous les routeurs
 * 
 * Ce fichier centralise l'enregistrement de toutes les routes de l'application.
 * Chaque domaine métier a son propre fichier de routes qui est importé ici.
 * 
 * Principe : Un seul point d'entrée pour toutes les routes API
 */

import { Express } from "express";
import userRoutes from "./userRoutes";
// Import des autres routes (à ajouter au fur et à mesure de la refactorisation)
// import tripRoutes from "./tripRoutes";
// import bookingRoutes from "./bookingRoutes";
// import ratingRoutes from "./ratingRoutes";
// import employeeRoutes from "./employeeRoutes";

/**
 * Enregistre toutes les routes API sur l'application Express
 * @param app - Instance de l'application Express
 */
export function registerApiRoutes(app: Express): void {
  // Routes utilisateurs (refactorisées en POO)
  app.use("/api/users", userRoutes);
  
  // Routes à refactoriser (encore dans l'ancien système)
  // app.use("/api/trips", tripRoutes);
  // app.use("/api/bookings", bookingRoutes);
  // app.use("/api/ratings", ratingRoutes);
  // app.use("/api/employee", employeeRoutes);
}
