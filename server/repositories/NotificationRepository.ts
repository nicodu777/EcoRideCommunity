/**
 * NotificationRepository - Messages d'information envoyés aux utilisateurs.
 *
 * Utilisé par exemple quand un chauffeur annule un trajet (US10) :
 * chaque passager reçoit une notification dans son espace.
 */
import { and, eq, desc } from "drizzle-orm";
import { notifications, type Notification } from "@shared/schema";
import type { Database, Executor } from "../db/postgres";

export class NotificationRepository {
  constructor(private readonly db: Database) {}

  async create(userId: number, title: string, message: string, tx: Executor = this.db): Promise<void> {
    await tx.insert(notifications).values({ userId, title, message });
  }

  async findByUser(userId: number): Promise<Notification[]> {
    return this.db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
  }

  async markRead(id: number, userId: number): Promise<void> {
    // userId dans la condition : on ne peut marquer que SES notifications
    await this.db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }
}
