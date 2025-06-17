import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTripSchema, insertBookingSchema, insertRatingSchema } from "@shared/schema";
import { z } from "zod";

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
      // Convert date strings to Date objects
      const requestData = {
        ...req.body,
        departureTime: new Date(req.body.departureTime),
        arrivalTime: new Date(req.body.arrivalTime),
      };
      
      const tripData = insertTripSchema.parse(requestData);
      const trip = await storage.createTrip(tripData);
      res.status(201).json(trip);
    } catch (error) {
      console.error("Error creating trip:", error);
      res.status(400).json({ message: "Invalid trip data" });
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

  const httpServer = createServer(app);
  return httpServer;
}
