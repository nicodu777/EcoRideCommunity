# EcoRide — Backend

API REST du service de covoiturage EcoRide.
Je développe ici l'ensemble de la partie serveur avec Express, TypeScript et PostgreSQL.

## Technologies utilisées

- Node.js avec Express.js
- TypeScript pour le typage statique
- Drizzle ORM pour l'accès à la base de données
- PostgreSQL (hébergé Neon en production)
- Drizzle Zod pour la validation automatique des données
- Bcryptjs pour le hachage des mots de passe employés
- WebSocket (ws) pour le chat en temps réel
- Zod pour la validation des requêtes API

## Architecture en couches (Pattern POO)

J'applique une architecture en trois couches distinctes :

```
Requête HTTP
     │
     ▼
┌─────────────────┐
│     Routes      │  reçoit et valide la requête, délègue au service
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Services     │  applique les règles métier
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Repositories   │  accède à la base de données via Drizzle ORM
└─────────────────┘
```

## Structure du projet

```
backend/
├── server/
│   ├── index.ts           point d'entrée, configuration Express
│   ├── routes.ts          enregistrement de toutes les routes
│   ├── storage.ts         couche d'abstraction base de données
│   ├── db.ts              connexion Drizzle + Neon
│   ├── routes/
│   │   └── userRoutes.ts  routes utilisateurs (architecture POO)
│   ├── services/
│   │   └── UserService.ts logique métier utilisateurs
│   └── repositories/
│       └── UserRepository.ts accès données utilisateurs
├── shared/
│   └── schema.ts          modèles Drizzle et types TypeScript
├── sql/
│   ├── schema.sql         script de création des tables
│   └── seed.sql           données de test
├── drizzle.config.ts      configuration Drizzle Kit
├── tsconfig.json
├── package.json
└── README.md
```

## Installation et lancement

Le backend utilise les dépendances installées à la racine du projet.

```bash
# Depuis la racine du projet
npm install

# Lancer le backend (port 5001)
cd backend && NODE_ENV=development node ../node_modules/.bin/tsx server/index.ts
```

## Routes API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /api/trips | Liste des trajets disponibles |
| POST | /api/trips | Créer un trajet |
| GET | /api/users/firebase/:uid | Récupérer un utilisateur par UID Firebase |
| POST | /api/users | Créer un utilisateur |
| GET | /api/bookings/passenger/:id | Réservations d'un passager |
| POST | /api/bookings | Créer une réservation |
| GET | /api/chat/conversations/:id | Conversations d'un utilisateur |

## Variables d'environnement

```env
DATABASE_URL=postgres://...    chaîne de connexion PostgreSQL
NODE_ENV=development
```

## Base de données

```bash
# Synchroniser le schéma avec la base de données
cd backend && node ../node_modules/.bin/drizzle-kit push --config=drizzle.config.ts
```

## Sécurité

- Validation Zod sur toutes les entrées API
- Hachage bcrypt pour les mots de passe employés
- Vérification des rôles (passenger, driver, admin) avant chaque action sensible
- Attribution automatique du rôle admin pour l'email admin@ecoride.com
- Système de crédits avec vérification du solde avant réservation
