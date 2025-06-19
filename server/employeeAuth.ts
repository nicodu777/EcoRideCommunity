import bcrypt from 'bcryptjs';
import { storage } from './storage';
import { Request, Response, NextFunction } from 'express';

// Middleware pour l'authentification des employés
export const employeeAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token d\'authentification requis' });
    }

    const token = authHeader.substring(7);
    
    // Dans une vraie application, on décoderait un JWT ici
    // Pour la simplicité, on utilise l'ID de l'employé comme token
    const employeeId = parseInt(token);
    
    if (isNaN(employeeId)) {
      return res.status(401).json({ message: 'Token invalide' });
    }

    const employee = await storage.getEmployee(employeeId);
    if (!employee || !employee.isActive) {
      return res.status(401).json({ message: 'Employé non autorisé' });
    }

    // Ajouter l'employé à la requête
    (req as any).employee = employee;
    next();
  } catch (error) {
    console.error('Erreur d\'authentification employé:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Fonction pour hacher un mot de passe
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Fonction pour vérifier un mot de passe
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// Générer un token simple (dans une vraie app, utiliser JWT)
export const generateEmployeeToken = (employeeId: number): string => {
  return employeeId.toString();
};

// Vérifier les permissions
export const hasPermission = (employee: any, permission: string): boolean => {
  return employee.permissions.includes(permission) || employee.permissions.includes('all');
};