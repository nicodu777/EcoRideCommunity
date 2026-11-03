/**
 * Point d'entrée unique de toutes les routes API (/api/...).
 */
import { Router } from "express";
import type { Container } from "../container";
import { createUserRoutes } from "./userRoutes";
import { createVehicleRoutes } from "./vehicleRoutes";
import { createTripRoutes } from "./tripRoutes";
import { createBookingRoutes } from "./bookingRoutes";
import { createEmployeeRoutes } from "./employeeRoutes";
import { createAdminRoutes } from "./adminRoutes";
import { createChatRoutes } from "./chatRoutes";

export function createApiRouter(container: Container): Router {
  const api = Router();
  // Utilisée par l'hébergeur pour vérifier que l'application répond
  api.get("/health", (_req, res) => res.json({ status: "ok" }));
  api.use(createUserRoutes(container));
  api.use(createVehicleRoutes(container));
  api.use(createTripRoutes(container));
  api.use(createBookingRoutes(container));
  api.use(createEmployeeRoutes(container));
  api.use(createAdminRoutes(container));
  api.use(createChatRoutes(container));
  // Toute autre URL /api/... -> 404 en JSON (et pas la page HTML du front)
  api.use((_req, res) => res.status(404).json({ message: "Route API inconnue" }));
  return api;
}
