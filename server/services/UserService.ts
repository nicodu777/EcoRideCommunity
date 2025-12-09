/**
 * UserService - Couche de logique métier pour les utilisateurs
 * 
 * Cette classe contient toute la logique métier liée aux utilisateurs :
 * - Validation des règles métier
 * - Orchestration des opérations
 * - Gestion des cas particuliers (ex: attribution du rôle admin)
 * 
 * Principe POO : Encapsulation de la logique métier dans une classe dédiée
 * Les routes appellent cette classe, jamais directement le repository
 */

import { type User, type InsertUser } from "@shared/schema";
import { userRepository, UserRepository } from "../repositories/UserRepository";

// Constantes métier
const ADMIN_EMAIL = "admin@ecoride.com";
const ADMIN_FIREBASE_UID = "0Kn4RzhaOmgo1jFG5t97cils05o1";
const ROLES_VALIDES = ["passenger", "driver", "admin"] as const;

export class UserService {
  private repository: UserRepository;

  constructor(repository: UserRepository = userRepository) {
    this.repository = repository;
  }

  /**
   * Récupère un utilisateur par son ID
   * @param id - Identifiant de l'utilisateur
   * @returns L'utilisateur ou undefined
   */
  async getUserById(id: number): Promise<User | undefined> {
    return this.repository.findById(id);
  }

  /**
   * Récupère un utilisateur par son UID Firebase
   * Applique la logique métier pour le compte admin
   * @param firebaseUid - UID Firebase de l'utilisateur
   * @returns L'utilisateur (créé automatiquement si nécessaire)
   */
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    let user = await this.repository.findByFirebaseUid(firebaseUid);
    
    // Règle métier : Si c'est le compte admin, corriger automatiquement le profil
    if (firebaseUid === ADMIN_FIREBASE_UID && user) {
      user = await this.promoteToAdmin(user);
    }
    
    // Règle métier : Si l'email est admin@ecoride.com, attribuer le rôle admin
    if (user && user.email === ADMIN_EMAIL && user.role !== "admin") {
      user = await this.repository.update(user.id, { role: "admin" });
    }
    
    return user;
  }

  /**
   * Récupère un utilisateur par son email
   * @param email - Email de l'utilisateur
   * @returns L'utilisateur ou undefined
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.repository.findByEmail(email);
  }

  /**
   * Récupère tous les utilisateurs (pour l'administration)
   * @returns Liste de tous les utilisateurs
   */
  async getAllUsers(): Promise<User[]> {
    return this.repository.findAll();
  }

  /**
   * Crée un nouvel utilisateur avec les règles métier
   * @param userData - Données de l'utilisateur
   * @returns L'utilisateur créé
   * @throws Error si l'utilisateur existe déjà
   */
  async createUser(userData: InsertUser): Promise<User> {
    // Vérification : l'utilisateur existe-t-il déjà ?
    const existingUser = await this.repository.findByFirebaseUid(userData.firebaseUid);
    if (existingUser) {
      throw new Error("USER_ALREADY_EXISTS");
    }

    // Règle métier : Attribution automatique du rôle admin si email admin
    if (userData.email === ADMIN_EMAIL) {
      userData.role = "admin";
    }

    return this.repository.create(userData);
  }

  /**
   * Crée un utilisateur par défaut pour un nouveau compte Firebase
   * @param firebaseUid - UID Firebase du compte
   * @returns L'utilisateur créé avec les valeurs par défaut
   */
  async createDefaultUser(firebaseUid: string): Promise<User> {
    const defaultUserData: InsertUser = {
      firebaseUid,
      email: `user-${firebaseUid}@ecoride.com`,
      firstName: "Utilisateur",
      lastName: "EcoRide",
      phone: "",
      role: "passenger"
    };

    return this.repository.create(defaultUserData);
  }

  /**
   * Met à jour les informations d'un utilisateur
   * @param id - ID de l'utilisateur
   * @param updates - Champs à mettre à jour
   * @returns L'utilisateur mis à jour ou undefined
   */
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    return this.repository.update(id, updates);
  }

  /**
   * Change le rôle d'un utilisateur
   * @param userId - ID de l'utilisateur
   * @param newRole - Nouveau rôle à attribuer
   * @returns L'utilisateur mis à jour
   * @throws Error si le rôle est invalide
   */
  async changeUserRole(userId: number, newRole: string): Promise<User | undefined> {
    // Validation du rôle
    if (!ROLES_VALIDES.includes(newRole as any)) {
      throw new Error("INVALID_ROLE");
    }

    return this.repository.update(userId, { role: newRole });
  }

  /**
   * Suspend un utilisateur (action de modération)
   * @param userId - ID de l'utilisateur à suspendre
   * @returns true si réussi
   */
  async suspendUser(userId: number): Promise<boolean> {
    return this.repository.suspend(userId);
  }

  /**
   * Promeut un utilisateur au rôle admin (méthode privée)
   * Utilisée pour le compte admin spécifique
   */
  private async promoteToAdmin(user: User): Promise<User | undefined> {
    return this.repository.update(user.id, {
      email: ADMIN_EMAIL,
      firstName: "Admin",
      lastName: "EcoRide",
      role: "admin"
    });
  }
}

// Export d'une instance singleton pour utilisation dans les routes
export const userService = new UserService();
