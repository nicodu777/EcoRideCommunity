# Audit EcoRide : préparation du repassage TP DWWM (Studi)

Dépôt analysé : https://github.com/nicodu777/EcoRideCommunity (93 commits, dernier commit le 11/12/2025)
Référentiel : TP Développeur Web et Web Mobile. AT1 = front-end sécurisé, AT2 = back-end sécurisé.

---

## 0. Le diagnostic en une phrase

L'interface est riche, mais **le back-end ne fait pas ce que ton dossier affirme**. Il n'y a ni JWT, ni vérification du token
Firebase, ni base PostgreSQL réellement utilisée, ni NoSQL. Et la plupart des routes API ne sont pas protégées du tout.
Un jury qui ouvre `server/routes.ts` le voit en 2 minutes. C'est la priorité n°1, avant le design et la doc.

Les remarques de ton évaluateur précédent (elles sont dans `attached_assets/Pasted--Contexte-projet…txt`) sont encore
**en grande partie valables** : le passage en couches POO n'a été fait que pour les utilisateurs.

---

## 1. 🔴 Sécurité : bloquant (compétences « application sécurisée » des AT1 et AT2)

| # | Problème | Où | Ce qui peut arriver |
|---|----------|----|---------------------|
| S1 | **Aucune authentification** sur les routes trajets, réservations, avis, admin et analytics | `server/routes.ts` l.51-470 | N'importe qui, sans compte, peut créer, modifier ou supprimer un trajet, suspendre un utilisateur (`PUT /api/admin/users/5/suspend`) ou lister tous les utilisateurs avec leurs données |
| S2 | **Escalade de privilèges** : `PATCH /api/users/:id/role` n'a aucun contrôle | `server/routes/userRoutes.ts` l.107 | `curl -X PATCH /api/users/12/role -d '{"role":"admin"}'` et on devient admin |
| S3 | Le contrôle admin repose sur l'en-tête **`x-user-id`**, que le client envoie lui-même | `routes.ts` l.665-760, `admin-dashboard.tsx` l.99 | Il suffit d'envoyer `x-user-id: 1` pour créer des employés |
| S4 | **Le token employé est l'ID de l'employé** (`generateEmployeeToken` renvoie `id.toString()`) | `server/employeeAuth.ts` | `Authorization: Bearer 1` donne l'accès employé. Le commentaire du code l'avoue lui-même : « dans une vraie app, utiliser JWT » |
| S5 | Le token Firebase n'est **jamais vérifié côté serveur** (pas de `firebase-admin`, pas de `verifyIdToken`) | tout `server/` | Le serveur fait confiance à l'ID que le client lui envoie dans l'URL ou le body |
| S6 | **Mass assignment** : `req.body` est passé tel quel à `updateTrip`, `updateBooking` et `updateUser` | `routes.ts` l.128, 207 ; `userRoutes.ts` l.138 | `PUT /api/users/12 {"credits":"99999","role":"admin"}` modifie les crédits et le rôle |
| S7 | `req.isAuthenticated()` est appelé alors que Passport n'est jamais configuré | `routes.ts` l.422-470 | Erreur 500 (TypeError) sur `/api/admin/reports` et `/api/admin/actions` |
| S8 | Un admin est codé en dur par email et par UID Firebase | `server/services/UserService.ts` l.65-71 | Quiconque crée un compte Firebase avec `admin@ecoride.com` devient admin |
| S9 | Le gestionnaire d'erreurs fait `throw err` **après** avoir répondu | `server/index.ts` l.47 | Plantage possible du process |
| S10 | Le logger écrit le JSON des réponses API, `console.log` affiche les données des trajets | `server/index.ts`, `routes.ts` l.88 | Fuite de données dans les logs |

> ⚠️ Ta « Copie finale ECF » dit : *« Les appels API sont protégés par JWT, et les rôles sont vérifiés côté serveur. »*
> **C'est faux dans le code.** Un jury qui le remarque te met en difficulté sur toute la partie sécurité. Il faut corriger le
> code, ou au minimum la doc. Corriger le code est bien sûr la bonne option.

### Correctif type (à reproduire, à comprendre et à savoir expliquer à l'oral)

```ts
// server/middlewares/auth.ts
import admin from "firebase-admin";
admin.initializeApp({ credential: admin.credential.applicationDefault() });

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ message: "Non authentifié" });
  try {
    const decoded = await admin.auth().verifyIdToken(header.slice(7));   // signature + expiration vérifiées
    const user = await userService.getUserByFirebaseUid(decoded.uid);
    if (!user || user.isSuspended) return res.status(403).json({ message: "Compte inactif" });
    req.user = user;                                                     // identité fiable, issue du token
    next();
  } catch { return res.status(401).json({ message: "Token invalide" }); }
}

export const requireRole = (...roles: string[]) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: "Accès refusé" });
```

