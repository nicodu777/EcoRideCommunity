/**
 * ====================================================================
 * Schéma de la base de données relationnelle (PostgreSQL) - Drizzle ORM
 * ====================================================================
 *
 * Ce fichier est la SOURCE UNIQUE DE VÉRITÉ du modèle de données :
 * - il sert à Drizzle pour générer des requêtes SQL typées et paramétrées
 *   (protection contre les injections SQL) ;
 * - le script `sql/schema.sql` en est la traduction SQL, utilisée par
 *   Docker pour créer la base.
 *
 * Données relationnelles (ici) : utilisateurs, véhicules, trajets,
 * réservations, avis, litiges, crédits gagnés par la plateforme...
 * Données NoSQL (MongoDB, voir server/repositories/PreferenceRepository.ts) :
 * préférences libres des chauffeurs et journal des actions admin.
 * ====================================================================
 */

import {
  pgTable, text, serial, integer, boolean, timestamp, decimal, date, check, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { z } from "zod";

// --------------------------------------------------------------------
// Valeurs autorisées (réutilisées par les validations Zod et le front)
// --------------------------------------------------------------------
export const USER_ROLES = ["passenger", "driver", "both", "admin"] as const;
export const ENERGY_TYPES = ["electric", "hybrid", "gasoline", "diesel"] as const;
export const TRIP_STATUSES = ["pending", "started", "completed", "cancelled"] as const;
export const BOOKING_STATUSES = [
  "confirmed",            // place réservée, crédits débités du passager
  "cancelled",            // annulée (par le passager ou le chauffeur), crédits remboursés
  "awaiting_validation",  // trajet terminé, le passager doit confirmer que tout s'est bien passé
  "validated",            // le passager a validé : le chauffeur a été payé
  "disputed",             // le passager a signalé un problème : un employé doit trancher
  "refunded",             // litige tranché en faveur du passager
] as const;
export const EMPLOYEE_PERMISSIONS = ["ratings", "trip_issues"] as const;

// --------------------------------------------------------------------
// Utilisateurs (passagers / chauffeurs / administrateur)
// --------------------------------------------------------------------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  firebaseUid: text("firebase_uid").notNull().unique(), // lien avec le compte Firebase Authentication
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("passenger"),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).notNull().default("0"),
  totalRatings: integer("total_ratings").notNull().default(0),
  credits: decimal("credits", { precision: 10, scale: 2 }).notNull().default("20.00"), // 20 crédits offerts à l'inscription
  isSuspended: boolean("is_suspended").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  check("users_role_check", sql`${t.role} IN ('passenger', 'driver', 'both', 'admin')`),
  check("users_credits_positive", sql`${t.credits} >= 0`), // un solde ne peut jamais être négatif
]);

// --------------------------------------------------------------------
// Véhicules : un chauffeur possède 0..n véhicules
// --------------------------------------------------------------------
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plate: text("plate").notNull().unique(),
  firstRegistrationDate: date("first_registration_date").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  color: text("color").notNull(),
  energy: text("energy").notNull(), // un trajet est « écologique » si energy = 'electric'
  seats: integer("seats").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  check("vehicles_energy_check", sql`${t.energy} IN ('electric', 'hybrid', 'gasoline', 'diesel')`),
  check("vehicles_seats_check", sql`${t.seats} BETWEEN 1 AND 8`),
]);

// --------------------------------------------------------------------
// Trajets (covoiturages) : un chauffeur propose 0..n trajets avec 1 véhicule
// --------------------------------------------------------------------
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "restrict" }),
  departure: text("departure").notNull(),
  destination: text("destination").notNull(),
  departureTime: timestamp("departure_time").notNull(),
  arrivalTime: timestamp("arrival_time").notNull(),
  availableSeats: integer("available_seats").notNull(),
  totalSeats: integer("total_seats").notNull(),
  pricePerSeat: decimal("price_per_seat", { precision: 10, scale: 2 }).notNull(), // en crédits
  description: text("description"),
  status: text("status").notNull().default("pending"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  check("trips_status_check", sql`${t.status} IN ('pending', 'started', 'completed', 'cancelled')`),
  check("trips_seats_check", sql`${t.availableSeats} >= 0 AND ${t.availableSeats} <= ${t.totalSeats}`),
  check("trips_price_check", sql`${t.pricePerSeat} > 2`), // le prix doit couvrir les 2 crédits de la plateforme
  check("trips_dates_check", sql`${t.arrivalTime} > ${t.departureTime}`),
  index("trips_search_idx").on(t.departure, t.destination, t.departureTime), // accélère la recherche
]);

