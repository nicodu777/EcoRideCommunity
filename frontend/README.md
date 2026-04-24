# EcoRide — Frontend

Interface utilisateur de l'application de covoiturage EcoRide.
Je développe ici l'ensemble de la partie cliente avec React et TypeScript.

## Technologies utilisées

- React 18 avec TypeScript
- Vite comme serveur de développement et outil de build
- Tailwind CSS pour le stylisme
- Shadcn/UI et Radix UI pour les composants accessibles
- TanStack Query (React Query v5) pour la gestion des données serveur
- Wouter pour le routage côté client
- Firebase Authentication pour la connexion des utilisateurs
- React Hook Form et Zod pour les formulaires et la validation

## Structure du projet

```
frontend/
├── src/
│   ├── components/        composants réutilisables
│   │   ├── ui/            boutons, modals, inputs (Shadcn)
│   │   ├── layout/        navbar, mobile-nav
│   │   ├── trip/          cartes et modals de trajet
│   │   ├── chat/          fenêtre de messagerie
│   │   └── gamification/  badges et points éco
│   ├── pages/             une page par route
│   │   ├── home.tsx
│   │   ├── dashboard.tsx
│   │   ├── messages.tsx
│   │   ├── admin-dashboard.tsx
│   │   └── auth/          connexion et inscription
│   ├── lib/
│   │   ├── auth.ts        service d'authentification Firebase
│   │   ├── firebase.ts    configuration Firebase
│   │   └── queryClient.ts configuration TanStack Query
│   ├── hooks/             hooks React personnalisés
│   ├── App.tsx            routeur principal
│   └── main.tsx           point d'entrée
├── index.html
├── vite.config.ts         proxy /api → backend (port 5001)
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Installation et lancement

Le frontend utilise les dépendances installées à la racine du projet.

```bash
# Depuis la racine du projet
npm install

# Lancer le frontend (port 5000)
cd frontend && ../node_modules/.bin/vite --port 5000 --host 0.0.0.0
```

## Communication avec le backend

Toutes les requêtes vers `/api` sont automatiquement proxiées vers le backend Express
sur le port 5001, grâce à la configuration Vite :

```typescript
proxy: {
  "/api": {
    target: "http://localhost:5001",
    changeOrigin: true,
  }
}
```

Je n'ai donc pas besoin de spécifier l'URL absolue dans le code — les appels `/api/users`
sont transparents pour les composants React.

## Variables d'environnement

Les variables Firebase sont déclarées dans `src/lib/firebase.ts`.
Elles doivent être préfixées `VITE_` pour être accessibles dans le navigateur.

## Build de production

```bash
cd frontend && ../node_modules/.bin/vite build
```

Le résultat est généré dans `../dist/public/` et peut être servi par le backend.
