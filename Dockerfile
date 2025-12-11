# ====================================================================
# Dockerfile pour EcoRide (monorepo Node.js)
# ====================================================================
# 
# Ce fichier permet de conteneuriser l'application EcoRide
# pour un déploiement facile sur n'importe quel environnement.
#
# Construction : docker build -t ecoride .
# Exécution    : docker run -p 3000:3000 ecoride
# ====================================================================

FROM node:20-alpine

# Dossier de travail dans le conteneur
WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie du reste du projet
COPY . .

# Variables d'environnement de base (adaptables)
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=postgres://ecoride:ecoride@db:5432/ecoride

# Exposition des ports (API + éventuel front en dev)
EXPOSE 3000
EXPOSE 5173

# Commande de démarrage
CMD ["npm", "run", "dev"]
