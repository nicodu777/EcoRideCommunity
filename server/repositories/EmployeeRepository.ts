/**
 * EmployeeRepository - Accès aux données des comptes employés.
 */
import { eq, desc } from "drizzle-orm";
import { employees, type Employee } from "@shared/schema";
import type { Database } from "../db/postgres";

export class EmployeeRepository {
  constructor(private readonly db: Database) {}

  async findById(id: number): Promise<Employee | undefined> {
    const [employee] = await this.db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async findByEmail(email: string): Promise<Employee | undefined> {
    const [employee] = await this.db.select().from(employees).where(eq(employees.email, email.toLowerCase()));
    return employee;
  }

  async findAll(): Promise<Employee[]> {
    return this.db.select().from(employees).orderBy(desc(employees.createdAt));
  }

  async create(data: Omit<typeof employees.$inferInsert, "id" | "createdAt">): Promise<Employee> {
    const [employee] = await this.db
      .insert(employees)
      .values({ ...data, email: data.email.toLowerCase() })
      .returning();
    return employee;
  }

  async setActive(id: number, isActive: boolean): Promise<Employee | undefined> {
    const [employee] = await this.db.update(employees).set({ isActive }).where(eq(employees.id, id)).returning();
    return employee;
  }

  async touchLastLogin(id: number): Promise<void> {
    await this.db.update(employees).set({ lastLoginAt: new Date() }).where(eq(employees.id, id));
  }
}
