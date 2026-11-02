/**
 * EarningsRepository - Crédits gagnés par la plateforme (US13).
 */
import { sql } from "drizzle-orm";
import { platformEarnings } from "@shared/schema";
import type { Database, Executor } from "../db/postgres";

export class EarningsRepository {
  constructor(private readonly db: Database) {}

  async create(tripId: number, bookingId: number, amount: number, tx: Executor): Promise<void> {
    await tx.insert(platformEarnings).values({ tripId, bookingId, amount: amount.toFixed(2) });
  }

  /** Crédits gagnés par jour (graphique de l'administrateur). */
  async dailyTotals(): Promise<{ date: string; amount: number }[]> {
    const day = sql<string>`to_char(${platformEarnings.date}, 'YYYY-MM-DD')`;
    const rows = await this.db
      .select({ date: day, amount: sql<string>`sum(${platformEarnings.amount})` })
      .from(platformEarnings)
      .groupBy(day)
      .orderBy(day);
    return rows.map((r) => ({ date: r.date, amount: Number(r.amount) }));
  }

  async total(): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(${platformEarnings.amount}), 0)` })
      .from(platformEarnings);
    return Number(row.total);
  }
}