Utilisation : `app.put("/api/admin/users/:id/suspend", requireAuth, requireRole("admin"), …)`.
Côté client, `apiRequest` ajoute `Authorization: Bearer ${await auth.currentUser.getIdToken()}`.
Pour les employés, signe un vrai JWT (`jsonwebtoken`, secret dans `.env`, expiration à 2 h) au lieu de renvoyer l'ID.
Côté serveur, ne prends **jamais** `driverId` ou `passengerId` dans le body : utilise `req.user.id`.
Valide chaque body avec un schéma Zod **restreint** (`.pick({...})`) pour bloquer le mass assignment.
Ajoute aussi `helmet()`, `express-rate-limit` sur les logins et une config CORS explicite.

---

## 2. 🔴 Base de données (compétences « Mettre en place une BDD relationnelle » et « Composants d'accès SQL et NoSQL »)

| # | Problème | Où |
|---|----------|----|
| D1 | **`export const storage = new MemStorage()`** : toute l'appli tourne **en mémoire**. PostgreSQL n'est pas utilisé, les données disparaissent à chaque redémarrage. `DatabaseStorage` existe mais est commenté | `server/storage.ts` l.1530 |
| D2 | `server/db.ts` utilise le driver **Neon serverless** (WebSocket). Il ne peut pas se connecter au Postgres standard du `docker-compose` | `server/db.ts` |
| D3 | `sql/schema.sql` (13 tables) et `shared/schema.ts` Drizzle (19 tables) sont **désynchronisés** : il manque payments, recurring_trips, user_reports, system_settings, etc. | `sql/`, `shared/` |
| D4 | **Pas de table `vehicles`**. Marque, modèle et type sont recopiés dans chaque trajet. Le sujet EcoRide demande que le chauffeur enregistre ses véhicules (plaque, date de 1ʳᵉ immatriculation, marque, modèle, couleur, nombre de places) puis en choisisse un pour chaque trajet | `shared/schema.ts` l.45 |
| D5 | Les préférences (fumeur, animaux, préférences libres) sont stockées en `text` JSON. Elles seraient mieux dans une table dédiée, ou alors dans le NoSQL (voir D6) | `users.preferences` |
| D6 | **Aucun NoSQL réel.** Firebase *Authentication* n'est pas une base NoSQL. Le référentiel exige un composant d'accès **NoSQL** | – |
| D7 | Aucune transaction lors d'une réservation (vérifier les places, débiter les crédits, décrémenter les places) : risque de survente. En plus, `DatabaseStorage.createBooking` ne décrémente **pas** les places | `storage.ts` l.1001 |

### À faire
1. Passer à `new DatabaseStorage()` et utiliser le driver `pg` (node-postgres) avec `drizzle-orm/node-postgres`.
   Neon reste possible en prod via la même URL.
2. Générer `schema.sql` à partir de Drizzle (`drizzle-kit generate`) pour n'avoir **qu'une seule source de vérité**.
   Ajouter les FK, `ON DELETE`, les `CHECK (available_seats >= 0)` et `CHECK (credits >= 0)`, et des index sur `trips(departure, destination, departure_time)`.
3. Créer `vehicles` (FK `user_id`) et `trips.vehicle_id`. `is_ecological` doit se **déduire** de `vehicles.energy = 'electric'`.
4. NoSQL : **MongoDB** (un conteneur dans docker-compose) pour un usage justifiable, par exemple :
   - les **avis** avant modération (document souple : texte, note, statut, historique de modération), ou
   - les **préférences chauffeur** (structure libre), ou
   - les **logs d'actions admin / statistiques**.
   Écris un vrai `ReviewRepository` en Mongo et sache expliquer **pourquoi** cette donnée-là va en NoSQL.
5. Réservation dans `db.transaction(async tx => { … SELECT … FOR UPDATE … })`.

---

## 3. 🟠 Logique métier EcoRide (US du sujet)

