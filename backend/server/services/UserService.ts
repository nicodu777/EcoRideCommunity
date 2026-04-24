/**
 * ====================================================================
 * UserService - Couche de logique métier pour les utilisateurs
 * ====================================================================
 * 
 * @file server/services/UserService.ts
 * @author Refactorisation ECF Studi - Architecture POO
 * @version 2.0.0
 * @date Décembre 2024
 * 
 * RÔLE DE CETTE CLASSE :
 * Ce service contient TOUTE la logique métier liée aux utilisateurs.
 * C'est ici qu'on applique les règles de gestion de l'application.
 * 
 * ARCHITECTURE EN COUCHES (Pattern MVC adapté) :
 * ┌─────────────────┐
 * │   userRoutes    │  ← Couche Présentation (HTTP)
 * └────────┬────────┘
 *          │ appelle
 *          ▼
 * ┌─────────────────┐
 * │   UserService   │  ← Couche Métier (CE FICHIER)
 * └────────┬────────┘
 *          │ appelle
 *          ▼
 * ┌─────────────────┐
 * │  UserRepository │  ← Couche Données (Accès BDD)
 * └─────────────────┘
 * 
 * PRINCIPE POO - ENCAPSULATION :
 * - Les routes appellent UNIQUEMENT les méthodes de ce service
 * - Le service orchestre les opérations et applique les règles métier
 * - Le service délègue l'accès aux données au Repository
 * 
 * PRINCIPE POO - INJECTION DE DÉPENDANCES :
 * - Le repository est injecté via le constructeur
 * - Permet de tester facilement avec un mock
 * - Facilite le changement d'implémentation
 * 
 * RÈGLES MÉTIER IMPLÉMENTÉES :
 * 1. Attribution automatique du rôle admin pour admin@ecoride.com
 * 2. Validation des rôles autorisés (passenger, driver, admin)
 * 3. Unicité des comptes Firebase (vérification avant création)
 * 4. Attribution de 20 crédits à l'inscription (via storage)
 * 
 * AVANTAGES DE CETTE ARCHITECTURE :
 * 1. Séparation des responsabilités (Single Responsibility Principle)
 * 2. Code testable unitairement grâce à l'injection de dépendances
 * 3. Logique métier centralisée et réutilisable
 * 4. Routes "fines" sans logique complexe
 * ====================================================================
 */

import { type User, type InsertUser } from "../../shared/schema";
import { userRepository, UserRepository } from "../repositories/UserRepository";

/**
 * CONSTANTES MÉTIER
 * 
 * Ces valeurs sont utilisées pour la logique de gestion du compte admin.
 * En les déclarant comme constantes, on évite les erreurs de frappe
 * et on centralise leur définition.
 */

// Email du compte administrateur principal de la plateforme
const ADMIN_EMAIL = "admin@ecoride.com";

// UID Firebase du compte admin (utilisé pour correction automatique)
const ADMIN_FIREBASE_UID = "0Kn4RzhaOmgo1jFG5t97cils05o1";

// Liste des rôles valides dans l'application
// "as const" rend ce tableau immuable et permet le typage strict
const ROLES_VALIDES = ["passenger", "driver", "admin"] as const;

/**
 * Classe UserService
 * 
 * Gère toute la logique métier des utilisateurs.
 * Utilise le pattern d'injection de dépendances pour la testabilité.
 */
export class UserService {
  
  /**
   * Référence vers le repository d'accès aux données
   * Déclaré en privé pour respecter l'encapsulation POO
   */
  private repository: UserRepository;

  /**
   * Constructeur avec injection de dépendances
   * 
   * L'injection de dépendances permet de :
   * - Tester facilement en passant un mock repository
   * - Changer d'implémentation sans modifier ce code
   * 
   * @param repository - Le repository à utiliser (par défaut: userRepository)
   */
  constructor(repository: UserRepository = userRepository) {
    this.repository = repository;
  }

  /**
   * Récupère un utilisateur par son ID
   * 
   * Méthode simple sans logique métier particulière.
   * 
   * @param id - L'identifiant de l'utilisateur
   * @returns L'utilisateur ou undefined si non trouvé
   */
  async getUserById(id: number): Promise<User | undefined> {
    return this.repository.findById(id);
  }

  /**
   * Récupère (ou relie) un utilisateur par UID Firebase + email optionnel
   *
   * LOGIQUE MÉTIER :
   * 1. Recherche d'abord par UID Firebase (cas normal)
   * 2. Si non trouvé ET email fourni → cherche par email et met à jour l'UID
   *    (cas où l'utilisateur a recréé son compte Firebase)
   * 3. Garantit que admin@ecoride.com a toujours le rôle admin
   *
   * @param firebaseUid - Le nouvel UID Firebase
   * @param email - L'email Firebase (optionnel, pour re-liaison)
   */
  async getUserByFirebaseUid(firebaseUid: string, email?: string): Promise<User | undefined> {
    // Tentative 1 : recherche par UID Firebase
    let user = await this.repository.findByFirebaseUid(firebaseUid);

    // Tentative 2 : si UID non trouvé mais email connu, recherche par email
    // Cela gère le cas d'un compte Firebase recréé (nouvel UID, même email)
    if (!user && email) {
      const userByEmail = await this.repository.findByEmail(email);
      if (userByEmail) {
        // Re-liaison : on met à jour l'UID Firebase avec le nouveau
        user = await this.repository.update(userByEmail.id, { firebaseUid }) ?? userByEmail;
      }
    }

    // RÈGLE MÉTIER SPÉCIALE : Auto-création du compte administrateur
    // Si l'email admin est fourni mais qu'il n'y a toujours pas de profil en base,
    // on crée automatiquement le compte admin (première connexion ou BDD réinitialisée)
    if (!user && email === ADMIN_EMAIL) {
      user = await this.repository.create({
        firebaseUid,
        email: ADMIN_EMAIL,
        firstName: "Admin",
        lastName: "EcoRide",
        phone: "",
        role: "admin",
      });
    }

    // RÈGLE MÉTIER : Garantie du rôle admin pour l'email admin
    if (user && user.email === ADMIN_EMAIL && user.role !== "admin") {
      user = await this.repository.update(user.id, { role: "admin" });
    }

    return user;
  }

