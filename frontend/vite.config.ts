/**
 * Configuration Vite — Frontend EcoRide
 *
 * Je configure ici le serveur de développement React sur le port 5000.
 * Toutes les requêtes vers /api sont proxiées vers le backend Express
 * qui tourne sur le port 5001 en développement.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async ({ mode }) => ({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(mode === "development"
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer()
          ),
        ]
      : []),
  ],

  resolve: {
    alias: {
      // Composants et hooks React
      "@": path.resolve(import.meta.dirname, "src"),
      // Types partagés avec le backend (lecture seule, aucun code serveur inclus)
      "@shared": path.resolve(import.meta.dirname, "../backend/shared"),
      // Assets statiques (images, logos, etc.)
      "@assets": path.resolve(import.meta.dirname, "../attached_assets"),
    },
  },

  // La racine du projet frontend est ce dossier
  root: import.meta.dirname,

  build: {
    outDir: path.resolve(import.meta.dirname, "../dist/public"),
    emptyOutDir: true,
  },

  server: {
    // Port 5000 — seul port exposé dans l'environnement Replit
    port: 5000,
    host: "0.0.0.0",
    proxy: {
      // Toutes les requêtes /api sont redirigées vers le backend Express
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
    allowedHosts: "all",
    fs: {
      strict: false,
    },
  },
}));
