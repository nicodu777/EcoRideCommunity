/**
 * userRoutes - Définition des routes API pour les utilisateurs
 * 
 * Ce fichier contient uniquement la définition des endpoints REST.
 * Toute la logique métier est déléguée au UserService.
 * 
 * Principe : Les routes sont "fines" - elles ne font que :
 * 1. Récupérer les paramètres de la requête
 * 2. Appeler le service approprié
 * 3. Formater et renvoyer la réponse
 */

import { Router, Request, Response } from "express";
import { userService } from "../services/UserService";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

// Création du routeur Express pour les utilisateurs
const router = Router();

/**
 * POST /api/users
 * Crée un nouvel utilisateur
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    // Validation des données avec Zod
    const userData = insertUserSchema.parse(req.body);
    
    // Appel du service métier
    const user = await userService.createUser(userData);
    
    res.status(201).json(user);
  } catch (error) {
    // Gestion des erreurs métier
    if (error instanceof Error && error.message === "USER_ALREADY_EXISTS") {
      return res.status(409).json({ message: "L'utilisateur existe déjà" });
    }
    
    // Erreur de validation Zod
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Données utilisateur invalides", 
        errors: error.errors 
      });
    }
    
    console.error("Erreur création utilisateur:", error);
    res.status(500).json({ message: "Erreur serveur interne" });
  }
});

/**
 * GET /api/users/firebase/:uid
 * Récupère un utilisateur par son UID Firebase
 * Crée automatiquement un profil par défaut si non existant
 */
router.get("/firebase/:uid", async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    
    // Récupération via le service (qui gère la logique admin)
    let user = await userService.getUserByFirebaseUid(uid);
    
    // Si l'utilisateur n'existe pas, créer un profil par défaut
    if (!user) {
      user = await userService.createDefaultUser(uid);
    }
    
    res.json(user);
  } catch (error) {
    console.error("Erreur récupération utilisateur Firebase:", error);
    res.status(500).json({ message: "Erreur serveur interne" });
  }
});

/**
 * GET /api/users/:id
 * Récupère un utilisateur par son ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide" });
    }
    
    const user = await userService.getUserById(id);
    
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    
    res.json(user);
  } catch (error) {
    console.error("Erreur récupération utilisateur:", error);
    res.status(500).json({ message: "Erreur serveur interne" });
  }
});

/**
 * PATCH /api/users/:id/role
 * Met à jour le rôle d'un utilisateur (admin uniquement)
 */
router.patch("/:id/role", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "ID invalide" });
    }
    
    const user = await userService.changeUserRole(userId, role);
    
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    
    res.json(user);
  } catch (error) {
    // Gestion des erreurs métier
    if (error instanceof Error && error.message === "INVALID_ROLE") {
      return res.status(400).json({ message: "Rôle invalide" });
    }
    
    console.error("Erreur mise à jour rôle:", error);
    res.status(500).json({ message: "Erreur serveur interne" });
  }
});

/**
 * PUT /api/users/:id
 * Met à jour les informations d'un utilisateur
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide" });
    }
    
    const user = await userService.updateUser(id, req.body);
    
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    
    res.json(user);
  } catch (error) {
    console.error("Erreur mise à jour utilisateur:", error);
    res.status(500).json({ message: "Erreur serveur interne" });
  }
});

export default router;
