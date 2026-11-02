/**
 * Création et vérification des JWT des employés.
 *
 * Un JWT est composé de trois parties : en-tête.charge-utile.signature.
 * La signature (HMAC-SHA256 avec un secret connu du seul serveur) garantit
 * que la charge utile n'a pas été modifiée : un employé ne peut pas changer
 * son identifiant dans le token sans invalider la signature.
 *
 * Avant correction, le « token » était simplement l'ID de l'employé
 * (ex. "1"), ce qui permettait à n'importe qui d'usurper un compte.
 */
import jwt from "jsonwebtoken";
import { EMPLOYEE_TOKEN_TTL } from "../config/rules";

export interface EmployeeTokenPayload {
  sub: number;   // identifiant de l'employé
  type: "employee";
}

export class EmployeeTokenService {
  constructor(private readonly secret: string) {}

  sign(employeeId: number): string {
    return jwt.sign({ type: "employee" }, this.secret, {
      subject: String(employeeId),
      expiresIn: EMPLOYEE_TOKEN_TTL,
      algorithm: "HS256",
    });
  }

  /** Renvoie l'ID de l'employé, ou lève une erreur si le token est invalide/expiré. */
  verify(token: string): number {
    const payload = jwt.verify(token, this.secret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    if (payload.type !== "employee" || !payload.sub) throw new Error("Token employé invalide");
    return Number(payload.sub);
  }
}
