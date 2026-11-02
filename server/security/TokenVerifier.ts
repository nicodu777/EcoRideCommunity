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
 */
export class FirebaseTokenVerifier implements TokenVerifier {
  constructor(projectId: string) {
    if (getApps().length === 0) {
      initializeApp({ projectId });
    }
  }

  async verify(token: string): Promise<VerifiedIdentity> {
    const decoded = await getAuth().verifyIdToken(token, true); // true = refuse aussi les tokens révoqués
    if (!decoded.email) throw new Error("Token sans adresse email");
    return { uid: decoded.uid, email: decoded.email };
  }
}
