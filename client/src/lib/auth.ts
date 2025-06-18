import { auth } from "./firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { apiRequest } from "./queryClient";
import { User } from "@shared/schema";

export interface AuthUser extends FirebaseUser {
  profile?: User;
}

export class AuthService {
  private static instance: AuthService;
  private currentUser: AuthUser | null = null;
  private listeners: ((user: AuthUser | null) => void)[] = [];

  static getInstance() {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  constructor() {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log("Firebase user authenticated:", firebaseUser.uid);
        try {
          // Get user profile from our backend
          const response = await fetch(`/api/users/firebase/${firebaseUser.uid}`);
          if (response.ok) {
            const profile = await response.json();
            this.currentUser = {
              ...firebaseUser,
              profile,
            };
            console.log("User profile loaded:", profile);
          } else {
            console.warn("No backend profile found, using Firebase user only");
            this.currentUser = firebaseUser as AuthUser;
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          this.currentUser = firebaseUser as AuthUser;
        }
      } else {
        console.log("User logged out");
        this.currentUser = null;
      }
      
      this.notifyListeners();
    });
  }

  async register(email: string, password: string, firstName: string, lastName: string, role: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Create user profile in our backend
      const profileData = {
        email: firebaseUser.email!,
        firebaseUid: firebaseUser.uid,
        firstName,
        lastName,
        role,
      };

      const response = await apiRequest("POST", "/api/users", profileData);
      const profile = await response.json();

      this.currentUser = {
        ...firebaseUser,
        profile,
      };

      this.notifyListeners();
      return this.currentUser;
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Provide user-friendly error messages
      if (error.code === "auth/configuration-not-found") {
        throw new Error("Le service d'authentification n'est pas correctement configuré. Veuillez contacter l'administrateur.");
      } else if (error.code === "auth/email-already-in-use") {
        throw new Error("Cette adresse email est déjà utilisée.");
      } else if (error.code === "auth/weak-password") {
        throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Adresse email invalide.");
      } else {
        throw new Error(`Erreur d'inscription: ${error.message || "Une erreur inattendue s'est produite"}`);
      }
    }
  }

  async login(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentUser));
  }
}

export const authService = AuthService.getInstance();
