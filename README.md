# EcoRide 🌱 : covoiturage écoresponsable

[![CI](https://github.com/nicodu777/EcoRideCommunity/actions/workflows/ci.yml/badge.svg)](https://github.com/nicodu777/EcoRideCommunity/actions/workflows/ci.yml)

Application web de covoiturage réalisée pour l'ECF du **titre professionnel Développeur Web et Web Mobile** (Studi).
EcoRide met en relation chauffeurs et passagers pour des trajets en voiture, et met en avant les véhicules électriques.

- **Gestion de projet (Trello)** : lien communiqué dans la copie à rendre

---

## Sommaire
1. [Fonctionnalités](#fonctionnalités)
2. [Stack technique](#stack-technique)
3. [Architecture](#architecture)
4. [Installation locale](#installation-locale)
5. [Installation avec Docker](#installation-avec-docker)
6. [Déploiement en ligne (Render + Neon)](#déploiement-en-ligne-render--neon)
7. [Comptes de démonstration](#comptes-de-démonstration)
8. [Tests](#tests)
9. [Sécurité](#sécurité)
10. [Workflow Git](#workflow-git)

---

## Fonctionnalités

| US | Fonctionnalité | Où |
|----|----------------|----|
| US1 | Page d'accueil : présentation, recherche, pied de page (contact + mentions légales) | `client/src/pages/home.tsx` |
| US2 | Menu : accueil, covoiturages, connexion, espace utilisateur | `components/layout/navbar.tsx` |
| US3 | Recherche par ville et date ; seulement les trajets avec places ; badge « écologique » ; **date la plus proche** proposée si aucun résultat | `TripRepository.search`, `findNearestDate` |
| US4 | Filtres : écologique, prix max, durée max, note minimale | `pages/search-results.tsx` |
| US5 | Détail : véhicule, préférences du chauffeur, avis publiés | `pages/trip-details.tsx` |
| US6 | Participer : contrôle places + crédits, **double confirmation**, débit des crédits | `BookingService.reserve` |
| US7 | Inscription (mot de passe fort), **20 crédits** offerts | `UserService.register` |
| US8 | Rôle passager / chauffeur / les deux, véhicules, préférences (MongoDB) | `pages/dashboard.tsx` |
| US9 | Publier un trajet avec un de ses véhicules, **2 crédits** pour la plateforme | `TripService.create` |
| US10 | Historique, annulation passager ou chauffeur (remboursement + notification) | `BookingService.cancel`, `TripService.cancel` |
| US11 | Démarrer / arrivée, validation par le passager → paiement du chauffeur | `TripService.complete`, `BookingService.validate` |
| US12 | Espace employé : modération des avis, traitement des litiges | `pages/employee/dashboard.tsx` |
| US13 | Espace admin : création d'employés, graphiques, suspension, total des crédits | `pages/admin-dashboard.tsx` |

## Stack technique

| Couche | Technologie | Pourquoi |
|--------|-------------|----------|
| Front | React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui | Composants réutilisables, typage, responsive |
| Données front | TanStack Query | Cache et rafraîchissement des données |
| Back | Node.js + Express + TypeScript | Même langage côté client et serveur |
| BDD relationnelle | **PostgreSQL 16** via **Drizzle ORM** | Relations fortes (trajets ↔ réservations ↔ crédits), transactions ACID |
| BDD NoSQL | **MongoDB 7** | Préférences des chauffeurs (structure libre) et journal des actions admin |
| Authentification | Firebase Authentication + vérification serveur (`firebase-admin`) ; JWT pour les employés | Mots de passe gérés par Google, tokens signés |
| Tests | Vitest, Supertest, PGlite (PostgreSQL en mémoire) | Tests sur le vrai SQL sans installer de serveur |
| Déploiement | Docker Compose (application, PostgreSQL, MongoDB) | |

## Architecture

```
client/          Front React
  src/pages/       une page = un écran
  src/components/  composants réutilisables
  src/lib/         client HTTP (token automatique), authentification
server/          API Express en couches
  routes/          définition des endpoints, validation Zod   ← HTTP
  services/        règles métier (classes)                   ← métier
  repositories/    requêtes SQL (Drizzle) et MongoDB         ← données
  middlewares/     authentification, rôles, erreurs
  security/        vérification Firebase, JWT employés
  container.ts     assemblage des dépendances (injection)
shared/schema.ts Schéma de la base + validations, partagés client/serveur
sql/             schema.sql (création) et seed.sql (jeu de données)
tests/           tests automatisés
```

Parcours d'une requête, par exemple « réserver un trajet » :

```
Navigateur ──POST /api/bookings + Authorization: Bearer <token>──▶ requireAuth (vérifie le token)
  ──▶ bookingRoutes (valide le corps avec Zod) ──▶ BookingService.reserve (règles + transaction)
  ──▶ TripRepository / UserRepository / BookingRepository (SQL paramétré) ──▶ PostgreSQL
```

## Installation locale

Prérequis : Node.js 20+, PostgreSQL 16, MongoDB 7 (optionnel), un projet Firebase avec l'authentification email/mot de passe activée.

```bash
git clone https://github.com/nicodu777/EcoRideCommunity.git
cd EcoRideCommunity
npm install
cp .env.example .env          # puis compléter les valeurs
```

Créer la base et charger le jeu de données :

```bash
psql -U postgres -c "CREATE USER ecoride WITH PASSWORD 'changez-moi';"
psql -U postgres -c "CREATE DATABASE ecoride OWNER ecoride;"
psql -U ecoride -d ecoride -f sql/schema.sql
psql -U ecoride -d ecoride -f sql/seed.sql
```

Lancer l'application (http://localhost:5000) :

```bash
npm run dev
```

## Installation avec Docker

```bash
cp .env.example .env          # compléter POSTGRES_PASSWORD, JWT_SECRET et les clés Firebase
docker compose up -d --build
```

PostgreSQL est créé automatiquement avec `sql/schema.sql` puis `sql/seed.sql`, et MongoDB démarre à côté.

## Déploiement en ligne (Render + Neon)

L'application est décrite dans `render.yaml` (Blueprint Render) et construite avec le `Dockerfile`.

1. **Base PostgreSQL (Neon)** : créer un projet, puis exécuter `sql/schema.sql` puis `sql/seed.sql` dans l'éditeur SQL. Copier la chaîne de connexion (`postgresql://...?sslmode=require`).
2. **Firebase** : *Authentication → Settings → Authorized domains* : ajouter le domaine `xxx.onrender.com`.
3. **Render** : *New → Blueprint*, choisir ce dépôt, puis renseigner `DATABASE_URL`, `FIREBASE_PROJECT_ID` et les trois `VITE_FIREBASE_*`. `JWT_SECRET` est généré par Render.

Chaque fusion dans `main` est redéployée automatiquement, une fois la CI au vert. Sur l'offre gratuite, le service se met en veille après 15 minutes sans visite : la première requête prend alors environ une minute.

## Comptes de démonstration

| Rôle | Connexion | Identifiants |
|------|-----------|--------------|
| Administrateur | `/login` | `admin@ecoride.com` (compte Firebase créé à la main ; son UID est inscrit dans `sql/seed.sql`) |
| Employé | `/employee/login` | `employe@ecoride.com` / `Employe2026!` |
| Utilisateurs | `/register` | créer un compte (20 crédits offerts) |

> Le compte administrateur ne peut pas être créé depuis l'application : le rôle `admin` est refusé à l'inscription.
> Il est créé dans la console Firebase, puis relié à la base par son UID (fichier `sql/seed.sql`).

## Tests

```bash
npm test        # 34 tests : règles métier (crédits, annulations, litiges...) et sécurité de l'API
npm run check   # vérification TypeScript de tout le projet
```

Les tests utilisent PGlite, un vrai PostgreSQL compilé en WebAssembly, initialisé avec `sql/schema.sql` et `sql/seed.sql`.

L'intégration continue (GitHub Actions, `.github/workflows/ci.yml`) relance la vérification TypeScript, les tests et le build à chaque push et à chaque pull request sur `main` et `develop`.

## Sécurité

| Risque (OWASP Top 10) | Protection |
|-----------------------|-----------|
| A01 Contrôle d'accès | Identité lue dans le token vérifié (`req.user`), jamais dans le corps ; middlewares `requireAuth`, `requireRole("admin")`, `requireEmployee(permission)` ; chaque service vérifie que la ressource appartient à l'utilisateur |
| A02 Données sensibles | Mots de passe employés hachés avec bcrypt (coût 12) ; UID Firebase et hash jamais renvoyés ; secrets dans `.env` |
| A03 Injection | Requêtes paramétrées Drizzle ; validation Zod de toutes les entrées ; React échappe l'affichage (anti-XSS) |
| A04 Conception | Prix recalculé côté serveur ; transactions avec `SELECT … FOR UPDATE` (pas de survente) ; contraintes `CHECK` en base (crédits ≥ 0, places ≥ 0) |
| A05 Configuration | En-têtes `helmet` (CSP en production), `x-powered-by` désactivé, conteneur non root |
| A07 Authentification | Token Firebase vérifié (signature, expiration, révocation) ; JWT employé signé HS256, 2 h ; limitation à 10 tentatives de connexion / 15 min |

## Workflow Git

- `main` : version stable, déployée
- `develop` : intégration des fonctionnalités
- `feature/<nom>` : une branche par fonctionnalité, fusionnée dans `develop` après tests, puis `develop` dans `main`

Messages de commit : `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.
