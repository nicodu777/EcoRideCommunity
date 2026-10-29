/**
 * UserRepository - Accès aux données de la table `users`.
 *
 * Couche « accès aux données » : c'est la SEULE classe qui exécute des
 * requêtes SQL sur les utilisateurs. Les services l'utilisent ; les routes
 * ne la connaissent pas. Toutes les requêtes passent par Drizzle, qui les
 * envoie à PostgreSQL sous forme de requêtes préparées.
 */
import { eq, sql, desc } from "drizzle-orm";
import { users, type User } from "@shared/schema";
import type { Database, Executor } from "../db/postgres";
import { INITIAL_CREDITS } from "../config/rules";

/** Champs qu'un service peut modifier sur un profil (jamais les crédits par ce biais). */
export type UserProfileUpdate = Partial<Pick<User, "firstName" | "lastName" | "phone" | "role">>;

export class UserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: number, tx: Executor = this.db): Promise<User | undefined> {
    const [user] = await tx.select().from(users).where(eq(users.id, id));
    return user;
  }

  /**
   * Lecture avec verrou de ligne (SELECT ... FOR UPDATE) : pendant la
   * transaction, aucune autre requête ne peut modifier ce solde de crédits.
   */
  async findByIdForUpdate(id: number, tx: Executor): Promise<User | undefined> {
    const [user] = await tx.select().from(users).where(eq(users.id, id)).for("update");
    return user;
  }

  async findByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.db.select().from(users).orderBy(desc(users.createdAt));
  }

  async create(data: Pick<User, "email" | "firebaseUid" | "firstName" | "lastName" | "role"> & { phone?: string | null }): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values({ ...data, credits: INITIAL_CREDITS.toFixed(2) })
      .returning();
    return user;
  }

  async updateProfile(id: number, updates: UserProfileUpdate): Promise<User | undefined> {
    const [user] = await this.db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  /**
   * Ajoute (ou retire si négatif) des crédits de façon atomique :
   * le calcul « credits + montant » est fait par PostgreSQL lui-même.
   * La contrainte CHECK (credits >= 0) empêche tout solde négatif.
   */
  async addCredits(id: number, amount: number, tx: Executor = this.db): Promise<void> {
    await tx
      .update(users)
      .set({ credits: sql`${users.credits} + ${amount.toFixed(2)}::numeric` })
      .where(eq(users.id, id));
  }

  async setSuspended(id: number, isSuspended: boolean): Promise<User | undefined> {
    const [user] = await this.db.update(users).set({ isSuspended }).where(eq(users.id, id)).returning();
    return user;
  }

  async updateRatingStats(id: number, average: number, count: number): Promise<void> {
    await this.db
      .update(users)
      .set({ averageRating: average.toFixed(2), totalRatings: count })
      .where(eq(users.id, id));
  }
}
