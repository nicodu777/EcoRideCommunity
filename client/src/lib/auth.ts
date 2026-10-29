/**
 * Service d'authentification côté client (pattern Singleton).
 *
 * 1. Firebase Authentication gère l'email et le mot de passe (hachage,
 *    réinitialisation, protection contre la force brute) ;
 * 2. notre API stocke le profil EcoRide (rôle, crédits...) dans PostgreSQL.
 * Le lien entre les deux est l'ID token Firebase envoyé à chaque requête.
 */
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { apiJson, ApiError } from "./queryClient";
import type { User } from "@shared/schema";

/** Profil renvoyé par l'API (sans l'UID Firebase). */
export type Profile = Omit<User, "firebaseUid">;

export interface AuthUser extends FirebaseUser {
  profile?: Profile;
}

export class AuthService {
  private static instance: AuthService;
  private currentUser: AuthUser | null = null;
  private listeners: ((user: AuthUser | null) => void)[] = [];
  private registering = false;

  static getInstance() {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  constructor() {
    onAuthStateChanged(auth, async (firebaseUser) => {
      // Pendant l'inscription, c'est register() qui crée puis charge le profil
      if (this.registering) return;
      this.currentUser = firebaseUser ? await this.loadProfile(firebaseUser) : null;
      this.notifyListeners();
    });
  }

  /** Charge le profil EcoRide de l'utilisateur Firebase connecté. */
  private async loadProfile(firebaseUser: FirebaseUser): Promise<AuthUser> {
    try {
      const profile = await apiJson<Profile>("GET", "/api/users/me");
      return Object.assign(firebaseUser, { profile });
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        // Compte suspendu par l'administrateur : on déconnecte
        await signOut(auth);
      }
      return firebaseUser as AuthUser;
    }
  }

  /** À appeler après une action qui modifie le profil (crédits, rôle...). */
  async refreshProfile() {
    if (auth.currentUser) {
      this.currentUser = await this.loadProfile(auth.currentUser);
      this.notifyListeners();
    }
  }

  async register(email: string, password: string, firstName: string, lastName: string, role: string) {
    this.registering = true;
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      // L'email et l'UID ne sont PAS envoyés : le serveur les lit dans le token vérifié
      const profile = await apiJson<Profile>("POST", "/api/users", { firstName, lastName, role });
      this.currentUser = Object.assign(firebaseUser, { profile });
      this.notifyListeners();
      return this.currentUser;
    } catch (error: any) {
      console.error("Erreur d'inscription :", error);
      if (error.code === "auth/email-already-in-use") {
        throw new Error("Cette adresse email est déjà utilisée.");
      } else if (error.code === "auth/weak-password") {
        throw new Error("Le mot de passe est trop faible.");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Adresse email invalide.");
      }
      throw new Error(error.message || "Une erreur inattendue s'est produite");
    } finally {
      this.registering = false;
    }
  }

  async login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  }

  async logout() {
    await signOut(auth);
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.currentUser));
  }
}

export const authService = AuthService.getInstance();
