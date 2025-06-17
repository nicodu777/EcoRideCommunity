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
        try {
          // Get user profile from our backend
          const response = await fetch(`/api/users/firebase/${firebaseUser.uid}`);
          const profile = response.ok ? await response.json() : null;
          
          this.currentUser = {
            ...firebaseUser,
            profile,
          };
        } catch (error) {
          console.error("Error fetching user profile:", error);
          this.currentUser = firebaseUser as AuthUser;
        }
      } else {
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
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
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
