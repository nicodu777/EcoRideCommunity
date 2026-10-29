/**
 * Routes /api/chat - Messagerie entre participants d'un trajet.
 */
import { Router } from "express";
import { insertChatMessageSchema } from "@shared/schema";
import type { Container } from "../container";
import { asyncHandler, parseId } from "../middlewares/errorHandler";

export function createChatRoutes({ services, auth }: Container): Router {
  const router = Router();
  router.use("/chat", auth.requireAuth);

  router.get("/chat/conversations", asyncHandler(async (req, res) => {
    res.json(await services.chat.conversations(req.user!));
  }));

  router.get("/chat/unread-count", asyncHandler(async (req, res) => {
    res.json(await services.chat.unreadCount(req.user!));
  }));

  router.get("/chat/trip/:tripId", asyncHandler(async (req, res) => {
    res.json(await services.chat.messages(req.user!, parseId(req.params.tripId)));
  }));

  router.post("/chat/messages", asyncHandler(async (req, res) => {
    const { tripId, message } = insertChatMessageSchema.parse(req.body);
    res.status(201).json(await services.chat.send(req.user!, tripId, message));
  }));

  return router;
}
