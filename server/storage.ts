import { users, trips, bookings, ratings, type User, type InsertUser, type Trip, type InsertTrip, type Booking, type InsertBooking, type Rating, type InsertRating, type TripWithDriver, type BookingWithTrip } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Trip operations
  getTrip(id: number): Promise<Trip | undefined>;
  getTripWithDriver(id: number): Promise<TripWithDriver | undefined>;
  getTripsByDriver(driverId: number): Promise<Trip[]>;
  searchTrips(departure: string, destination: string, date?: string): Promise<TripWithDriver[]>;
  getActiveTrips(): Promise<TripWithDriver[]>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: number, updates: Partial<Trip>): Promise<Trip | undefined>;
  deleteTrip(id: number): Promise<boolean>;
  
  // Booking operations
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByTrip(tripId: number): Promise<Booking[]>;
  getBookingsByPassenger(passengerId: number): Promise<BookingWithTrip[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, updates: Partial<Booking>): Promise<Booking | undefined>;
  
  // Rating operations
  getRatingsByRatee(rateeId: number): Promise<Rating[]>;
  createRating(rating: InsertRating): Promise<Rating>;
  updateUserRating(userId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trips: Map<number, Trip>;
  private bookings: Map<number, Booking>;
  private ratings: Map<number, Rating>;
  private currentUserId: number;
  private currentTripId: number;
  private currentBookingId: number;
  private currentRatingId: number;

  constructor() {
    this.users = new Map();
    this.trips = new Map();
    this.bookings = new Map();
    this.ratings = new Map();
    this.currentUserId = 1;
    this.currentTripId = 1;
    this.currentBookingId = 1;
    this.currentRatingId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.firebaseUid === firebaseUid);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      averageRating: "0",
      totalRatings: 0,
      isVerified: false,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Trip operations
  async getTrip(id: number): Promise<Trip | undefined> {
    return this.trips.get(id);
  }

  async getTripWithDriver(id: number): Promise<TripWithDriver | undefined> {
    const trip = this.trips.get(id);
    if (!trip) return undefined;
    
    const driver = this.users.get(trip.driverId);
    if (!driver) return undefined;
    
    return {
      ...trip,
      driver: {
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        averageRating: driver.averageRating,
        totalRatings: driver.totalRatings,
      },
    };
  }

  async getTripsByDriver(driverId: number): Promise<Trip[]> {
    return Array.from(this.trips.values()).filter(trip => trip.driverId === driverId);
  }

  async searchTrips(departure: string, destination: string, date?: string): Promise<TripWithDriver[]> {
    const trips = Array.from(this.trips.values()).filter(trip => {
      if (!trip.isActive) return false;
      
      const departureMatch = trip.departure.toLowerCase().includes(departure.toLowerCase());
      const destinationMatch = trip.destination.toLowerCase().includes(destination.toLowerCase());
      
      if (!departureMatch || !destinationMatch) return false;
      
      if (date) {
        const tripDate = trip.departureTime.toISOString().split('T')[0];
        if (tripDate !== date) return false;
      }
      
      return trip.availableSeats > 0;
    });

    const tripsWithDrivers: TripWithDriver[] = [];
    for (const trip of trips) {
      const driver = this.users.get(trip.driverId);
      if (driver) {
        tripsWithDrivers.push({
          ...trip,
          driver: {
            id: driver.id,
            firstName: driver.firstName,
            lastName: driver.lastName,
            averageRating: driver.averageRating,
            totalRatings: driver.totalRatings,
          },
        });
      }
    }

    return tripsWithDrivers;
  }

  async getActiveTrips(): Promise<TripWithDriver[]> {
    const activeTrips = Array.from(this.trips.values()).filter(trip => 
      trip.isActive && trip.availableSeats > 0
    );

    const tripsWithDrivers: TripWithDriver[] = [];
    for (const trip of activeTrips) {
      const driver = this.users.get(trip.driverId);
      if (driver) {
        tripsWithDrivers.push({
          ...trip,
          driver: {
            id: driver.id,
            firstName: driver.firstName,
            lastName: driver.lastName,
            averageRating: driver.averageRating,
            totalRatings: driver.totalRatings,
          },
        });
      }
    }

    return tripsWithDrivers.slice(0, 10); // Limit to 10 for homepage
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const id = this.currentTripId++;
    const trip: Trip = {
      ...insertTrip,
      id,
      isActive: true,
      createdAt: new Date(),
    };
    this.trips.set(id, trip);
    return trip;
  }

  async updateTrip(id: number, updates: Partial<Trip>): Promise<Trip | undefined> {
    const trip = this.trips.get(id);
    if (!trip) return undefined;
    
    const updatedTrip = { ...trip, ...updates };
    this.trips.set(id, updatedTrip);
    return updatedTrip;
  }

  async deleteTrip(id: number): Promise<boolean> {
    return this.trips.delete(id);
  }

  // Booking operations
  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByTrip(tripId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => booking.tripId === tripId);
  }

  async getBookingsByPassenger(passengerId: number): Promise<BookingWithTrip[]> {
    const userBookings = Array.from(this.bookings.values()).filter(
      booking => booking.passengerId === passengerId
    );

    const bookingsWithTrips: BookingWithTrip[] = [];
    for (const booking of userBookings) {
      const tripWithDriver = await this.getTripWithDriver(booking.tripId);
      if (tripWithDriver) {
        bookingsWithTrips.push({
          ...booking,
          trip: tripWithDriver,
        });
      }
    }

    return bookingsWithTrips;
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = this.currentBookingId++;
    const booking: Booking = {
      ...insertBooking,
      id,
      status: "pending",
      createdAt: new Date(),
    };
    this.bookings.set(id, booking);

    // Update available seats
    const trip = this.trips.get(booking.tripId);
    if (trip) {
      trip.availableSeats -= booking.seatsBooked;
      this.trips.set(trip.id, trip);
    }

    return booking;
  }

  async updateBooking(id: number, updates: Partial<Booking>): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking = { ...booking, ...updates };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  // Rating operations
  async getRatingsByRatee(rateeId: number): Promise<Rating[]> {
    return Array.from(this.ratings.values()).filter(rating => rating.rateeId === rateeId);
  }

  async createRating(insertRating: InsertRating): Promise<Rating> {
    const id = this.currentRatingId++;
    const rating: Rating = {
      ...insertRating,
      id,
      createdAt: new Date(),
    };
    this.ratings.set(id, rating);

    // Update user's average rating
    await this.updateUserRating(rating.rateeId);

    return rating;
  }

  async updateUserRating(userId: number): Promise<void> {
    const userRatings = await this.getRatingsByRatee(userId);
    const user = this.users.get(userId);
    
    if (!user || userRatings.length === 0) return;

    const totalRating = userRatings.reduce((sum, rating) => sum + rating.rating, 0);
    const averageRating = (totalRating / userRatings.length).toFixed(2);

    user.averageRating = averageRating;
    user.totalRatings = userRatings.length;
    this.users.set(userId, user);
  }
}

export const storage = new MemStorage();
