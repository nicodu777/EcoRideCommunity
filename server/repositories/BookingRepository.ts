/**
 * BookingRepository - Accès aux données des réservations.
 */
import { and, eq, inArray, desc } from "drizzle-orm";
import { bookings, trips, users, vehicles, type Booking, type BookingWithTrip } from "@shared/schema";
import type { Database, Executor } from "../db/postgres";

type BookingStatus = Booking["status"];

export class BookingRepository {
  constructor(private readonly db: Database) {}

  async create(
    data: Pick<Booking, "tripId" | "passengerId" | "seatsBooked" | "totalPrice"> & { message?: string | null },
    tx: Executor = this.db,
  ): Promise<Booking> {
    const [booking] = await tx.insert(bookings).values({ ...data, status: "confirmed" }).returning();
    return booking;
  }

  async findById(id: number, tx: Executor = this.db): Promise<Booking | undefined> {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async findByIdForUpdate(id: number, tx: Executor): Promise<Booking | undefined> {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, id)).for("update");
    return booking;
  }

  /** Réservations d'un trajet, filtrées par statut si besoin. */
  async findByTrip(tripId: number, statuses?: BookingStatus[], tx: Executor = this.db): Promise<Booking[]> {
    const condition = statuses
      ? and(eq(bookings.tripId, tripId), inArray(bookings.status, statuses))
      : eq(bookings.tripId, tripId);
    return tx.select().from(bookings).where(condition);
  }

  /** Une réservation encore active du même passager sur le même trajet ? */
  async findActive(tripId: number, passengerId: number, tx: Executor): Promise<Booking | undefined> {
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.tripId, tripId), eq(bookings.passengerId, passengerId), eq(bookings.status, "confirmed")));
    return booking;
  }

  /** Historique du passager (US10), avec trajet, chauffeur et véhicule. */
  async findByPassengerWithTrip(passengerId: number): Promise<BookingWithTrip[]> {
    const rows = await this.db
      .select({
        booking: bookings,
        trip: trips,
        driver: {
          id: users.id, firstName: users.firstName, lastName: users.lastName,
          averageRating: users.averageRating, totalRatings: users.totalRatings,
        },
        vehicle: { brand: vehicles.brand, model: vehicles.model, color: vehicles.color, energy: vehicles.energy },
      })
      .from(bookings)
      .innerJoin(trips, eq(bookings.tripId, trips.id))
      .innerJoin(users, eq(trips.driverId, users.id))
      .innerJoin(vehicles, eq(trips.vehicleId, vehicles.id))
      .where(eq(bookings.passengerId, passengerId))
      .orderBy(desc(trips.departureTime));

    return rows.map((r) => ({
      ...r.booking,
      trip: { ...r.trip, driver: r.driver, vehicle: r.vehicle, isEcological: r.vehicle.energy === "electric" },
    }));
  }

  async updateStatus(id: number, status: BookingStatus, tx: Executor = this.db): Promise<Booking> {
    const [booking] = await tx.update(bookings).set({ status }).where(eq(bookings.id, id)).returning();
    return booking;
  }

  /** Passe toutes les réservations confirmées d'un trajet à un nouveau statut. */
  async updateStatusForTrip(tripId: number, from: BookingStatus, to: BookingStatus, tx: Executor): Promise<Booking[]> {
    return tx
      .update(bookings)
      .set({ status: to })
      .where(and(eq(bookings.tripId, tripId), eq(bookings.status, from)))
      .returning();
  }
}
