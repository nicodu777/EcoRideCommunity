/**
 * Routes /api/employee - Espace employé (US12).
 *
 * Chaque route exige un JWT employé valide ET la permission correspondante.
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { employeeLoginSchema, resolveIssueSchema } from "@shared/schema";
import type { Container } from "../container";
import { asyncHandler, parseId } from "../middlewares/errorHandler";

/** Anti force brute : 10 tentatives de connexion par IP toutes les 15 minutes. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Trop de tentatives de connexion, réessayez dans 15 minutes" },
});

export function createEmployeeRoutes({ services, repositories, auth }: Container): Router {
  const router = Router();

  router.post("/employee/login", loginLimiter, asyncHandler(async (req, res) => {
    const { email, password } = employeeLoginSchema.parse(req.body);
    res.json(await services.employees.login(email, password));
  }));

  router.get("/employee/me", auth.requireEmployee(), (req, res) => {
    res.json(req.employee);
  });

  // ---- Modération des avis ----
  router.get("/employee/pending-ratings", auth.requireEmployee("ratings"), asyncHandler(async (_req, res) => {
    res.json(await services.ratings.listPending());
  }));

  router.patch("/employee/ratings/:id/approve", auth.requireEmployee("ratings"), asyncHandler(async (req, res) => {
    res.json(await services.ratings.review(req.employee!.id, parseId(req.params.id), true));
  }));

  router.patch("/employee/ratings/:id/reject", auth.requireEmployee("ratings"), asyncHandler(async (req, res) => {
    res.json(await services.ratings.review(req.employee!.id, parseId(req.params.id), false));
  }));

  // ---- Litiges ----
  router.get("/employee/trip-issues", auth.requireEmployee("trip_issues"), asyncHandler(async (_req, res) => {
    res.json(await repositories.issues.findAllWithDetails());
  }));

  router.patch("/employee/trip-issues/:id/resolve", auth.requireEmployee("trip_issues"), asyncHandler(async (req, res) => {
    const { decision, resolution } = resolveIssueSchema.parse(req.body);
    res.json(await services.bookings.resolveIssue(req.employee!.id, parseId(req.params.id), decision, resolution));
  }));

  return router;
}
