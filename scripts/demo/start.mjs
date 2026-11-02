/**
 * ====================================================================
 * EcoRide - lancement du mode démo local (sans Internet, sans compte)
 * ====================================================================
 * 1. crée une base PostgreSQL neuve dans .demo/ (schema + seed + démo) ;
 * 2. démarre l'émulateur d'authentification sur 127.0.0.1:9099 ;
 * 3. démarre l'application sur http://localhost:5000 et ouvre le navigateur.
 * Fermer la fenêtre (ou Ctrl+C) arrête tout.
 *
 * Mode réel (`--reel`) : même base locale, mais connexion avec le vrai
 * Firebase du projet (clés lues dans .env, Internet nécessaire).
 *
 * Prérequis : Node.js 20+ et PostgreSQL installé (C:\Program Files\PostgreSQL).
 * Lancement : DEMARRER-ECORIDE.bat / `npm run demo`, ou DEMARRER-ECORIDE-REEL.bat / `npm run demo:reel`.
 * ====================================================================
 */
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startAuthEmulator, DEMO_PASSWORD } from "./auth-emulator.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEMO_DIR = path.join(ROOT, ".demo");
const PG_DATA = path.join(DEMO_DIR, "pgdata");
const PG_PORT = 5433, AUTH_PORT = 9099, APP_PORT = 5000;
const REAL = process.argv.includes("--reel");
const PROJECT_ID = "demo-ecoride";
const APP_URL = `http://localhost:${APP_PORT}`;

const step = (msg) => console.log(`\n▶ ${msg}`);
function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

/** Lit les variables Firebase du fichier .env (mode réel). */
function readFirebaseEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) fail("Fichier .env introuvable : le mode réel a besoin des clés Firebase (voir .env.example).");
  const vars = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*((?:VITE_)?FIREBASE_[A-Z_]+)\s*=\s*(.*)$/);
    if (m) vars[m[1]] = m[2].trim();
  }
  for (const key of ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_PROJECT_ID", "VITE_FIREBASE_APP_ID", "FIREBASE_PROJECT_ID"]) {
    if (!vars[key]) fail(`Variable ${key} absente du fichier .env.`);
  }
  return vars;
}

/** Cherche les outils PostgreSQL (variable PG_BIN, sinon C:\Program Files\PostgreSQL\<version>\bin). */
function findPgBin() {
  if (process.env.PG_BIN) return process.env.PG_BIN;
  const base = "C:\\Program Files\\PostgreSQL";
  if (!fs.existsSync(base)) return null;
  const versions = fs.readdirSync(base).filter((v) => fs.existsSync(path.join(base, v, "bin", "initdb.exe")));
  versions.sort((a, b) => Number(b) - Number(a));
  return versions.length ? path.join(base, versions[0], "bin") : null;
}

function run(bin, args, label) {
  const r = spawnSync(bin, args, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  if (r.status !== 0) fail(`${label} a échoué :\n${r.stderr || r.stdout}`);
  return r.stdout;
}

function portFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer().once("error", () => resolve(false));
    srv.listen(port, "127.0.0.1", () => srv.close(() => resolve(true)));
  });
}

