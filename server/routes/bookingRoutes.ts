/**
 * Routes /api/bookings et /api/ratings - Espace passager.
 */
import { Router } from "express";
import { insertBookingSchema, insertRatingSchema, reportIssueSchema } from "@shared/schema";
import type { Container } from "../container";
import { asyncHandler, parseId } from "../middlewares/errorHandler";

export function createBookingRoutes({ services, auth }: Container): Router {
  const router = Router();
  router.use(["/bookings", "/ratings"], auth.requireAuth);

  router.get("/bookings/mine", asyncHandler(async (req, res) => {
    res.json(await services.bookings.listMine(req.user!));
  }));

  /** US6 : seuls tripId, seatsBooked et message sont lus ; le prix est calculé par le serveur. */
  router.post("/bookings", asyncHandler(async (req, res) => {
    const data = insertBookingSchema.parse(req.body);
    res.status(201).json(await services.bookings.reserve(req.user!.id, data));
  }));

  router.post("/bookings/:id/cancel", asyncHandler(async (req, res) => {
    res.json(await services.bookings.cancel(req.user!.id, parseId(req.params.id)));
  }));

  router.post("/bookings/:id/validate", asyncHandler(async (req, res) => {
    res.json(await services.bookings.validate(req.user!.id, parseId(req.params.id)));
  }));

  router.post("/bookings/:id/report", asyncHandler(async (req, res) => {
    const { description } = reportIssueSchema.parse(req.body);
    res.status(201).json(await services.bookings.report(req.user!.id, parseId(req.params.id), description));
  }));

  router.post("/ratings", asyncHandler(async (req, res) => {
    const data = insertRatingSchema.parse(req.body);
    res.status(201).json(await services.ratings.create(req.user!, data));
  }));

  return router;
}
