/**
 * Vérification des tokens d'identité des utilisateurs.
 *
 * L'interface `TokenVerifier` permet d'injecter une autre implémentation
 * (un faux vérificateur dans les tests automatisés, par exemple) sans
 * modifier le middleware d'authentification : c'est l'injection de dépendances.
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export interface VerifiedIdentity {
  uid: string;
  email: string;
}

export interface TokenVerifier {
  verify(token: string): Promise<VerifiedIdentity>;
}

/**
 * Implémentation réelle : vérifie un ID token Firebase (JWT signé par Google).
 *
 * `verifyIdToken` contrôle la signature RSA avec les clés publiques de Google,
 * la date d'expiration, l'émetteur et l'audience (notre projet Firebase).
 * Un token falsifié ou expiré est donc rejeté.
 *
 * Le refus des tokens révoqués (compte désactivé, déconnexion forcée)
 * interroge l'API d'administration Firebase : il n'est activé que si un
 * compte de service est configuré (GOOGLE_APPLICATION_CREDENTIALS) ou en
 * mode émulateur. Sans lui, un token reste valable jusqu'à son expiration
 * (1 heure) ; la suspension d'un compte est de toute façon vérifiée en base
 * à chaque requête (middleware requireAuth).
 */
export class FirebaseTokenVerifier implements TokenVerifier {
  private readonly checkRevoked: boolean;

  constructor(projectId: string) {
    if (getApps().length === 0) {
      initializeApp({ projectId });
    }
    this.checkRevoked = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_AUTH_EMULATOR_HOST);
  }

  async verify(token: string): Promise<VerifiedIdentity> {
    const decoded = await getAuth().verifyIdToken(token, this.checkRevoked);
    if (!decoded.email) throw new Error("Token sans adresse email");
    return { uid: decoded.uid, email: decoded.email };
  }
}
