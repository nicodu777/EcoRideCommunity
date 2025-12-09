/**
 * ====================================================================
 * UserRepository - Couche d'accès aux données pour les utilisateurs
 * ====================================================================
 * 
 * RÔLE DE CETTE CLASSE :
 * Ce repository est responsable de TOUTES les opérations de lecture/écriture
 * concernant les utilisateurs. C'est la seule classe qui "parle" au stockage.
 * 
 * PRINCIPE POO - SÉPARATION DES RESPONSABILITÉS :
 * - Les routes ne doivent JAMAIS accéder directement aux données
 * - Les services appellent le repository
 * - Le repository communique avec le stockage (mémoire ou base de données)
 * 
 * AVANTAGES DE CETTE ARCHITECTURE :
 * 1. Testabilité : On peut facilement remplacer le stockage par un mock
 * 2. Maintenabilité : Si on change de base de données, seul ce fichier change
 * 3. Lisibilité : Chaque fichier a une responsabilité claire
 * 
 * UTILISATION :
 * - Importer l'instance singleton : import { userRepository } from "./UserRepository"
 * - Appeler les méthodes : const user = await userRepository.findById(1)
 * ====================================================================
 */

import { type User, type InsertUser } from "@shared/schema";
import { storage } from "../storage";

/**
 * Classe UserRepository
 * Encapsule toutes les opérations d'accès aux données utilisateurs
 */
export class UserRepository {
  
  /**
   * Récupère un utilisateur par son identifiant unique (ID interne)
   * 
   * @param id - L'identifiant numérique unique de l'utilisateur
   * @returns L'utilisateur trouvé ou undefined si non existant
   * 
   * Exemple d'utilisation :
   * const user = await userRepository.findById(1);
   * if (user) { console.log(user.firstName); }
   */
  async findById(id: number): Promise<User | undefined> {
    return storage.getUser(id);
  }

  /**
   * Récupère un utilisateur par son UID Firebase
   * 
   * Firebase génère un identifiant unique pour chaque compte authentifié.
   * Cette méthode permet de faire le lien entre Firebase Auth et notre BDD.
   * 
   * @param firebaseUid - L'identifiant Firebase (ex: "0Kn4RzhaOmgo1jFG5t97cils05o1")
   * @returns L'utilisateur trouvé ou undefined
   * 
   * Exemple d'utilisation :
   * const user = await userRepository.findByFirebaseUid(req.params.uid);
   */
  async findByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return storage.getUserByFirebaseUid(firebaseUid);
  }

  /**
   * Récupère un utilisateur par son adresse email
   * 
   * Utile pour vérifier si un email est déjà utilisé
   * ou pour la logique de rôle admin.
   * 
   * @param email - L'adresse email de l'utilisateur
   * @returns L'utilisateur trouvé ou undefined
   */
  async findByEmail(email: string): Promise<User | undefined> {
    return storage.getUserByEmail(email);
  }

  /**
   * Récupère la liste de tous les utilisateurs
   * 
   * Utilisé principalement par l'interface d'administration
   * pour afficher la liste des membres de la plateforme.
   * 
   * @returns Un tableau contenant tous les utilisateurs
   */
  async findAll(): Promise<User[]> {
    return storage.getAllUsers();
  }

  /**
   * Crée un nouvel utilisateur dans le stockage
   * 
   * Cette méthode est appelée lors de l'inscription d'un nouveau membre.
   * Le système attribue automatiquement 20 crédits au nouvel utilisateur.
   * 
   * @param userData - Les données du nouvel utilisateur (sans l'ID)
   * @returns L'utilisateur créé avec son ID généré automatiquement
   * 
   * Exemple d'utilisation :
   * const newUser = await userRepository.create({
   *   firebaseUid: "abc123",
   *   email: "user@example.com",
   *   firstName: "Jean",
   *   lastName: "Dupont",
   *   phone: "0612345678",
   *   role: "passenger"
   * });
   */
  async create(userData: InsertUser): Promise<User> {
    return storage.createUser(userData);
  }

  /**
   * Met à jour les informations d'un utilisateur existant
   * 
   * Permet de modifier partiellement les données d'un utilisateur.
   * Seuls les champs passés dans 'updates' seront modifiés.
   * 
   * @param id - L'ID de l'utilisateur à modifier
   * @param updates - Un objet contenant les champs à mettre à jour
   * @returns L'utilisateur mis à jour, ou undefined si non trouvé
   * 
   * Exemple d'utilisation :
   * await userRepository.update(1, { role: "driver", phone: "0698765432" });
   */
  async update(id: number, updates: Partial<User>): Promise<User | undefined> {
    return storage.updateUser(id, updates);
  }

  /**
   * Suspend un compte utilisateur (action de modération)
   * 
   * Utilisé par les employés ou administrateurs pour bloquer
   * un utilisateur en cas de comportement inapproprié.
   * 
   * @param id - L'ID de l'utilisateur à suspendre
   * @returns true si la suspension a réussi, false sinon
   */
  async suspend(id: number): Promise<boolean> {
    return storage.suspendUser(id);
  }
}

/**
 * Instance singleton du repository
 * 
 * On exporte une seule instance qui sera utilisée partout dans l'application.
 * Cela évite de créer plusieurs connexions au stockage.
 * 
 * Pattern Singleton : Une seule instance partagée
 */
export const userRepository = new UserRepository();
