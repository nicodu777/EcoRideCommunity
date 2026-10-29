/**
 * RatingRepository - Accès aux données des avis.
 */
import { and, eq, isNull, desc, asc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ratings, users, type Rating, type InsertRating } from "@shared/schema";
import type { Database } from "../db/postgres";

/** Avis en attente avec les noms de l'auteur et du chauffeur (espace employé). */
export type PendingRating = Rating & { raterName: string; rateeName: string };

const rater = alias(users, "rater");
const ratee = alias(users, "ratee");

export class RatingRepository {
  constructor(private readonly db: Database) {}

  async create(data: InsertRating & { raterId: number; rateeId: number }): Promise<Rating> {
    const [rating] = await this.db.insert(ratings).values(data).returning();
    return rating;
  }

  async findById(id: number): Promise<Rating | undefined> {
    const [rating] = await this.db.select().from(ratings).where(eq(ratings.id, id));
    return rating;
  }

  async findByTripAndRater(tripId: number, raterId: number): Promise<Rating | undefined> {
    const [rating] = await this.db
      .select()
      .from(ratings)
      .where(and(eq(ratings.tripId, tripId), eq(ratings.raterId, raterId)));
    return rating;
  }

  async findPending(): Promise<PendingRating[]> {
    const rows = await this.db
      .select({
        rating: ratings,
        raterName: sql<string>`${rater.firstName} || ' ' || ${rater.lastName}`,
        rateeName: sql<string>`${ratee.firstName} || ' ' || ${ratee.lastName}`,
      })
      .from(ratings)
      .innerJoin(rater, eq(ratings.raterId, rater.id))
      .innerJoin(ratee, eq(ratings.rateeId, ratee.id))
      .where(isNull(ratings.isApproved))
      .orderBy(asc(ratings.createdAt));
    return rows.map((r) => ({ ...r.rating, raterName: r.raterName, rateeName: r.rateeName }));
  }

  /** Avis publiés sur un chauffeur (affichés dans le détail d'un trajet, US5). */
  async findApprovedForUser(userId: number, limit = 10) {
    return this.db
      .select({ id: ratings.id, rating: ratings.rating, comment: ratings.comment, createdAt: ratings.createdAt })
      .from(ratings)
      .where(and(eq(ratings.rateeId, userId), eq(ratings.isApproved, true)))
      .orderBy(desc(ratings.createdAt))
      .limit(limit);
  }

  async review(id: number, employeeId: number, isApproved: boolean): Promise<Rating> {
    const [rating] = await this.db
      .update(ratings)
      .set({ isApproved, reviewedBy: employeeId, reviewedAt: new Date() })
      .where(eq(ratings.id, id))
      .returning();
    return rating;
  }

  /** Moyenne et nombre des avis PUBLIÉS d'un utilisateur, calculés par SQL. */
  async approvedStats(userId: number): Promise<{ average: number; count: number }> {
    const [row] = await this.db
      .select({
        average: sql<string>`coalesce(avg(${ratings.rating}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(ratings)
      .where(and(eq(ratings.rateeId, userId), eq(ratings.isApproved, true)));
    return { average: Number(row.average), count: row.count };
  }
}
