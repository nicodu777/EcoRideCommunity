/**
 * TripIssueRepository - Accès aux données des litiges (US12).
 *
 * L'employé doit voir le numéro du covoiturage, le pseudo et l'email du
 * passager et du chauffeur, les lieux et dates : d'où les jointures.
 */
import { eq, asc, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { tripIssues, trips, users, type TripIssue } from "@shared/schema";
import type { Database, Executor } from "../db/postgres";

const passenger = alias(users, "passenger");
const driver = alias(users, "driver");

export type TripIssueDetails = TripIssue & {
  trip: { departure: string; destination: string; departureTime: Date; arrivalTime: Date };
  passenger: { name: string; email: string };
  driver: { name: string; email: string };
};

export class TripIssueRepository {
  constructor(private readonly db: Database) {}

  async create(data: Pick<TripIssue, "tripId" | "bookingId" | "reporterId" | "issueDescription">, tx: Executor = this.db): Promise<TripIssue> {
    const [issue] = await tx.insert(tripIssues).values(data).returning();
    return issue;
  }

  async findByIdForUpdate(id: number, tx: Executor): Promise<TripIssue | undefined> {
    const [issue] = await tx.select().from(tripIssues).where(eq(tripIssues.id, id)).for("update");
    return issue;
  }

  async findAllWithDetails(): Promise<TripIssueDetails[]> {
    const rows = await this.db
      .select({
        issue: tripIssues,
        trip: {
          departure: trips.departure, destination: trips.destination,
          departureTime: trips.departureTime, arrivalTime: trips.arrivalTime,
        },
        passengerFirst: passenger.firstName, passengerLast: passenger.lastName, passengerEmail: passenger.email,
        driverFirst: driver.firstName, driverLast: driver.lastName, driverEmail: driver.email,
      })
      .from(tripIssues)
      .innerJoin(trips, eq(tripIssues.tripId, trips.id))
      .innerJoin(passenger, eq(tripIssues.reporterId, passenger.id))
      .innerJoin(driver, eq(trips.driverId, driver.id))
      .orderBy(desc(tripIssues.status), asc(tripIssues.createdAt)); // "pending" avant "resolved"

    return rows.map((r) => ({
      ...r.issue,
      trip: r.trip,
      passenger: { name: `${r.passengerFirst} ${r.passengerLast}`, email: r.passengerEmail },
      driver: { name: `${r.driverFirst} ${r.driverLast}`, email: r.driverEmail },
    }));
  }

  async resolve(
    id: number,
    data: Pick<TripIssue, "decision" | "resolution" | "handledBy">,
    tx: Executor,
  ): Promise<TripIssue> {
    const [issue] = await tx
      .update(tripIssues)
      .set({ ...data, status: "resolved", resolvedAt: new Date() })
      .where(eq(tripIssues.id, id))
      .returning();
    return issue;
  }
}
