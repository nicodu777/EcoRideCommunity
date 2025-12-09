/**
 * UserRepository - Couche d'accès aux données pour les utilisateurs
 * 
 * Cette classe est responsable de toutes les opérations de lecture/écriture
 * concernant les utilisateurs dans la base de données.
 * 
 * Principe POO : Séparation des responsabilités - seul ce fichier communique avec la BDD pour les users
 */

import { users, type User, type InsertUser } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export class UserRepository {
  
  /**
   * Récupère un utilisateur par son identifiant
   * @param id - Identifiant unique de l'utilisateur
   * @returns L'utilisateur trouvé ou undefined
   */
  async findById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  /**
   * Récupère un utilisateur par son UID Firebase
   * @param firebaseUid - Identifiant Firebase de l'utilisateur
   * @returns L'utilisateur trouvé ou undefined
   */
  async findByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user || undefined;
  }

  /**
   * Récupère un utilisateur par son email
   * @param email - Adresse email de l'utilisateur
   * @returns L'utilisateur trouvé ou undefined
   */
  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  /**
   * Récupère tous les utilisateurs de la plateforme
   * @returns Liste de tous les utilisateurs
   */
  async findAll(): Promise<User[]> {
    return await db.select().from(users);
  }

  /**
   * Crée un nouvel utilisateur dans la base de données
   * @param userData - Données de l'utilisateur à créer
   * @returns L'utilisateur créé avec son ID généré
   */
  async create(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  /**
   * Met à jour les informations d'un utilisateur
   * @param id - Identifiant de l'utilisateur à mettre à jour
   * @param updates - Champs à modifier
   * @returns L'utilisateur mis à jour ou undefined si non trouvé
   */
  async update(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  /**
   * Suspend un utilisateur (modération)
   * @param id - Identifiant de l'utilisateur à suspendre
   * @returns true si la suspension a réussi, false sinon
   */
  async suspend(id: number): Promise<boolean> {
    const [user] = await db
      .update(users)
      .set({ isSuspended: true })
      .where(eq(users.id, id))
      .returning();
    return !!user;
  }
}

// Export d'une instance singleton pour utilisation dans les services
export const userRepository = new UserRepository();
