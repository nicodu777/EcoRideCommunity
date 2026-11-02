/**
 * Routes /api/admin - Espace administrateur (US13).
 *
 * `router.use(...)` place les deux contrôles devant TOUTES les routes du
 * fichier : impossible d'oublier la protection sur une nouvelle route.
 */
import { Router } from "express";
import { insertEmployeeSchema } from "@shared/schema";
import type { Container } from "../container";
import { asyncHandler, parseId } from "../middlewares/errorHandler";

export function createAdminRoutes({ services, auth }: Container): Router {
  const router = Router();
  router.use("/admin", auth.requireAuth, auth.requireRole("admin"));

  router.get("/admin/users", asyncHandler(async (_req, res) => {
    res.json(await services.admin.listUsers());
  }));

  router.put("/admin/users/:id/suspend", asyncHandler(async (req, res) => {
    res.json(await services.admin.setSuspended(req.user!, parseId(req.params.id), true));
  }));

  router.put("/admin/users/:id/reactivate", asyncHandler(async (req, res) => {
    res.json(await services.admin.setSuspended(req.user!, parseId(req.params.id), false));
  }));

  router.get("/admin/analytics/daily-trips", asyncHandler(async (_req, res) => {
    res.json(await services.admin.dailyTrips());
  }));

  router.get("/admin/analytics/daily-earnings", asyncHandler(async (_req, res) => {
    res.json(await services.admin.dailyEarnings());
  }));

  router.get("/admin/analytics/total-earnings", asyncHandler(async (_req, res) => {
    res.json(await services.admin.totalEarnings());
  }));

  router.get("/admin/employees", asyncHandler(async (_req, res) => {
    res.json(await services.employees.list());
  }));

  router.post("/admin/employees", asyncHandler(async (req, res) => {
    const data = insertEmployeeSchema.parse(req.body);
    const employee = await services.employees.create(req.user!.id, data);
    await services.admin.log(req.user!.id, "create_employee", employee.id, { email: employee.email });
    res.status(201).json(employee);
  }));

  router.patch("/admin/employees/:id/deactivate", asyncHandler(async (req, res) => {
    const employee = await services.employees.setActive(parseId(req.params.id), false);
    await services.admin.log(req.user!.id, "deactivate_employee", employee.id, { email: employee.email });
    res.json(employee);
  }));

  /** Journal des actions de l'administrateur (lu dans MongoDB). */
  router.get("/admin/actions", asyncHandler(async (_req, res) => {
    res.json(await services.admin.latestActions());
  }));

  return router;
}
