/**
 * Mini émulateur Firebase Authentication (mode démo local uniquement).
 *
 * Il répond aux appels du SDK Firebase (connexion par mot de passe,
 * lecture du compte, rafraîchissement du token) pour les comptes de
 * démonstration de sql/seed.sql. Les tokens ne sont pas signés : seul
 * firebase-admin en mode émulateur (FIREBASE_AUTH_EMULATOR_HOST) les accepte.
 * Ce serveur n'écoute que sur 127.0.0.1 : il n'est pas joignable du réseau.
 */
import http from "node:http";

export const DEMO_PASSWORD = "Demo2026!";
export const DEMO_ACCOUNTS = [
  { localId: "0Kn4RzhaOmgo1jFG5t97cils05o1", email: "admin@ecoride.com" },
  { localId: "demo-uid-marie", email: "marie.dupont@email.com" },
  { localId: "demo-uid-pierre", email: "pierre.martin@email.com" },
  { localId: "demo-uid-sophie", email: "sophie.bernard@email.com" },
  { localId: "demo-uid-lucas", email: "lucas.petit@email.com" },
];

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");

function idToken(projectId, account) {
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: "none", typ: "JWT" })}.${b64({
    iss: `https://securetoken.google.com/${projectId}`, aud: projectId, auth_time: now,
    user_id: account.localId, sub: account.localId, iat: now, exp: now + 3600,
    email: account.email, email_verified: true,
    firebase: { identities: { email: [account.email] }, sign_in_provider: "password" },
  })}.`;
}

function userInfo(account) {
  return {
    localId: account.localId, email: account.email, emailVerified: true, passwordHash: "demo",
    providerUserInfo: [{ providerId: "password", email: account.email, federatedId: account.email, rawId: account.email }],
    createdAt: "1700000000000", lastLoginAt: String(Date.now()),
  };
}

function send(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "*",
  });
  res.end(JSON.stringify(body));
}

export function startAuthEmulator({ port, projectId }) {
  const server = http.createServer((req, res) => {
    if (req.method === "OPTIONS") return send(res, 204, {});
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      let body = {};
      try {
        body = raw.startsWith("{") ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
      } catch { /* corps vide ou invalide */ }
      const url = req.url.split("?")[0];

      if (url.endsWith("accounts:signInWithPassword")) {
        const account = DEMO_ACCOUNTS.find((a) => a.email === body.email);
        if (!account || body.password !== DEMO_PASSWORD) {
          return send(res, 400, { error: { code: 400, message: "INVALID_LOGIN_CREDENTIALS" } });
        }
        return send(res, 200, {
          kind: "identitytoolkit#VerifyPasswordResponse", localId: account.localId, email: account.email,
          idToken: idToken(projectId, account), refreshToken: `rt-${account.localId}`, expiresIn: "3600", registered: true,
        });
      }
      if (url.endsWith("accounts:lookup")) {
        let account;
        if (body.idToken) {
          const payload = JSON.parse(Buffer.from(body.idToken.split(".")[1], "base64url"));
          account = DEMO_ACCOUNTS.find((a) => a.localId === payload.sub);
        } else if (body.localId) {
          account = DEMO_ACCOUNTS.find((a) => body.localId.includes(a.localId));
        } else if (body.email) {
          account = DEMO_ACCOUNTS.find((a) => body.email.includes(a.email));
        }
        return send(res, 200, account ? { users: [userInfo(account)] } : {});
      }
      if (url.includes("securetoken.googleapis.com")) {
        const account = DEMO_ACCOUNTS.find((a) => `rt-${a.localId}` === body.refresh_token);
        if (!account) return send(res, 400, { error: { message: "INVALID_REFRESH_TOKEN" } });
        const token = idToken(projectId, account);
        return send(res, 200, {
          id_token: token, access_token: token, refresh_token: body.refresh_token,
          expires_in: "3600", token_type: "Bearer", user_id: account.localId, project_id: projectId,
        });
      }
      // L'inscription n'est pas gérée en mode démo : on utilise les comptes existants
      send(res, 400, { error: { code: 400, message: "OPERATION_NOT_ALLOWED" } });
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