| # | Règle du sujet | État dans le code |
|---|----------------|-------------------|
| M1 | 20 crédits à l'inscription | ✅ valeur par défaut |
| M2 | Le passager est **débité** à la réservation | ❌ aucun débit (`createBooking` ne touche pas aux crédits) |
| M3 | La plateforme prend **2 crédits** par trajet | ❌ `DatabaseStorage` applique 10 % de commission. `MemStorage` (celle qui tourne) ne fait rien |
| M4 | Annulation, remboursement des crédits, mail aux passagers si le chauffeur annule | ❌ aucune logique d'annulation côté serveur |
| M5 | Fin de trajet, validation par les passagers, puis crédit du chauffeur ; en cas de litige, un employé tranche | ⚠️ partiel, et `completeTrip` en mémoire ne crédite pas |
| M6 | Avis visibles seulement après validation par un employé | ⚠️ la logique existe, mais les routes `/api/ratings/:id/approve` sont ouvertes à tous |
| M7 | Admin : création d'employés, suspension, graphiques trajets/jour et crédits gagnés/jour, total des crédits | ⚠️ l'interface existe, mais les routes ne sont pas protégées et les calculs sont faux (10 %) |
| M8 | Filtres de recherche (écologique, prix max, durée max, note min) et proposition de la date la plus proche si aucun résultat | à vérifier/compléter dans `searchTrips` |

Les crédits sont affichés en **« € »** (`dashboard.tsx` l.619, `admin-dashboard.tsx` l.379). Ce sont des crédits, pas des euros.

**Méthode** : mets toute cette logique dans un `BookingService`/`TripService` (POO) avec des méthodes nommées comme les règles :
`reserver()`, `annulerParPassager()`, `annulerParChauffeur()`, `demarrer()`, `terminer()`, `validerParPassager()`.
C'est exactement ce que l'évaluateur reprochait de ne pas voir.

---

## 4. 🟠 Architecture et qualité (les remarques de l'évaluateur précédent)

- **Couches POO** : seul `User` passe par routes → `UserService` → `UserRepository`. Tout le reste (≈ 880 lignes) est dans
  `server/routes.ts` et appelle `storage` directement. `TripService.ts` a été créé puis **supprimé** (commit `fdfd0d8`).
  `server/routes/index.ts` n'est importé nulle part (code mort), et `/api/users` est monté deux fois.
- `server/storage.ts` fait **1 531 lignes** avec deux implémentations complètes. Une fois les repositories créés, supprime `MemStorage`.
- **Dépendances inutilisées** : `stripe`, `openai`, `@sendgrid/mail`, `passport`, `openid-client`, `express-session`,
  `connect-pg-simple`, `memorystore`… Le jury peut te demander à quoi elles servent. Retire ce que tu n'utilises pas.
- Composants listés mais sans réelle fonction (paiements, IA, gamification, carte) : soit tu les termines, soit tu les retires.
  **Mieux vaut moins de fonctionnalités, mais solides et sécurisées.**
- `package.json` s'appelle encore `"rest-express"`.
- **Aucun test.** Ajoute **Vitest + Supertest** sur 5 ou 6 cas : réservation OK, plus de places, crédits insuffisants,
  route admin sans token → 401, route admin avec un rôle user → 403. Ça te fournit directement ton **jeu d'essai** pour le dossier.

---

## 5. 🟠 Déploiement, Docker et dépôt

- **Docker ne fonctionne pas tel quel** :
  - le port est codé en dur à `5000` dans `server/index.ts` alors que docker-compose expose `3000` → utilise `process.env.PORT ?? 5000` ;
  - le driver Neon ne parle pas à `postgres:16` (voir D2) ;
  - les variables `VITE_FIREBASE_*` sont absentes, donc le front lève une exception au démarrage (`client/src/lib/firebase.ts`) ;
  - le `CMD` lance `npm run dev` en image « production ». Il faut un build multi-étapes puis `npm start`.
