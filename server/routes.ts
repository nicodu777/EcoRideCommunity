import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTripSchema, insertBookingSchema, insertRatingSchema, insertChatMessageSchema } from "@shared/schema";
import { z } from "zod";
import { wsManager } from "./websocket";

const searchTripSchema = z.object({
  departure: z.string().min(1),
  destination: z.string().min(1),
  date: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByFirebaseUid(userData.firebaseUid);
      
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.get("/api/users/firebase/:uid", async (req, res) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.params.uid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Trip routes
  app.get("/api/trips", async (req, res) => {
    try {
      const trips = await storage.getActiveTrips();
      res.json(trips);
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/trips/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const trip = await storage.getTripWithDriver(id);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      res.json(trip);
    } catch (error) {
      console.error("Error fetching trip:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/trips/search", async (req, res) => {
    try {
      const { departure, destination, date } = searchTripSchema.parse(req.body);
      const trips = await storage.searchTrips(departure, destination, date);
      res.json(trips);
    } catch (error) {
      console.error("Error searching trips:", error);
      res.status(400).json({ message: "Invalid search parameters" });
    }
  });

  app.post("/api/trips", async (req, res) => {
    try {
      console.log("Creating trip with data:", req.body);
      
      // Validation simple avant parsing
      if (!req.body.driverId || !req.body.departure || !req.body.destination) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Convert date strings to Date objects and price to string
      const requestData = {
        ...req.body,
        departureTime: new Date(req.body.departureTime),
        arrivalTime: new Date(req.body.arrivalTime),
        pricePerSeat: String(req.body.pricePerSeat),
      };
      
      const tripData = insertTripSchema.parse(requestData);
      const trip = await storage.createTrip(tripData);
      console.log("Trip created successfully:", trip);
      res.status(201).json(trip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
      }
      console.error("Error creating trip:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/trips/driver/:driverId", async (req, res) => {
    try {
      const driverId = parseInt(req.params.driverId);
      const trips = await storage.getTripsByDriver(driverId);
      res.json(trips);
    } catch (error) {
      console.error("Error fetching driver trips:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/trips/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const trip = await storage.updateTrip(id, updates);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      res.json(trip);
    } catch (error) {
      console.error("Error updating trip:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/trips/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTrip(id);
      if (!deleted) {
        return res.status(404).json({ message: "Trip not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting trip:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Booking routes
  app.post("/api/bookings", async (req, res) => {
    try {
      // Convert totalPrice to string if it's a number
      if (req.body.totalPrice && typeof req.body.totalPrice === 'number') {
        req.body.totalPrice = req.body.totalPrice.toString();
      }
      
      const bookingData = insertBookingSchema.parse(req.body);
      
      // Check if trip exists and has available seats
      const trip = await storage.getTrip(bookingData.tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      if (trip.availableSeats < bookingData.seatsBooked) {
        return res.status(400).json({ message: "Not enough available seats" });
      }

      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(400).json({ message: "Invalid booking data" });
    }
  });

  app.get("/api/bookings/passenger/:passengerId", async (req, res) => {
    try {
      const passengerId = parseInt(req.params.passengerId);
      const bookings = await storage.getBookingsByPassenger(passengerId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching passenger bookings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/bookings/trip/:tripId", async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const bookings = await storage.getBookingsByTrip(tripId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching trip bookings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/bookings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const booking = await storage.updateBooking(id, updates);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Rating routes
  app.post("/api/ratings", async (req, res) => {
    try {
      const ratingData = insertRatingSchema.parse(req.body);
      const rating = await storage.createRating(ratingData);
      res.status(201).json(rating);
    } catch (error) {
      console.error("Error creating rating:", error);
      res.status(400).json({ message: "Invalid rating data" });
    }
  });

  app.get("/api/ratings/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const ratings = await storage.getRatingsByRatee(userId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching user ratings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Trip management routes for drivers
  app.put("/api/trips/:id/start", async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      const driverId = parseInt(req.body.driverId);
      const trip = await storage.startTrip(tripId, driverId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found or unauthorized" });
      }
      
      res.json(trip);
    } catch (error) {
      console.error("Error starting trip:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/trips/:id/complete", async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      const driverId = parseInt(req.body.driverId);
      const trip = await storage.completeTrip(tripId, driverId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found or unauthorized" });
      }
      
      res.json(trip);
    } catch (error) {
      console.error("Error completing trip:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Trip issues routes
  app.post("/api/trip-issues", async (req, res) => {
    try {
      const issueData = req.body;
      const issue = await storage.createTripIssue(issueData);
      res.status(201).json(issue);
    } catch (error) {
      console.error("Error creating trip issue:", error);
      res.status(400).json({ message: "Invalid issue data" });
    }
  });

  app.get("/api/trip-issues", async (req, res) => {
    try {
      const issues = await storage.getTripIssues();
      res.json(issues);
    } catch (error) {
      console.error("Error fetching trip issues:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/trip-issues/:id/resolve", async (req, res) => {
    try {
      const issueId = parseInt(req.params.id);
      const { employeeId, resolution } = req.body;
      const issue = await storage.resolveTripIssue(issueId, employeeId, resolution);
      
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      
      res.json(issue);
    } catch (error) {
      console.error("Error resolving trip issue:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Rating management routes for employees
  app.get("/api/ratings/pending", async (req, res) => {
    try {
      const ratings = await storage.getPendingRatings();
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching pending ratings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/ratings/:id/approve", async (req, res) => {
    try {
      const ratingId = parseInt(req.params.id);
      const employeeId = parseInt(req.body.employeeId);
      const rating = await storage.approveRating(ratingId, employeeId);
      
      if (!rating) {
        return res.status(404).json({ message: "Rating not found" });
      }
      
      res.json(rating);
    } catch (error) {
      console.error("Error approving rating:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/ratings/:id/reject", async (req, res) => {
    try {
      const ratingId = parseInt(req.params.id);
      const employeeId = parseInt(req.body.employeeId);
      const rating = await storage.rejectRating(ratingId, employeeId);
      
      if (!rating) {
        return res.status(404).json({ message: "Rating not found" });
      }
      
      res.json(rating);
    } catch (error) {
      console.error("Error rejecting rating:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/users/:id/suspend", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const success = await storage.suspendUser(userId);
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User suspended successfully" });
    } catch (error) {
      console.error("Error suspending user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/analytics/daily-trips", async (req, res) => {
    try {
      const data = await storage.getDailyTripCounts();
      res.json(data);
    } catch (error) {
      console.error("Error fetching daily trip counts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/analytics/daily-earnings", async (req, res) => {
    try {
      const data = await storage.getDailyEarnings();
      res.json(data);
    } catch (error) {
      console.error("Error fetching daily earnings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/analytics/total-earnings", async (req, res) => {
    try {
      const total = await storage.getTotalEarnings();
      res.json({ total });
    } catch (error) {
      console.error("Error fetching total earnings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User reports and admin actions routes
  app.get("/api/admin/reports", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.sendStatus(403);
    }
    
    try {
      const reports = await storage.getUserReports();
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching reports: " + error.message });
    }
  });

  app.post("/api/admin/reports/:id/review", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.sendStatus(403);
    }
    
    try {
      const { id } = req.params;
      const { status, resolution } = req.body;
      
      const report = await storage.reviewUserReport(
        parseInt(id), 
        req.user.id, 
        status, 
        resolution
      );
      
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ message: "Error reviewing report: " + error.message });
    }
  });

  app.get("/api/admin/actions", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.sendStatus(403);
    }
    
    try {
      const actions = await storage.getAdminActions();
      res.json(actions);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching admin actions: " + error.message });
    }
  });

  // Chat message routes
  app.get("/api/chat/trip/:tripId", async (req, res) => {
    try {
      const tripId = parseInt(req.params.tripId);
      const messages = await storage.getMessagesByTrip(tripId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching trip messages:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/chat/messages", async (req, res) => {
    try {
      const messageData = insertChatMessageSchema.parse(req.body);
      const message = await storage.createChatMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // Chat routes pour les conversations
  app.get("/api/chat/conversations/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Récupérer tous les trajets où l'utilisateur est impliqué (conducteur ou passager)
      const userBookings = await storage.getBookingsByPassenger(userId);
      const userTrips = await storage.getTripsByDriver(userId);
      
      const conversations = [];
      
      // Conversations basées sur les réservations (utilisateur = passager)
      const processedTripIds = new Set();
      for (const booking of userBookings) {
        if (processedTripIds.has(booking.tripId)) continue;
        processedTripIds.add(booking.tripId);
        
        const trip = await storage.getTripWithDriver(booking.tripId);
        if (trip) {
          // Récupérer le dernier message pour ce trajet
          const messages = await storage.getMessagesByTrip(booking.tripId);
          const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
          
          // Compter les messages non lus
          const unreadCount = messages.filter(msg => 
            msg.senderId !== userId && !msg.isRead
          ).length;
          
          conversations.push({
            tripId: booking.tripId,
            tripInfo: {
              departure: trip.departure,
              destination: trip.destination,
              departureTime: trip.departureTime,
              driverName: `${trip.driver.firstName} ${trip.driver.lastName}`
            },
            lastMessage: lastMessage ? {
              message: lastMessage.message,
              senderName: lastMessage.senderId === userId ? "Vous" : `${trip.driver.firstName} ${trip.driver.lastName}`,
              createdAt: lastMessage.createdAt
            } : null,
            unreadCount
          });
        }
      }
      
      // Conversations basées sur les trajets (utilisateur = conducteur)
      for (const trip of userTrips) {
        if (processedTripIds.has(trip.id)) continue;
        processedTripIds.add(trip.id);
        
        const bookings = await storage.getBookingsByTrip(trip.id);
        if (bookings.length > 0) {
          // Récupérer le dernier message pour ce trajet
          const messages = await storage.getMessagesByTrip(trip.id);
          const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
          
          // Compter les messages non lus
          const unreadCount = messages.filter(msg => 
            msg.senderId !== userId && !msg.isRead
          ).length;
          
          // Obtenir le nom du premier passager pour l'affichage
          const firstBooking = bookings[0];
          const passenger = await storage.getUser(firstBooking.passengerId);
          
          conversations.push({
            tripId: trip.id,
            tripInfo: {
              departure: trip.departure,
              destination: trip.destination,
              departureTime: trip.departureTime,
              driverName: passenger ? `${passenger.firstName} ${passenger.lastName}` : "Passager"
            },
            lastMessage: lastMessage ? {
              message: lastMessage.message,
              senderName: lastMessage.senderId === userId ? "Vous" : (passenger ? `${passenger.firstName} ${passenger.lastName}` : "Passager"),
              createdAt: lastMessage.createdAt
            } : null,
            unreadCount
          });
        }
      }
      
      // Trier par date du dernier message (plus récent en premier)
      conversations.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
      });
      
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/chat/unread-count/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Récupérer tous les trajets où l'utilisateur est impliqué
      const userBookings = await storage.getBookingsByPassenger(userId);
      const userTrips = await storage.getTripsByDriver(userId);
      
      let totalUnread = 0;
      
      // Compter les messages non lus dans les trajets où l'utilisateur est passager
      for (const booking of userBookings) {
        const messages = await storage.getMessagesByTrip(booking.tripId);
        totalUnread += messages.filter(msg => 
          msg.senderId !== userId && !msg.isRead
        ).length;
      }
      
      // Compter les messages non lus dans les trajets où l'utilisateur est conducteur
      for (const trip of userTrips) {
        const messages = await storage.getMessagesByTrip(trip.id);
        totalUnread += messages.filter(msg => 
          msg.senderId !== userId && !msg.isRead
        ).length;
      }
      
      res.json(totalUnread);
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  wsManager.init(httpServer);
  return httpServer;
}
