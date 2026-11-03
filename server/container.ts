/**
 * ====================================================================
 * Conteneur d'injection de dépendances
 * ====================================================================
 *
 * C'est ici, et seulement ici, qu'on assemble l'application :
 *   base de données -> repositories -> services -> middlewares
 *
 * Chaque classe reçoit ce dont elle a besoin dans son constructeur au lieu
 * de le créer elle-même. Avantage : dans les tests, on construit le même
 * conteneur avec une base de test et un faux vérificateur de token.
 * ====================================================================
 */
import type { Database } from "./db/postgres";
import type { TokenVerifier } from "./security/TokenVerifier";
import { EmployeeTokenService } from "./security/EmployeeTokenService";
import { UserRepository } from "./repositories/UserRepository";
import { VehicleRepository } from "./repositories/VehicleRepository";
import { TripRepository } from "./repositories/TripRepository";
import { BookingRepository } from "./repositories/BookingRepository";
import { RatingRepository } from "./repositories/RatingRepository";
import { TripIssueRepository } from "./repositories/TripIssueRepository";
import { EarningsRepository } from "./repositories/EarningsRepository";
import { EmployeeRepository } from "./repositories/EmployeeRepository";
import { ChatRepository } from "./repositories/ChatRepository";
import { NotificationRepository } from "./repositories/NotificationRepository";
import type { PreferenceRepository, AdminLogRepository } from "./repositories/PreferenceRepository";
import { createTransactionRunner } from "./services/TransactionRunner";
import { UserService } from "./services/UserService";
import { VehicleService } from "./services/VehicleService";
import { TripService } from "./services/TripService";
import { BookingService } from "./services/BookingService";
import { RatingService } from "./services/RatingService";
import { EmployeeService } from "./services/EmployeeService";
import { AdminService } from "./services/AdminService";
import { ChatService } from "./services/ChatService";
import { PreferenceService } from "./services/PreferenceService";
import { AuthMiddlewares } from "./middlewares/auth";

export interface ContainerOptions {
  db: Database;
  tokenVerifier: TokenVerifier;
  jwtSecret: string;
  preferenceRepository: PreferenceRepository;
  adminLogRepository: AdminLogRepository;
}

export function createContainer(options: ContainerOptions) {
  const { db } = options;
  const transaction = createTransactionRunner(db);

  // Couche accès aux données (SQL)
  const repositories = {
    users: new UserRepository(db),
    vehicles: new VehicleRepository(db),
    trips: new TripRepository(db),
    bookings: new BookingRepository(db),
    ratings: new RatingRepository(db),
    issues: new TripIssueRepository(db),
    earnings: new EarningsRepository(db),
    employees: new EmployeeRepository(db),
    chat: new ChatRepository(db),
    notifications: new NotificationRepository(db),
  };
  const r = repositories;
  const employeeTokens = new EmployeeTokenService(options.jwtSecret);

  // Couche métier
  const services = {
    users: new UserService(r.users),
    vehicles: new VehicleService(r.vehicles),
    trips: new TripService(r.trips, r.vehicles, r.bookings, r.users, r.ratings, r.notifications, options.preferenceRepository, transaction),
    bookings: new BookingService(r.bookings, r.trips, r.users, r.earnings, r.issues, transaction),
    ratings: new RatingService(r.ratings, r.bookings, r.trips, r.users),
    employees: new EmployeeService(r.employees, employeeTokens),
    admin: new AdminService(r.users, r.trips, r.earnings, options.adminLogRepository),
    chat: new ChatService(r.chat, r.trips, r.bookings),
    preferences: new PreferenceService(options.preferenceRepository),
  };

  const auth = new AuthMiddlewares(options.tokenVerifier, r.users, r.employees, employeeTokens);

  return { repositories, services, auth };
}

export type Container = ReturnType<typeof createContainer>;
