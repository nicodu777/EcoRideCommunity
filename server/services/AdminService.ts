/**
 * AdminService - Espace administrateur (US13).
 *
 * Statistiques (covoiturages par jour, crédits gagnés par jour et au total),
 * suspension de comptes, et journal des actions (stocké dans MongoDB).
 */
import type { User } from "@shared/schema";
import type { UserRepository } from "../repositories/UserRepository";
import type { TripRepository } from "../repositories/TripRepository";
import type { EarningsRepository } from "../repositories/EarningsRepository";
import type { AdminLogRepository, AdminLogEntry } from "../repositories/PreferenceRepository";
import { AppError } from "../errors/AppError";

/** Vue d'un compte pour l'administrateur : pas d'identifiant Firebase. */
export type AdminUserView = Omit<User, "firebaseUid">;

export class AdminService {
  constructor(
    private readonly users: UserRepository,
    private readonly trips: TripRepository,
    private readonly earnings: EarningsRepository,
    private readonly logs: AdminLogRepository,
  ) {}

  async listUsers(): Promise<AdminUserView[]> {
    return (await this.users.findAll()).map(({ firebaseUid: _uid, ...user }) => user);
  }

  async setSuspended(admin: User, userId: number, suspended: boolean): Promise<AdminUserView> {
    if (userId === admin.id) throw AppError.badRequest("Vous ne pouvez pas suspendre votre propre compte");
    const target = await this.users.findById(userId);
    if (!target) throw AppError.notFound("Utilisateur introuvable");
    if (target.role === "admin") throw AppError.forbidden("Un administrateur ne peut pas être suspendu");

    const updated = await this.users.setSuspended(userId, suspended);
    await this.log(admin.id, suspended ? "suspend_user" : "reactivate_user", userId, { email: target.email });
    const { firebaseUid: _uid, ...view } = updated!;
    return view;
  }

  dailyTrips() { return this.trips.countByDay(); }
  dailyEarnings() { return this.earnings.dailyTotals(); }
  async totalEarnings() { return { total: await this.earnings.total() }; }

  /** Journalise une action ; un échec du journal ne bloque pas l'action elle-même. */
  async log(adminId: number, action: string, targetId: number, details?: Record<string, unknown>): Promise<void> {
    await this.logs.add({ adminId, action, targetId, details }).catch((err) => {
      console.warn("[admin-log] journalisation impossible :", err.message);
    });
  }

  async latestActions(): Promise<AdminLogEntry[]> {
    return this.logs.latest();
  }
}
