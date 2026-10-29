/**
 * VehicleRepository - Accès aux données de la table `vehicles`.
 */
import { and, eq, inArray, count } from "drizzle-orm";
import { vehicles, trips, type Vehicle, type InsertVehicle } from "@shared/schema";
import type { Database } from "../db/postgres";

export class VehicleRepository {
  constructor(private readonly db: Database) {}

  async findByOwner(ownerId: number): Promise<Vehicle[]> {
    return this.db.select().from(vehicles).where(eq(vehicles.ownerId, ownerId)).orderBy(vehicles.id);
  }

  async findById(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await this.db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }

  async findByPlate(plate: string): Promise<Vehicle | undefined> {
    const [vehicle] = await this.db.select().from(vehicles).where(eq(vehicles.plate, plate));
    return vehicle;
  }

  async create(ownerId: number, data: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await this.db.insert(vehicles).values({ ...data, ownerId }).returning();
    return vehicle;
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(vehicles).where(eq(vehicles.id, id));
  }

  /** Nombre de trajets à venir ou en cours qui utilisent ce véhicule. */
  async countActiveTrips(vehicleId: number): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(trips)
      .where(and(eq(trips.vehicleId, vehicleId), inArray(trips.status, ["pending", "started"])));
    return row.value;
  }

  /** Nombre total de trajets (passés compris) : un véhicule utilisé ne peut pas être supprimé. */
  async countAllTrips(vehicleId: number): Promise<number> {
    const [row] = await this.db.select({ value: count() }).from(trips).where(eq(trips.vehicleId, vehicleId));
    return row.value;
  }
}
