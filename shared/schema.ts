import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("passenger"), // "driver" | "passenger" | "both" | "employee" | "admin"
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  totalRatings: integer("total_ratings").notNull().default(0),
  credits: decimal("credits", { precision: 10, scale: 2 }).notNull().default("0.00"),
  isVerified: boolean("is_verified").notNull().default(false),
  isSuspended: boolean("is_suspended").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull(),
  departure: text("departure").notNull(),
  destination: text("destination").notNull(),
  departureTime: timestamp("departure_time").notNull(),
  arrivalTime: timestamp("arrival_time").notNull(),
  availableSeats: integer("available_seats").notNull(),
  totalSeats: integer("total_seats").notNull(),
  pricePerSeat: decimal("price_per_seat", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  status: text("status").notNull().default("pending"), // "pending" | "started" | "completed" | "cancelled"
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  passengerId: integer("passenger_id").notNull(),
  seatsBooked: integer("seats_booked").notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "confirmed" | "cancelled" | "completed"
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  raterId: integer("rater_id").notNull(),
  rateeId: integer("ratee_id").notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  isApproved: boolean("is_approved"), // null = pending, true = approved, false = rejected
  reviewedBy: integer("reviewed_by"), // employee who reviewed
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// New table for trip issues/complaints
export const tripIssues = pgTable("trip_issues", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  reporterId: integer("reporter_id").notNull(),
  issueDescription: text("issue_description").notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "resolved" | "investigating"
  handledBy: integer("handled_by"), // employee ID
  resolution: text("resolution"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Platform credits/earnings tracking
export const platformEarnings = pgTable("platform_earnings", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  averageRating: true,
  totalRatings: true,
  credits: true,
  isVerified: true,
  isSuspended: true,
  createdAt: true,
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  isActive: true,
  status: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  status: true,
  createdAt: true,
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  isApproved: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
});

export const insertTripIssueSchema = createInsertSchema(tripIssues).omit({
  id: true,
  status: true,
  handledBy: true,
  resolution: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertPlatformEarningsSchema = createInsertSchema(platformEarnings).omit({
  id: true,
  date: true,
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tripsAsDriver: many(trips),
  bookingsAsPassenger: many(bookings, { relationName: "passenger" }),
  ratingsGiven: many(ratings, { relationName: "rater" }),
  ratingsReceived: many(ratings, { relationName: "ratee" }),
  issuesReported: many(tripIssues, { relationName: "reporter" }),
  ratingsReviewed: many(ratings, { relationName: "reviewer" }),
  issuesHandled: many(tripIssues, { relationName: "handler" }),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  driver: one(users, {
    fields: [trips.driverId],
    references: [users.id],
  }),
  bookings: many(bookings),
  ratings: many(ratings),
  issues: many(tripIssues),
  earnings: many(platformEarnings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  trip: one(trips, {
    fields: [bookings.tripId],
    references: [trips.id],
  }),
  passenger: one(users, {
    fields: [bookings.passengerId],
    references: [users.id],
    relationName: "passenger",
  }),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  trip: one(trips, {
    fields: [ratings.tripId],
    references: [trips.id],
  }),
  rater: one(users, {
    fields: [ratings.raterId],
    references: [users.id],
    relationName: "rater",
  }),
  ratee: one(users, {
    fields: [ratings.rateeId],
    references: [users.id],
    relationName: "ratee",
  }),
  reviewer: one(users, {
    fields: [ratings.reviewedBy],
    references: [users.id],
    relationName: "reviewer",
  }),
}));

export const tripIssuesRelations = relations(tripIssues, ({ one }) => ({
  trip: one(trips, {
    fields: [tripIssues.tripId],
    references: [trips.id],
  }),
  reporter: one(users, {
    fields: [tripIssues.reporterId],
    references: [users.id],
    relationName: "reporter",
  }),
  handler: one(users, {
    fields: [tripIssues.handledBy],
    references: [users.id],
    relationName: "handler",
  }),
}));

export const platformEarningsRelations = relations(platformEarnings, ({ one }) => ({
  trip: one(trips, {
    fields: [platformEarnings.tripId],
    references: [trips.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Rating = typeof ratings.$inferSelect;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type TripIssue = typeof tripIssues.$inferSelect;
export type InsertTripIssue = z.infer<typeof insertTripIssueSchema>;
export type PlatformEarnings = typeof platformEarnings.$inferSelect;
export type InsertPlatformEarnings = z.infer<typeof insertPlatformEarningsSchema>;

// Extended types for API responses
export type TripWithDriver = Trip & {
  driver: Pick<User, 'id' | 'firstName' | 'lastName' | 'averageRating' | 'totalRatings'>;
};

export type BookingWithTrip = Booking & {
  trip: TripWithDriver;
};

export type TripWithDetails = Trip & {
  driver: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'>;
  bookings: (Booking & {
    passenger: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  })[];
};
