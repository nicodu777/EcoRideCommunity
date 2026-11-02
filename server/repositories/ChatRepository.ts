/**
 * ChatRepository - Messages échangés entre participants d'un trajet.
 */
import { and, eq, ne, asc, sql } from "drizzle-orm";
import { chatMessages, type ChatMessage } from "@shared/schema";
import type { Database } from "../db/postgres";

export class ChatRepository {
  constructor(private readonly db: Database) {}

  async findByTrip(tripId: number): Promise<ChatMessage[]> {
    return this.db.select().from(chatMessages).where(eq(chatMessages.tripId, tripId)).orderBy(asc(chatMessages.createdAt));
  }

  async create(tripId: number, senderId: number, message: string): Promise<ChatMessage> {
    const [created] = await this.db.insert(chatMessages).values({ tripId, senderId, message }).returning();
    return created;
  }

  /** Marque comme lus les messages reçus (envoyés par les autres) sur ce trajet. */
  async markRead(tripId: number, readerId: number): Promise<void> {
    await this.db
      .update(chatMessages)
      .set({ isRead: true })
      .where(and(eq(chatMessages.tripId, tripId), ne(chatMessages.senderId, readerId)));
  }

  /** Nombre de messages non lus par trajet, pour une liste de trajets. */
  async unreadCountsByTrip(tripIds: number[], readerId: number): Promise<Map<number, number>> {
    if (tripIds.length === 0) return new Map();
    const rows = await this.db
      .select({ tripId: chatMessages.tripId, count: sql<number>`count(*)::int` })
      .from(chatMessages)
      .where(and(
        sql`${chatMessages.tripId} IN (${sql.join(tripIds.map((id) => sql`${id}`), sql`, `)})`,
        ne(chatMessages.senderId, readerId),
        eq(chatMessages.isRead, false),
      ))
      .groupBy(chatMessages.tripId);
    return new Map(rows.map((r) => [r.tripId, r.count]));
  }
}