// --------------------------------------------------------------------
// Réservations : un passager réserve 1..n places sur un trajet
// --------------------------------------------------------------------
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  passengerId: integer("passenger_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  seatsBooked: integer("seats_booked").notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("confirmed"),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  check("bookings_seats_check", sql`${t.seatsBooked} > 0`),
  check("bookings_status_check", sql`${t.status} IN ('confirmed', 'cancelled', 'awaiting_validation', 'validated', 'disputed', 'refunded')`),
]);

// --------------------------------------------------------------------
// Employés (comptes séparés, créés par l'administrateur)
// --------------------------------------------------------------------
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // hash bcrypt, jamais le mot de passe en clair
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  position: text("position").notNull(),
  permissions: text("permissions").array().notNull().default(sql`ARRAY[]::text[]`),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --------------------------------------------------------------------
// Avis : publiés seulement après validation par un employé
// --------------------------------------------------------------------
export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  raterId: integer("rater_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rateeId: integer("ratee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  isApproved: boolean("is_approved"), // null = en attente, true = publié, false = refusé
  reviewedBy: integer("reviewed_by").references(() => employees.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  check("ratings_value_check", sql`${t.rating} BETWEEN 1 AND 5`),
  uniqueIndex("ratings_one_per_trip").on(t.tripId, t.raterId), // un seul avis par passager et par trajet
]);

// --------------------------------------------------------------------
// Litiges : un passager signale qu'un trajet s'est mal passé
// --------------------------------------------------------------------
export const tripIssues = pgTable("trip_issues", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  reporterId: integer("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  issueDescription: text("issue_description").notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "resolved"
  decision: text("decision"), // "pay_driver" | "refund_passenger"
  handledBy: integer("handled_by").references(() => employees.id),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// --------------------------------------------------------------------
// Crédits gagnés par la plateforme (2 crédits par réservation payée)
// --------------------------------------------------------------------
export const platformEarnings = pgTable("platform_earnings", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull().defaultNow(),
});

// --------------------------------------------------------------------
// Messagerie entre participants d'un trajet
// --------------------------------------------------------------------
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --------------------------------------------------------------------
// Notifications (ex. : « votre trajet a été annulé par le chauffeur »)
// --------------------------------------------------------------------
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ====================================================================
// Relations Drizzle (utilisées pour les jointures typées)
// ====================================================================
export const usersRelations = relations(users, ({ many }) => ({
  vehicles: many(vehicles),
  tripsAsDriver: many(trips),
  bookings: many(bookings),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  owner: one(users, { fields: [vehicles.ownerId], references: [users.id] }),
  trips: many(trips),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  driver: one(users, { fields: [trips.driverId], references: [users.id] }),
  vehicle: one(vehicles, { fields: [trips.vehicleId], references: [vehicles.id] }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  trip: one(trips, { fields: [bookings.tripId], references: [trips.id] }),
  passenger: one(users, { fields: [bookings.passengerId], references: [users.id] }),
}));

// ====================================================================
// Schémas de validation Zod des données ENVOYÉES PAR LE CLIENT
// ====================================================================
// Principe de sécurité (anti « mass assignment ») : chaque schéma liste
// explicitement les seuls champs que le client a le droit d'envoyer.
// Les champs sensibles (id, crédits, rôle admin, statut, driverId...)
// ne sont JAMAIS lus dans le corps de la requête : ils viennent du token.

export const registerUserSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  phone: z.string().trim().max(20).optional(),
  role: z.enum(["passenger", "driver", "both"]), // impossible de s'inscrire « admin »
});

export const updateProfileSchema = registerUserSchema.partial();

