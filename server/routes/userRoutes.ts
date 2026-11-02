/**
 * Routes /api/users et /api/notifications - Compte de l'utilisateur connecté.
 *
 * Les routes sont « fines » : elles valident l'entrée (Zod), appellent le
 * service et renvoient la réponse. Aucune logique métier, aucun SQL ici.
 * Il n'y a plus de route /api/users/:id : chacun n'accède qu'à SON profil
 * (/me), identifié par le token.
 */
import { Router } from "express";
import { registerUserSchema, updateProfileSchema } from "@shared/schema";
import type { Container } from "../container";
import { asyncHandler, parseId } from "../middlewares/errorHandler";
import { toOwnProfile } from "../services/UserService";

export function createUserRoutes({ services, repositories, auth }: Container): Router {
  const router = Router();

  /** POST /api/users - Création du profil après l'inscription Firebase (US7). */
  router.post("/users", auth.verifyIdentity, asyncHandler(async (req, res) => {
    const data = registerUserSchema.parse(req.body);
    const profile = await services.users.register(req.identity!, data);
    res.status(201).json(profile);
  }));

  /** GET /api/users/me - Profil de l'utilisateur connecté. */
  router.get("/users/me", auth.requireAuth, (req, res) => {
    res.json(toOwnProfile(req.user!));
  });

  /** PATCH /api/users/me - Modifier son profil (US8 : passager, chauffeur ou les deux). */
  router.patch("/users/me", auth.requireAuth, asyncHandler(async (req, res) => {
    const data = updateProfileSchema.parse(req.body);
    res.json(await services.users.updateProfile(req.user!, data));
  }));

  /** GET /api/notifications - Notifications de l'utilisateur connecté. */
  router.get("/notifications", auth.requireAuth, asyncHandler(async (req, res) => {
    res.json(await repositories.notifications.findByUser(req.user!.id));
  }));

  router.patch("/notifications/:id/read", auth.requireAuth, asyncHandler(async (req, res) => {
    await repositories.notifications.markRead(parseId(req.params.id), req.user!.id);
    res.status(204).end();
  }));

  return router;
}
