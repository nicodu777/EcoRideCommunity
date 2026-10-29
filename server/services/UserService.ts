/**
 * UserService - Logique métier des comptes utilisateurs.
 *
 * Couche « métier » : elle applique les règles (unicité du compte,
 * rôles autorisés...) et délègue la lecture/écriture au UserRepository,
 * reçu par injection de dépendances dans le constructeur.
 */
import type { User, RegisterUser, UpdateProfile } from "@shared/schema";
import type { UserRepository } from "../repositories/UserRepository";
import type { VerifiedIdentity } from "../security/TokenVerifier";
import { AppError } from "../errors/AppError";

/** Données d'un utilisateur qu'on peut renvoyer à son propriétaire (sans l'UID Firebase). */
export type OwnProfile = Omit<User, "firebaseUid">;

export function toOwnProfile(user: User): OwnProfile {
  const { firebaseUid: _uid, ...profile } = user;
  return profile;
}

export class UserService {
  constructor(private readonly users: UserRepository) {}

  /**
   * Inscription (US7) : l'email et l'UID viennent du token Firebase vérifié,
   * pas du formulaire. Le rôle « admin » est impossible à obtenir ici :
   * le schéma Zod n'accepte que passenger / driver / both.
   */
  async register(identity: VerifiedIdentity, data: RegisterUser): Promise<OwnProfile> {
    const existing = await this.users.findByFirebaseUid(identity.uid);
    if (existing) throw AppError.conflict("Ce compte existe déjà");

    const user = await this.users.create({
      firebaseUid: identity.uid,
      email: identity.email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? null,
      role: data.role,
    });
    return toOwnProfile(user);
  }

  /** Modification du profil (US8 : devenir chauffeur, passager ou les deux). */
  async updateProfile(user: User, data: UpdateProfile): Promise<OwnProfile> {
    // L'administrateur garde son rôle : il ne peut pas se rétrograder par erreur
    const role = user.role === "admin" ? undefined : data.role;
    const updated = await this.users.updateProfile(user.id, { ...data, role });
    if (!updated) throw AppError.notFound("Utilisateur introuvable");
    return toOwnProfile(updated);
  }
}