async function waitFor(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch { /* pas encore prêt */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ---------------------------------------------------------------- vérifications
console.log("==============================================");
console.log(REAL ? "  EcoRide — mode réel (vrai Firebase, base locale)" : "  EcoRide — mode démo local");
console.log("==============================================");

const firebaseEnv = REAL ? readFirebaseEnv() : null;
const pgBin = findPgBin();
if (!pgBin) fail("PostgreSQL est introuvable. Installez-le (postgresql.org) ou indiquez son dossier bin dans PG_BIN.");
const pg = (tool) => path.join(pgBin, `${tool}.exe`);

if (!fs.existsSync(path.join(ROOT, "node_modules"))) {
  step("Première utilisation : installation des dépendances (quelques minutes)...");
  const r = spawnSync("npm", ["install"], { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) fail("npm install a échoué.");
}

// Une démo précédente mal fermée peut avoir laissé PostgreSQL tourner
if (fs.existsSync(path.join(PG_DATA, "postmaster.pid"))) {
  spawnSync(pg("pg_ctl"), ["-D", PG_DATA, "stop", "-m", "fast"], { stdio: "ignore" });
}
const ports = [[PG_PORT, "PostgreSQL de démo"], [APP_PORT, "application"]];
if (!REAL) ports.push([AUTH_PORT, "émulateur d'authentification"]);
for (const [port, name] of ports) {
  if (!(await portFree(port))) fail(`Le port ${port} (${name}) est déjà utilisé. Fermez l'autre programme ou l'ancienne fenêtre de démo.`);
}

// ---------------------------------------------------------------- base de données
step("Création d'une base de données neuve...");
fs.rmSync(PG_DATA, { recursive: true, force: true });
fs.mkdirSync(DEMO_DIR, { recursive: true });
run(pg("initdb"), ["-D", PG_DATA, "-U", "ecoride", "--auth=trust", "-E", "UTF8", "--locale=C"], "initdb");
const started = spawnSync(pg("pg_ctl"), ["-D", PG_DATA, "-w", "-l", path.join(DEMO_DIR, "postgres.log"),
  "-o", `-p ${PG_PORT} -c listen_addresses=127.0.0.1`, "start"], { stdio: "ignore" });
if (started.status !== 0) fail(`PostgreSQL n'a pas démarré (voir ${path.join(DEMO_DIR, "postgres.log")}).`);

let app, auth, stopped = false;
function stopAll() {
  if (stopped) return;
  stopped = true;
  console.log("\nArrêt de la démo...");
  if (app && app.exitCode === null) app.kill();
  auth?.close();
  spawnSync(pg("pg_ctl"), ["-D", PG_DATA, "stop", "-m", "fast"], { stdio: "ignore" });
}
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
  process.on(sig, () => { stopAll(); process.exit(0); });
}

const psqlArgs = ["-h", "127.0.0.1", "-p", String(PG_PORT), "-U", "ecoride", "-v", "ON_ERROR_STOP=1", "-q"];
run(pg("createdb"), ["-h", "127.0.0.1", "-p", String(PG_PORT), "-U", "ecoride", "ecoride"], "createdb");
for (const file of ["sql/schema.sql", "sql/seed.sql", "scripts/demo/demo-data.sql"]) {
  run(pg("psql"), [...psqlArgs, "-d", "ecoride", "-f", path.join(ROOT, file)], file);
}

// ---------------------------------------------------------------- authentification
if (!REAL) {
  step("Démarrage de l'émulateur d'authentification...");
  auth = await startAuthEmulator({ port: AUTH_PORT, projectId: PROJECT_ID });
}

// ---------------------------------------------------------------- application
step("Démarrage de l'application (environ 15 secondes)...");
const authHost = `127.0.0.1:${AUTH_PORT}`;
// Mode réel : clés du .env ; mode démo : émulateur local et projet fictif
const firebase = REAL
  ? { ...firebaseEnv, FIREBASE_AUTH_EMULATOR_HOST: "", VITE_FIREBASE_AUTH_EMULATOR_HOST: "" }
  : {
      FIREBASE_PROJECT_ID: PROJECT_ID,
      FIREBASE_AUTH_EMULATOR_HOST: authHost,
      VITE_FIREBASE_AUTH_EMULATOR_HOST: authHost,
      VITE_FIREBASE_API_KEY: "demo-api-key",
      VITE_FIREBASE_PROJECT_ID: PROJECT_ID,
      VITE_FIREBASE_APP_ID: "demo-app",
    };
app = spawn(process.execPath, [path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"), "server/index.ts"], {
  cwd: ROOT,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "development",
    PORT: String(APP_PORT),
    DATABASE_URL: `postgres://ecoride@127.0.0.1:${PG_PORT}/ecoride`,
    MONGO_URL: "",
    JWT_SECRET: crypto.randomBytes(48).toString("hex"),
    ...firebase,
  },
});
app.on("exit", (code) => {
  if (!stopped) {
    console.error(`\n✖ L'application s'est arrêtée (code ${code}).`);
    stopAll();
    process.exit(1);
  }
});

if (!(await waitFor(`${APP_URL}/api/health`, 90_000))) {
  stopAll();
  fail("L'application ne répond pas après 90 secondes.");
}

const accounts = REAL ? `  Connexion avec les VRAIS comptes Firebase du projet ${firebaseEnv.FIREBASE_PROJECT_ID} :
    Administrateur : admin@ecoride.com (votre mot de passe Firebase) → /login
    Nouveaux comptes : /register (20 crédits offerts)
  Employé (page séparée) : employe@ecoride.com / Employe2026!  → /employee/login
  Les trajets de démonstration (Marie, Pierre...) sont visibles et réservables.` : `  Comptes de démonstration (mot de passe : ${DEMO_PASSWORD})
    Administrateur : admin@ecoride.com          → /login puis menu « Administration »
    Chauffeur      : marie.dupont@email.com     → /login
    Chauffeur+pass.: pierre.martin@email.com    → /login
    Passagère      : sophie.bernard@email.com   → /login (20 crédits)
    Passager       : lucas.petit@email.com      → /login (12 crédits)
  Employé (page séparée) : employe@ecoride.com / Employe2026!  → /employee/login`;

console.log(`
==============================================
  EcoRide est prêt : ${APP_URL}
==============================================
${accounts}

  La base est recréée à chaque lancement (trajets à venir, litige, avis à modérer).
  Pour arrêter : fermez cette fenêtre ou appuyez sur Ctrl+C.
==============================================
`);
spawn("cmd", ["/c", "start", "", APP_URL], { stdio: "ignore", detached: true }).unref();
