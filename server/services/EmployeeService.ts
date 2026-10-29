/**
 * EmployeeService - Comptes employés : création par l'admin et connexion.
 */
import bcrypt from "bcryptjs";
import type { Employee, PublicEmployee, InsertEmployee } from "@shared/schema";
import type { EmployeeRepository } from "../repositories/EmployeeRepository";
import type { EmployeeTokenService } from "../security/EmployeeTokenService";
import { AppError } from "../errors/AppError";

/** Coût du hachage bcrypt : 2^12 itérations, assez lent pour freiner une attaque par force brute. */
const BCRYPT_ROUNDS = 12;

/** Hash factice pour que la connexion prenne le même temps, que l'email existe ou non. */
const DUMMY_HASH = bcrypt.hashSync("ecoride-dummy-password", BCRYPT_ROUNDS);

export function toPublicEmployee(employee: Employee): PublicEmployee {
  const { password: _hash, ...rest } = employee;
  return rest;
}

export class EmployeeService {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly tokens: EmployeeTokenService,
  ) {}

  /**
   * Connexion employé. Le message d'erreur est identique que l'email soit
   * inconnu ou le mot de passe faux : on ne révèle pas quels comptes existent.
   */
  async login(email: string, password: string): Promise<{ token: string; employee: PublicEmployee }> {
    const employee = await this.employees.findByEmail(email);
    const passwordOk = await bcrypt.compare(password, employee?.password ?? DUMMY_HASH);
    if (!employee || !passwordOk || !employee.isActive) {
      throw AppError.unauthorized("Identifiants invalides");
    }
    await this.employees.touchLastLogin(employee.id);
    return { token: this.tokens.sign(employee.id), employee: toPublicEmployee(employee) };
  }

  /** US13 : l'administrateur crée un compte employé. */
  async create(adminId: number, data: InsertEmployee): Promise<PublicEmployee> {
    if (await this.employees.findByEmail(data.email)) {
      throw AppError.conflict("Un employé avec cet email existe déjà");
    }
    const employee = await this.employees.create({
      ...data,
      password: await bcrypt.hash(data.password, BCRYPT_ROUNDS), // on stocke le hash, jamais le mot de passe
      phone: data.phone ?? null,
      createdBy: adminId,
    });
    return toPublicEmployee(employee);
  }

  async list(): Promise<PublicEmployee[]> {
    return (await this.employees.findAll()).map(toPublicEmployee);
  }

  async setActive(employeeId: number, isActive: boolean): Promise<PublicEmployee> {
    const employee = await this.employees.setActive(employeeId, isActive);
    if (!employee) throw AppError.notFound("Employé introuvable");
    return toPublicEmployee(employee);
  }
}
