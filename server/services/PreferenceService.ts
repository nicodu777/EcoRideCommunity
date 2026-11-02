/**
 * PreferenceService - Préférences du chauffeur (US8), stockées dans MongoDB.
 */
import type { User, DriverPreferences } from "@shared/schema";
import type { PreferenceRepository } from "../repositories/PreferenceRepository";
import { isDriver } from "./VehicleService";
import { AppError } from "../errors/AppError";

const DEFAULT_PREFERENCES: DriverPreferences = { smoker: false, animals: false, custom: [] };

export class PreferenceService {
  constructor(private readonly preferences: PreferenceRepository) {}

  async getMine(user: User): Promise<DriverPreferences> {
    return (await this.preferences.findByUser(user.id)) ?? DEFAULT_PREFERENCES;
  }

  async save(user: User, data: DriverPreferences): Promise<DriverPreferences> {
    if (!isDriver(user)) throw AppError.forbidden("Seul un chauffeur peut définir ses préférences");
    // Suppression des doublons dans les préférences personnalisées
    const custom = [...new Set(data.custom.map((p) => p.trim()))];
    return this.preferences.save(user.id, { ...data, custom });
  }
}
