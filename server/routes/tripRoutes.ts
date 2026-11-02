/**
 * Routes /api/trips - Covoiturages.
 *
 * Consultation (liste, recherche, détail) : publique (visiteur, US3 à US5).
 * Publication et gestion : réservées au chauffeur connecté, qui ne peut
 * agir que sur SES trajets (contrôle fait dans TripService).
 */
import { Router } from "express";
import { insertTripSchema, searchTripSchema } from "@shared/schema";
import type { Container } from "../container";
import { asyncHandler, parseId } from "../middlewares/errorHandler";

export function createTripRoutes({ services, auth }: Container): Router {
  const router = Router();

  router.get("/trips", asyncHandler(async (_req, res) => {
    res.json(await services.trips.listUpcoming());
  }));

  router.post("/trips/search", asyncHandler(async (req, res) => {
    const params = searchTripSchema.parse(req.body);
    res.json(await services.trips.search(params));
  }));

  // Déclarée avant /trips/:id pour que « mine » ne soit pas lu comme un identifiant
  router.get("/trips/mine", auth.requireAuth, asyncHandler(async (req, res) => {
    res.json(await services.trips.listMine(req.user!));
  }));

  router.get("/trips/:id", asyncHandler(async (req, res) => {
    res.json(await services.trips.getDetails(parseId(req.params.id)));
  }));

  router.post("/trips", auth.requireAuth, asyncHandler(async (req, res) => {
    const data = insertTripSchema.parse(req.body);
    res.status(201).json(await services.trips.create(req.user!, data));
  }));

  router.post("/trips/:id/start", auth.requireAuth, asyncHandler(async (req, res) => {
    res.json(await services.trips.start(req.user!, parseId(req.params.id)));
  }));

  router.post("/trips/:id/complete", auth.requireAuth, asyncHandler(async (req, res) => {
    res.json(await services.trips.complete(req.user!, parseId(req.params.id)));
  }));

  router.post("/trips/:id/cancel", auth.requireAuth, asyncHandler(async (req, res) => {
    res.json(await services.trips.cancel(req.user!, parseId(req.params.id)));
  }));

  return router;
}