  /**
   * Récupère un utilisateur par son email
   * 
   * @param email - L'email de l'utilisateur
   * @returns L'utilisateur ou undefined
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.repository.findByEmail(email);
  }

  /**
   * Récupère tous les utilisateurs (pour l'administration)
   * 
   * Utilisé dans le tableau de bord admin pour lister tous les membres.
   * 
   * @returns La liste de tous les utilisateurs de la plateforme
   */
  async getAllUsers(): Promise<User[]> {
    return this.repository.findAll();
  }

  /**
   * Crée un nouvel utilisateur avec application des règles métier
   * 
   * LOGIQUE MÉTIER :
   * 1. Vérifie que l'utilisateur n'existe pas déjà (unicité)
   * 2. Attribue automatiquement le rôle admin si email = admin@ecoride.com
   * 
   * @param userData - Les données du nouvel utilisateur
   * @returns L'utilisateur créé
   * @throws Error("USER_ALREADY_EXISTS") si l'utilisateur existe déjà
   */
  async createUser(userData: InsertUser): Promise<User> {
    // RÈGLE MÉTIER : Unicité des comptes Firebase
    // On vérifie qu'aucun utilisateur n'existe avec ce UID Firebase
    const existingUser = await this.repository.findByFirebaseUid(userData.firebaseUid);
    if (existingUser) {
      throw new Error("USER_ALREADY_EXISTS");
    }

    // RÈGLE MÉTIER : Attribution automatique du rôle admin
    // Si l'email est celui de l'admin, on force le rôle "admin"
    if (userData.email === ADMIN_EMAIL) {
      userData.role = "admin";
    }

    // Délégation de la création au repository
    return this.repository.create(userData);
  }

  /**
   * Crée un utilisateur avec des valeurs par défaut
   * 
   * Appelé quand un utilisateur Firebase n'a pas encore de profil dans notre BDD.
   * On crée un profil minimal pour permettre l'utilisation de l'application.
   * 
   * @param firebaseUid - L'UID Firebase du nouveau compte
   * @returns L'utilisateur créé avec les valeurs par défaut
   */
  async createDefaultUser(firebaseUid: string): Promise<User> {
    // Données par défaut pour un nouvel utilisateur
    const defaultUserData: InsertUser = {
      firebaseUid,
      email: `user-${firebaseUid}@ecoride.com`, // Email temporaire
      firstName: "Utilisateur",
      lastName: "EcoRide",
      phone: "",
      role: "passenger" // Rôle par défaut : passager
    };

    return this.repository.create(defaultUserData);
  }

  /**
   * Met à jour les informations d'un utilisateur
   * 
   * @param id - L'ID de l'utilisateur à modifier
   * @param updates - Les champs à mettre à jour
   * @returns L'utilisateur mis à jour ou undefined
   */
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    return this.repository.update(id, updates);
  }

  /**
   * Change le rôle d'un utilisateur
   * 
   * LOGIQUE MÉTIER : Validation du rôle
   * Seuls les rôles définis dans ROLES_VALIDES sont autorisés.
   * 
   * @param userId - L'ID de l'utilisateur
   * @param newRole - Le nouveau rôle à attribuer
   * @returns L'utilisateur mis à jour
   * @throws Error("INVALID_ROLE") si le rôle n'est pas valide
   */
  async changeUserRole(userId: number, newRole: string): Promise<User | undefined> {
    // RÈGLE MÉTIER : Validation du rôle
    // On vérifie que le nouveau rôle fait partie des rôles autorisés
    if (!ROLES_VALIDES.includes(newRole as any)) {
      throw new Error("INVALID_ROLE");
    }

    return this.repository.update(userId, { role: newRole });
  }

  /**
   * Suspend un utilisateur (action de modération)
   * 
   * Appelé par les employés ou admins pour bloquer un compte problématique.
   * 
   * @param userId - L'ID de l'utilisateur à suspendre
   * @returns true si la suspension a réussi
   */
  async suspendUser(userId: number): Promise<boolean> {
    return this.repository.suspend(userId);
  }

  /**
   * Méthode privée : Promeut un utilisateur au rôle admin
   * 
   * Méthode interne utilisée pour corriger le profil du compte admin.
   * Déclarée privée car elle ne doit pas être appelée de l'extérieur.
   * 
   * @param user - L'utilisateur à promouvoir
   * @returns L'utilisateur avec le rôle admin
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

/**
 * Instance singleton du service
 * 
 * On exporte une seule instance qui sera utilisée dans les routes.
 * Pattern Singleton : Une seule instance partagée dans toute l'application.
 */
export const userService = new UserService();
