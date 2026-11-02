/**
 * VehicleService - Gestion des véhicules d'un chauffeur (US8).
 */
import type { User, Vehicle, InsertVehicle } from "@shared/schema";
import type { VehicleRepository } from "../repositories/VehicleRepository";
import { AppError } from "../errors/AppError";

export function isDriver(user: User): boolean {
  return user.role === "driver" || user.role === "both";
}

export class VehicleService {
  constructor(private readonly vehicles: VehicleRepository) {}

  async listMine(user: User): Promise<Vehicle[]> {
    return this.vehicles.findByOwner(user.id);
  }

  async add(user: User, data: InsertVehicle): Promise<Vehicle> {
    if (!isDriver(user)) throw AppError.forbidden("Seul un chauffeur peut enregistrer un véhicule");
    if (new Date(data.firstRegistrationDate) > new Date()) {
      throw AppError.badRequest("La date de première immatriculation ne peut pas être dans le futur");
    }
    if (await this.vehicles.findByPlate(data.plate)) {
      throw AppError.conflict("Cette plaque d'immatriculation est déjà enregistrée");
    }
    return this.vehicles.create(user.id, data);
  }

  async remove(user: User, vehicleId: number): Promise<void> {
    const vehicle = await this.vehicles.findById(vehicleId);
    // Même message si le véhicule n'existe pas ou appartient à quelqu'un d'autre :
    // on ne révèle pas l'existence des véhicules des autres utilisateurs.
    if (!vehicle || vehicle.ownerId !== user.id) throw AppError.notFound("Véhicule introuvable");
    if (await this.vehicles.countAllTrips(vehicleId) > 0) {
      throw AppError.conflict("Ce véhicule est lié à des trajets et ne peut pas être supprimé");
    }
    await this.vehicles.delete(vehicleId);
  }
}
