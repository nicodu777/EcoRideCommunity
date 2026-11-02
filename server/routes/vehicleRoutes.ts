/**
 * Routes /api/vehicles et /api/preferences - Espace chauffeur (US8).
 */
import { Router } from "express";
import { insertVehicleSchema, driverPreferencesSchema } from "@shared/schema";
import type { Container } from "../container";
import { asyncHandler, parseId } from "../middlewares/errorHandler";

export function createVehicleRoutes({ services, auth }: Container): Router {
  const router = Router();
  router.use(["/vehicles", "/preferences"], auth.requireAuth);

  router.get("/vehicles/mine", asyncHandler(async (req, res) => {
    res.json(await services.vehicles.listMine(req.user!));
  }));

  router.post("/vehicles", asyncHandler(async (req, res) => {
    const data = insertVehicleSchema.parse(req.body);
    res.status(201).json(await services.vehicles.add(req.user!, data));
  }));

  router.delete("/vehicles/:id", asyncHandler(async (req, res) => {
    await services.vehicles.remove(req.user!, parseId(req.params.id));
    res.status(204).end();
  }));

  /** Préférences du chauffeur (MongoDB). */
  router.get("/preferences/me", asyncHandler(async (req, res) => {
    res.json(await services.preferences.getMine(req.user!));
  }));

  router.put("/preferences/me", asyncHandler(async (req, res) => {
    const data = driverPreferencesSchema.parse(req.body);
    res.json(await services.preferences.save(req.user!, data));
  }));

  return router;
}
