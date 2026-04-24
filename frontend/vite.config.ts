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

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "../backend/shared"),
      "@assets": path.resolve(import.meta.dirname, "../attached_assets"),
    },
  },

  root: import.meta.dirname,

  build: {
    outDir: path.resolve(import.meta.dirname, "../dist/public"),
    emptyOutDir: true,
  },

  server: {
    port: 5000,
    host: "0.0.0.0",
    allowedHosts: "all",
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
      "/ws": {
        target: "http://localhost:5001",
        ws: true,
        changeOrigin: true,
      },
    },
    fs: {
      strict: false,
      allow: [
        path.resolve(import.meta.dirname, ".."),
      ],
    },
  },
});
