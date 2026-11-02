/**
 * ====================================================================
 * Middlewares d'authentification et d'autorisation
 * ====================================================================
 *
 * Authentification = « qui es-tu ? » → on vérifie le token.
 * Autorisation     = « as-tu le droit ? » → on vérifie le rôle / la permission.
 *
 * Règle d'or : l'identité de l'utilisateur vient UNIQUEMENT du token vérifié
 * (req.user), jamais d'un champ envoyé par le client (driverId, x-user-id...).
 * ====================================================================
 */
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { User, PublicEmployee } from "@shared/schema";
import type { TokenVerifier, VerifiedIdentity } from "../security/TokenVerifier";
import type { EmployeeTokenService } from "../security/EmployeeTokenService";
import type { UserRepository } from "../repositories/UserRepository";
import type { EmployeeRepository } from "../repositories/EmployeeRepository";
import { AppError } from "../errors/AppError";

// Ajout de nos propriétés au type Request d'Express
declare global {
  namespace Express {
    interface Request {
      identity?: VerifiedIdentity;  // identité Firebase vérifiée
      user?: User;                  // utilisateur EcoRide correspondant
      employee?: PublicEmployee;    // employé connecté
    }
  }
}

/** Extrait le token de l'en-tête « Authorization: Bearer <token> ». */
function readBearerToken(req: Request): string {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw AppError.unauthorized();
  return header.slice("Bearer ".length).trim();
}

export class AuthMiddlewares {
  constructor(
    private readonly tokenVerifier: TokenVerifier,
    private readonly userRepository: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly employeeTokens: EmployeeTokenService,
  ) {}

  /**
   * Vérifie seulement le token Firebase (utilisé à l'inscription,
   * quand le profil EcoRide n'existe pas encore).
   */
  verifyIdentity: RequestHandler = async (req, _res, next) => {
    try {
      const token = readBearerToken(req);
      req.identity = await this.tokenVerifier.verify(token).catch(() => {
        throw AppError.unauthorized("Token invalide ou expiré");
      });
      next();
    } catch (error) {
      next(error);
    }
  };

  /** Exige un utilisateur connecté, inscrit et non suspendu. */
  requireAuth: RequestHandler = async (req, res, next) => {
    this.verifyIdentity(req, res, async (error?: unknown) => {
      if (error) return next(error);
      try {
        const user = await this.userRepository.findByFirebaseUid(req.identity!.uid);
        if (!user) throw AppError.unauthorized("Profil EcoRide introuvable : terminez l'inscription");
        if (user.isSuspended) throw AppError.forbidden("Votre compte est suspendu");
        req.user = user;
        next();
      } catch (err) {
        next(err);
      }
    });
  };

  /** Exige un des rôles donnés (à placer APRÈS requireAuth). */
  requireRole(...roles: User["role"][]): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return next(AppError.forbidden());
      }
      next();
    };
  }

  /** Exige un employé connecté (JWT valide), avec éventuellement une permission. */
  requireEmployee(permission?: string): RequestHandler {
    return async (req: Request, _res: Response, next: NextFunction) => {
      try {
        const token = readBearerToken(req);
        let employeeId: number;
        try {
          employeeId = this.employeeTokens.verify(token);
        } catch {
          throw AppError.unauthorized("Session employé invalide ou expirée");
        }
        const employee = await this.employeeRepository.findById(employeeId);
        if (!employee || !employee.isActive) throw AppError.unauthorized("Employé non autorisé");
        if (permission && !employee.permissions.includes(permission)) {
          throw AppError.forbidden("Permission insuffisante");
        }
        const { password: _hash, ...publicEmployee } = employee;
        req.employee = publicEmployee;
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}
