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
  // Stripe integration
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  // Profile enhancements
  bio: text("bio"),
  profilePicture: text("profile_picture"),
  // Gamification
  ecoPoints: integer("eco_points").notNull().default(0),
  badgeIds: text("badge_ids").array().notNull().default([]),
  // Preferences
  preferences: text("preferences"), // JSON string for user preferences

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
  // Enhanced location data
  departureCoordinates: text("departure_coordinates"), // JSON: {lat, lng}
  destinationCoordinates: text("destination_coordinates"), // JSON: {lat, lng}
  pickupPoints: text("pickup_points").array().default([]), // Array of pickup point descriptions
  // Recurring trips
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringDays: text("recurring_days").array().default([]), // ["monday", "tuesday", etc.]
  // Weather and preferences
  preferences: text("preferences"), // JSON: smoking, music, etc.
  weatherConditions: text("weather_conditions"),
  // AI predictions
  predictedPrice: decimal("predicted_price", { precision: 10, scale: 2 }),
  demandScore: integer("demand_score"), // 1-100
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

// Chat messages for real-time communication
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  senderId: integer("sender_id").notNull(),
  message: text("message").notNull(),
  messageType: text("message_type").notNull().default("text"), // "text" | "system" | "location"
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Notifications system
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // "trip_update" | "booking" | "payment" | "system"
  isRead: boolean("is_read").notNull().default(false),
  actionUrl: text("action_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User friends/contacts system
export const userFriends = pgTable("user_friends", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  friendId: integer("friend_id").notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "accepted" | "blocked"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Gamification badges
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  condition: text("condition").notNull(), // JSON describing how to earn this badge
  points: integer("points").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User achievements/badges earned
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  badgeId: integer("badge_id").notNull(),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

// Recurring trip schedules
export const recurringTrips = pgTable("recurring_trips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  departure: text("departure").notNull(),
  destination: text("destination").notNull(),
  departureTime: text("departure_time").notNull(), // Time in HH:mm format
  daysOfWeek: text("days_of_week").array().notNull(), // ["monday", "tuesday", etc.]
  isActive: boolean("is_active").notNull().default(true),
  lastCreatedAt: timestamp("last_created_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Payment transactions
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  userId: integer("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("EUR"),
  status: text("status").notNull(), // "pending" | "completed" | "failed" | "refunded"
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  metadata: text("metadata"), // JSON for additional payment info
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Analytics data for AI predictions
export const tripAnalytics = pgTable("trip_analytics", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  viewCount: integer("view_count").notNull().default(0),
  bookingAttempts: integer("booking_attempts").notNull().default(0),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 4 }),
  avgResponseTime: integer("avg_response_time"), // in minutes
  popularityScore: integer("popularity_score"), // 1-100
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Reports and moderation tables
export const userReports = pgTable("user_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull().references(() => users.id),
  reportedUserId: integer("reported_user_id").notNull().references(() => users.id),
  tripId: integer("trip_id").references(() => trips.id),
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminActions = pgTable("admin_actions", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table pour les comptes employés
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // Hash du mot de passe
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  position: text("position").notNull(), // Poste/fonction
  permissions: text("permissions").array().notNull().default([]), // Permissions spécifiques
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull().references(() => users.id), // ID de l'admin qui a créé le compte
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schemas
// Additional insert schemas for new tables
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export const insertUserFriendSchema = createInsertSchema(userFriends).omit({
  id: true,
  createdAt: true,
});

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
});

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  earnedAt: true,
});

export const insertRecurringTripSchema = createInsertSchema(recurringTrips).omit({
  id: true,
  lastCreatedAt: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertTripAnalyticsSchema = createInsertSchema(tripAnalytics).omit({
  id: true,
  updatedAt: true,
});

export const insertUserReportSchema = createInsertSchema(userReports).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export const insertAdminActionSchema = createInsertSchema(adminActions).omit({
  id: true,
  createdAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  averageRating: true,
  totalRatings: true,
  credits: true,
  isVerified: true,
  isSuspended: true,
  ecoPoints: true,
  badgeIds: true,
  createdAt: true,
});

export const insertTripSchemaEnhanced = createInsertSchema(trips).omit({
  id: true,
  isActive: true,
  status: true,
  startedAt: true,
  completedAt: true,
  isRecurring: true,
  recurringDays: true,
  departureCoordinates: true,
  destinationCoordinates: true,
  pickupPoints: true,
  preferences: true,
  weatherConditions: true,
  predictedPrice: true,
  demandScore: true,
  createdAt: true,
});

// Export the original simpler version for backward compatibility
export const insertTripSchema = insertTripSchemaEnhanced.pick({
  driverId: true,
  departure: true,
  destination: true,
  departureTime: true,
  arrivalTime: true,
  availableSeats: true,
  totalSeats: true,
  pricePerSeat: true,
  description: true,
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
  sentMessages: many(chatMessages, { relationName: "sender" }),
  notifications: many(notifications),
  friendsInitiated: many(userFriends, { relationName: "user" }),
  friendsReceived: many(userFriends, { relationName: "friend" }),
  badges: many(userBadges),
  recurringTrips: many(recurringTrips),
  payments: many(payments),
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
  chatMessages: many(chatMessages),
  analytics: one(tripAnalytics),
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

// New types for additional tables
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UserFriend = typeof userFriends.$inferSelect;
export type InsertUserFriend = z.infer<typeof insertUserFriendSchema>;
export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type RecurringTrip = typeof recurringTrips.$inferSelect;
export type InsertRecurringTrip = z.infer<typeof insertRecurringTripSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type TripAnalytics = typeof tripAnalytics.$inferSelect;
export type InsertTripAnalytics = z.infer<typeof insertTripAnalyticsSchema>;

export type UserReport = typeof userReports.$inferSelect;
export type InsertUserReport = z.infer<typeof insertUserReportSchema>;

export type AdminAction = typeof adminActions.$inferSelect;
export type InsertAdminAction = z.infer<typeof insertAdminActionSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

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
