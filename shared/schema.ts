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
  role: text("role").notNull().default("passenger"), // "driver" | "passenger" | "both"
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  totalRatings: integer("total_ratings").notNull().default(0),
  isVerified: boolean("is_verified").notNull().default(false),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  averageRating: true,
  totalRatings: true,
  isVerified: true,
  createdAt: true,
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  isActive: true,
  createdAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  status: true,
  createdAt: true,
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  createdAt: true,
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tripsAsDriver: many(trips),
  bookingsAsPassenger: many(bookings, { relationName: "passenger" }),
  ratingsGiven: many(ratings, { relationName: "rater" }),
  ratingsReceived: many(ratings, { relationName: "ratee" }),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  driver: one(users, {
    fields: [trips.driverId],
    references: [users.id],
  }),
  bookings: many(bookings),
  ratings: many(ratings),
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

// Extended types for API responses
export type TripWithDriver = Trip & {
  driver: Pick<User, 'id' | 'firstName' | 'lastName' | 'averageRating' | 'totalRatings'>;
};

export type BookingWithTrip = Booking & {
  trip: TripWithDriver;
};
