# ====================================================================
# Image Docker d'EcoRide - construction en deux étapes (multi-stage)
# ====================================================================
# 1. « build » : installe tout (dépendances de dev comprises) et compile
#    le front (Vite) et le serveur (esbuild) dans dist/
# 2. « runtime » : image finale légère avec seulement les dépendances de
#    production et le dossier dist/, exécutée avec un utilisateur non root
# ====================================================================

# ---------- Étape 1 : compilation ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Configuration Firebase du front : intégrée au JavaScript au moment du build
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

RUN npm run build

# ---------- Étape 2 : exécution ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=5000

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Sécurité : le processus ne tourne pas en root dans le conteneur
USER node

EXPOSE 5000
CMD ["node", "dist/index.js"]