- **Pas de `README.md` à la racine** (il n'y a que `replit.md`). Le jury commence par là. Il doit contenir l'installation locale,
  Docker, `.env.example`, les comptes de test, les choix techniques et la stratégie de branches.
- **Pas de `.env.example`**.
- **Git** : 91 commits sur `main`, beaucoup intitulés « Saved progress at the end of the loop » (auto-commits Replit). Le sujet
  ECF demande en général une branche `main`, une branche `develop` et des branches de fonctionnalité fusionnées dans `develop`.
  Pour la suite : `develop` + `feature/securite-auth`, `feature/vehicules`, etc., avec des messages de commit clairs (`feat:`, `fix:`).
- **Fichiers de travail à sortir du dépôt** : `attached_assets/` (captures et consignes de travail), `generate_pdf.*`,
  `documentation_technique_simple.html`. `EVALUATION_CONSIGNES.md` affiche « ✅ CONFORME » alors que plusieurs points sont faux.
  Supprime-le ou mets-le à jour honnêtement.

---

## 6. 🟡 Le dossier projet : à mettre en cohérence avec le code

Le jury compare le dossier au code. Tout ce qui est écrit doit être **vrai et montrable** :

| Dans ton dossier | Réalité actuelle | Action |
|------------------|------------------|--------|
| « API protégées par JWT » | Pas de JWT | Implémenter (§1), puis montrer l'extrait de middleware |
| « PostgreSQL gère trajets, réservations, utilisateurs » | MemStorage | Brancher PostgreSQL (§2) |
| « Drizzle prévient les injections SQL » | Vrai en principe, mais Drizzle n'est pas utilisé à l'exécution | Une fois branché, montrer une requête paramétrée |
| « Base NoSQL Firebase » | Firebase Auth n'est pas du NoSQL | MongoDB (§2.4) |
| « Rôles vérifiés côté serveur » | Faux (S1 à S4) | `requireRole` |

Rappel de la structure attendue (notice Studi, projet en formation) : compétences couvertes, expression des besoins, environnement
technique, puis les réalisations. Elles doivent contenir : maquettes desktop et mobile, enchaînement des maquettes, captures, extraits
de code statique et dynamique, MCD/MLD/MPD et script SQL, extraits de composants métier et d'accès aux données SQL **et** NoSQL,
sécurité, **jeu d'essai** (entrée / attendu / obtenu / écart) et **veille sécurité**. **30 à 50 pages** hors annexes.

Pour la **veille sécurité**, cite l'OWASP Top 10. Le plus fort, c'est de raconter les failles de ce rapport comme **ta** veille :
« j'ai identifié A01 Broken Access Control (S1-S3), A07 Identification Failures (S4-S5), voici le correctif et le test qui le prouve ».
Les jurys adorent ça, et c'est précisément ce qu'on attend d'un dev.

---

## 7. Plan d'action conseillé (par ordre de priorité)

1. **Sécurité** : middleware `requireAuth` (Firebase Admin) + `requireRole`, vrai JWT employé, suppression de `x-user-id`,
   identité prise dans le token, schémas Zod restreints. *(≈ 1 à 2 jours)*
2. **BDD** : `DatabaseStorage` avec le driver `pg`, schéma unique généré, table `vehicles`, contraintes, transaction de réservation. *(≈ 1 à 2 jours)*
3. **Couches POO** : `TripService`/`TripRepository`, `BookingService`/`BookingRepository`, `RatingService`. Vider `routes.ts`. *(≈ 2 jours)*
4. **Règles métier** : débit passager, 2 crédits plateforme, annulation et remboursement, validation fin de trajet. *(≈ 1 jour)*
5. **NoSQL MongoDB** pour les avis ou les logs, avec son repository. *(≈ 1 jour)*
6. **Tests** Vitest + Supertest, qui servent aussi de jeu d'essai. *(≈ 0,5 jour)*
7. **Docker** fonctionnel, `README.md`, `.env.example`, nettoyage des dépendances et des fichiers, branches `develop`/`feature`. *(≈ 0,5 jour)*
8. **Dossier projet** et **oral** mis à jour avec des extraits du code corrigé.

---

## 8. Méthode de révision pour l'oral (combler les « connaissances globales »)

Le jury pose des questions **sur ton code**. Pour chaque point, tu dois pouvoir l'expliquer sans notes :

- **Le trajet d'une requête** : clic React → `fetch` + token → route Express → middleware auth → service → repository →
  SQL → réponse JSON → mise à jour du cache React Query. Dessine-le, c'est la question n°1.
- **Authentification ou autorisation** : qui es-tu (token vérifié) / as-tu le droit (rôle). Ce qu'est un JWT (header.payload.signature),
  pourquoi on vérifie la signature et pourquoi on ne fait jamais confiance au client.
- **Mots de passe** : hachage bcrypt et sel, différence entre hachage et chiffrement.
- **Failles** : injection SQL (requêtes préparées), XSS (React échappe, danger de `dangerouslySetInnerHTML`), CSRF (token en
  header plutôt qu'en cookie), contrôle d'accès cassé, mass assignment. Pour chacune : comment ton appli s'en protège.
- **SQL** : MCD → MLD → MPD, cardinalités (un chauffeur a 0..n véhicules, un trajet a 0..n réservations), clés étrangères,
  jointures, transaction et propriétés ACID.
- **SQL ou NoSQL** : schéma fixe et relations contre documents souples. Pourquoi tu as mis *telle* donnée dans Mongo.
- **POO** : classe, instance, encapsulation (`private`), injection de dépendances (ton `UserService(repository)`), pourquoi des couches.
- **Front** : composant, props, state, hooks (`useState`, `useEffect`), responsive (breakpoints Tailwind), accessibilité de base.
- **Git** : branche, merge, pull request, pourquoi `develop`.

Exercice efficace : prends **une** fonctionnalité (« réserver un trajet ») et réécris toi-même, sans assistant, la route, le service,
le repository et le test. Si tu sais la refaire de zéro, tu sais l'expliquer.