export const insertVehicleSchema = z.object({
  plate: z.string().trim().min(4).max(15).transform((p) => p.toUpperCase()),
  firstRegistrationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : AAAA-MM-JJ"),
  brand: z.string().trim().min(1).max(50),
  model: z.string().trim().min(1).max(50),
  color: z.string().trim().min(1).max(30),
  energy: z.enum(ENERGY_TYPES),
  seats: z.coerce.number().int().min(1).max(8),
});

export const insertTripSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  departure: z.string().trim().min(1).max(100),
  destination: z.string().trim().min(1).max(100),
  departureTime: z.coerce.date(),
  arrivalTime: z.coerce.date(),
  totalSeats: z.coerce.number().int().min(1).max(8),
  pricePerSeat: z.coerce.number().gt(2, "Le prix doit être supérieur aux 2 crédits de la plateforme").max(500),
  description: z.string().trim().max(500).optional(),
}).refine((t) => t.arrivalTime > t.departureTime, {
  message: "L'arrivée doit être après le départ", path: ["arrivalTime"],
});

export const searchTripSchema = z.object({
  departure: z.string().trim().min(1),
  destination: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")), // "AAAA-MM-JJ"
  ecologicalOnly: z.boolean().optional(),  // filtre US4 : trajets en voiture électrique
  maxPrice: z.coerce.number().positive().optional(),
  maxDurationMinutes: z.coerce.number().int().positive().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
});

export const insertBookingSchema = z.object({
  tripId: z.coerce.number().int().positive(),
  seatsBooked: z.coerce.number().int().min(1).max(8),
  message: z.string().trim().max(300).nullish(),
});

export const insertRatingSchema = z.object({
  tripId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export const reportIssueSchema = z.object({
  description: z.string().trim().min(10, "Décrivez le problème (10 caractères minimum)").max(1000),
});

export const resolveIssueSchema = z.object({
  decision: z.enum(["pay_driver", "refund_passenger"]),
  resolution: z.string().trim().min(3).max(1000),
});

export const insertChatMessageSchema = z.object({
  tripId: z.coerce.number().int().positive(),
  message: z.string().trim().min(1).max(1000),
});

export const insertEmployeeSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "8 caractères minimum")
    .regex(/[A-Z]/, "Au moins une majuscule").regex(/[0-9]/, "Au moins un chiffre"),
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  phone: z.string().trim().max(20).optional(),
  position: z.string().trim().min(1).max(50).default("Support Client"),
  permissions: z.array(z.enum(EMPLOYEE_PERMISSIONS)).default(["ratings", "trip_issues"]),
});

export const employeeLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

// Préférences du chauffeur (stockées en NoSQL car leur structure est libre)
export const driverPreferencesSchema = z.object({
  smoker: z.boolean(),
  animals: z.boolean(),
  custom: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
});

// ====================================================================
// Types TypeScript dérivés du schéma
// ====================================================================
export type User = typeof users.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type TripIssue = typeof tripIssues.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

export type RegisterUser = z.infer<typeof registerUserSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type SearchTrip = z.infer<typeof searchTripSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type DriverPreferences = z.infer<typeof driverPreferencesSchema>;

/** Employé tel que renvoyé par l'API (sans le hash du mot de passe). */
export type PublicEmployee = Omit<Employee, "password">;

/** Trajet enrichi renvoyé par l'API (chauffeur + véhicule). */
export type TripWithDriver = Trip & {
  driver: Pick<User, "id" | "firstName" | "lastName" | "averageRating" | "totalRatings">;
  vehicle: Pick<Vehicle, "brand" | "model" | "color" | "energy">;
  isEcological: boolean;
};

export type BookingWithTrip = Booking & { trip: TripWithDriver };

/** Réponse de la recherche : si aucun trajet, on propose la date la plus proche (US3). */
export type SearchTripsResponse = {
  trips: TripWithDriver[];
  suggestedDate: string | null;
};

/** Détail d'un trajet (US5) : avis publiés et préférences du chauffeur. */
export type TripDetails = TripWithDriver & {
  reviews: Pick<Rating, "id" | "rating" | "comment" | "createdAt">[];
  driverPreferences: DriverPreferences | null;
};
