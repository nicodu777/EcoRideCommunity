/**
 * TripRepository - Accès aux données des trajets.
 *
 * Les lectures « enrichies » font une jointure SQL :
 *   trips INNER JOIN users (chauffeur) INNER JOIN vehicles
 * pour renvoyer en une seule requête le trajet, son chauffeur et son véhicule.
 */
import { and, eq, gt, gte, ilike, lte, sql, asc, desc, type SQL } from "drizzle-orm";
import { trips, users, vehicles, type Trip, type TripWithDriver, type SearchTrip } from "@shared/schema";
import type { Database, Executor } from "../db/postgres";

/** Colonnes sélectionnées pour construire un TripWithDriver. */
const tripWithDriverColumns = {
  trip: trips,
  driver: {
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    averageRating: users.averageRating,
    totalRatings: users.totalRatings,
  },
  vehicle: {
    brand: vehicles.brand,
    model: vehicles.model,
    color: vehicles.color,
    energy: vehicles.energy,
  },
};

type TripRow = {
  trip: Trip;
  driver: TripWithDriver["driver"];
  vehicle: TripWithDriver["vehicle"];
};

/** Transforme une ligne SQL en objet métier (règle : écologique = électrique). */
function toTripWithDriver(row: TripRow): TripWithDriver {
  return { ...row.trip, driver: row.driver, vehicle: row.vehicle, isEcological: row.vehicle.energy === "electric" };
}

export class TripRepository {
  constructor(private readonly db: Database) {}

  private selectWithDriver(tx: Executor = this.db) {
    return tx
      .select(tripWithDriverColumns)
      .from(trips)
      .innerJoin(users, eq(trips.driverId, users.id))
      .innerJoin(vehicles, eq(trips.vehicleId, vehicles.id));
  }

  async findById(id: number, tx: Executor = this.db): Promise<Trip | undefined> {
    const [trip] = await tx.select().from(trips).where(eq(trips.id, id));
    return trip;
  }

  /** Verrouille la ligne du trajet le temps de la transaction (gestion des places). */
  async findByIdForUpdate(id: number, tx: Executor): Promise<Trip | undefined> {
    const [trip] = await tx.select().from(trips).where(eq(trips.id, id)).for("update");
    return trip;
  }

  async findWithDriver(id: number): Promise<TripWithDriver | undefined> {
    const [row] = await this.selectWithDriver().where(eq(trips.id, id));
    return row ? toTripWithDriver(row) : undefined;
  }

  /** Trajets à venir encore réservables (page d'accueil). */
  async listUpcoming(limit = 20): Promise<TripWithDriver[]> {
    const rows = await this.selectWithDriver()
      .where(and(eq(trips.status, "pending"), gt(trips.availableSeats, 0), gt(trips.departureTime, new Date())))
      .orderBy(asc(trips.departureTime))
      .limit(limit);
    return rows.map(toTripWithDriver);
  }

  /** Conditions communes à la recherche (US3) et aux filtres (US4), hors date. */
  private searchConditions(params: SearchTrip): SQL[] {
    const conditions: SQL[] = [
      eq(trips.status, "pending"),
      gt(trips.availableSeats, 0),                 // US3 : seulement les trajets avec au moins une place
      gt(trips.departureTime, new Date()),
      ilike(trips.departure, `%${params.departure}%`),     // valeur passée en paramètre, pas concaténée au SQL
      ilike(trips.destination, `%${params.destination}%`),
    ];
    if (params.ecologicalOnly) conditions.push(eq(vehicles.energy, "electric"));
    if (params.maxPrice !== undefined) conditions.push(lte(trips.pricePerSeat, params.maxPrice.toFixed(2)));
    if (params.minRating !== undefined) conditions.push(gte(users.averageRating, params.minRating.toFixed(2)));
    if (params.maxDurationMinutes !== undefined) {
      conditions.push(
        sql`EXTRACT(EPOCH FROM (${trips.arrivalTime} - ${trips.departureTime})) / 60 <= ${params.maxDurationMinutes}`,
      );
    }
    return conditions;
  }

  async search(params: SearchTrip): Promise<TripWithDriver[]> {
    const conditions = this.searchConditions(params);
    if (params.date) conditions.push(sql`${trips.departureTime}::date = ${params.date}::date`);
    const rows = await this.selectWithDriver()
      .where(and(...conditions))
      .orderBy(asc(trips.departureTime));
    return rows.map(toTripWithDriver);
  }

  /**
   * US3 : si aucun trajet ce jour-là, on cherche la date du trajet
   * correspondant le plus proche (à partir de la date demandée).
   */
  async findNearestDate(params: SearchTrip): Promise<string | null> {
    const conditions = this.searchConditions(params);
    if (params.date) conditions.push(sql`${trips.departureTime}::date >= ${params.date}::date`);
    const [row] = await this.db
      .select({ day: sql<string>`to_char(${trips.departureTime}, 'YYYY-MM-DD')` })
      .from(trips)
      .innerJoin(users, eq(trips.driverId, users.id))
      .innerJoin(vehicles, eq(trips.vehicleId, vehicles.id))
      .where(and(...conditions))
      .orderBy(asc(trips.departureTime))
      .limit(1);
    return row?.day ?? null;
  }

  async findByDriver(driverId: number): Promise<TripWithDriver[]> {
    const rows = await this.selectWithDriver().where(eq(trips.driverId, driverId)).orderBy(desc(trips.departureTime));
    return rows.map(toTripWithDriver);
  }

  async create(data: Omit<typeof trips.$inferInsert, "id" | "createdAt" | "status">): Promise<Trip> {
    const [trip] = await this.db.insert(trips).values(data).returning();
    return trip;
  }

  async update(id: number, updates: Partial<Pick<Trip, "status" | "startedAt" | "completedAt">>, tx: Executor = this.db): Promise<Trip> {
    const [trip] = await tx.update(trips).set(updates).where(eq(trips.id, id)).returning();
    return trip;
  }

  /** Ajoute ou retire des places (delta négatif à la réservation, positif à l'annulation). */
  async adjustSeats(id: number, delta: number, tx: Executor): Promise<void> {
    await tx
      .update(trips)
      .set({ availableSeats: sql`${trips.availableSeats} + ${delta}` })
      .where(eq(trips.id, id));
  }

  /** US13 : nombre de covoiturages par jour (date de départ). */
  async countByDay(): Promise<{ date: string; count: number }[]> {
    const day = sql<string>`to_char(${trips.departureTime}, 'YYYY-MM-DD')`;
    return this.db
      .select({ date: day, count: sql<number>`count(*)::int` })
      .from(trips)
      .where(sql`${trips.status} <> 'cancelled'`)
      .groupBy(day)
      .orderBy(day);
  }
}
