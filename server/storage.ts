import { users, trips, bookings, ratings, type User, type InsertUser, type Trip, type InsertTrip, type Booking, type InsertBooking, type Rating, type InsertRating, type TripWithDriver, type BookingWithTrip } from "@shared/schema";
import { db } from "./db";
import { eq, and, like, sql } from "drizzle-orm";

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
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create sample drivers
    const drivers = [
      {
        id: this.currentUserId++,
        firebaseUid: "driver1",
        email: "marie.dubois@email.com",
        firstName: "Marie",
        lastName: "Dubois",
        phone: "06 12 34 56 78",
        role: "driver",
        averageRating: "4.8",
        totalRatings: 24,
        isVerified: true,
        createdAt: new Date(),
      },
      {
        id: this.currentUserId++,
        firebaseUid: "driver2", 
        email: "pierre.martin@email.com",
        firstName: "Pierre",
        lastName: "Martin",
        phone: "06 23 45 67 89",
        role: "driver",
        averageRating: "4.6",
        totalRatings: 18,
        isVerified: true,
        createdAt: new Date(),
      },
      {
        id: this.currentUserId++,
        firebaseUid: "driver3",
        email: "sophie.bernard@email.com", 
        firstName: "Sophie",
        lastName: "Bernard",
        phone: "06 34 56 78 90",
        role: "driver",
        averageRating: "4.9",
        totalRatings: 31,
        isVerified: true,
        createdAt: new Date(),
      },
      {
        id: this.currentUserId++,
        firebaseUid: "driver4",
        email: "julien.petit@email.com",
        firstName: "Julien", 
        lastName: "Petit",
        phone: "06 45 67 89 01",
        role: "driver",
        averageRating: "4.7",
        totalRatings: 15,
        isVerified: true,
        createdAt: new Date(),
      }
    ];

    // Add drivers to storage
    drivers.forEach(driver => {
      this.users.set(driver.id, driver);
    });

    // Create sample trips
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const sampleTrips = [
      // Paris-Lyon trips
      {
        id: this.currentTripId++,
        driverId: drivers[0].id,
        departure: "Paris",
        destination: "Lyon", 
        departureTime: new Date(tomorrow.getTime() + 8 * 60 * 60 * 1000), // 8h tomorrow
        arrivalTime: new Date(tomorrow.getTime() + 12 * 60 * 60 * 1000), // 12h tomorrow
        availableSeats: 3,
        totalSeats: 4,
        pricePerSeat: "25",
        description: "Trajet confortable avec pause déjeuner à Mâcon. Véhicule récent et climatisé.",
        isActive: true,
        createdAt: now,
      },
      {
        id: this.currentTripId++,
        driverId: drivers[1].id,
        departure: "Paris",
        destination: "Lyon",
        departureTime: new Date(dayAfter.getTime() + 14 * 60 * 60 * 1000), // 14h day after
        arrivalTime: new Date(dayAfter.getTime() + 18 * 60 * 60 * 1000), // 18h day after  
        availableSeats: 2,
        totalSeats: 3,
        pricePerSeat: "30",
        description: "Départ depuis Gare de Lyon. Conduite souple, musique au choix des passagers.",
        isActive: true,
        createdAt: now,
      },
      // Lyon-Paris trips
      {
        id: this.currentTripId++,
        driverId: drivers[2].id,
        departure: "Lyon",
        destination: "Paris",
        departureTime: new Date(tomorrow.getTime() + 16 * 60 * 60 * 1000), // 16h tomorrow
        arrivalTime: new Date(tomorrow.getTime() + 20 * 60 * 60 * 1000), // 20h tomorrow
        availableSeats: 1,
        totalSeats: 4, 
        pricePerSeat: "28",
        description: "Trajet direct sans arrêt. Départ de Lyon Part-Dieu, arrivée Porte d'Italie.",
        isActive: true,
        createdAt: now,
      },
      // Paris-Marseille trips
      {
        id: this.currentTripId++,
        driverId: drivers[0].id,
        departure: "Paris", 
        destination: "Marseille",
        departureTime: new Date(nextWeek.getTime() + 6 * 60 * 60 * 1000), // 6h next week
        arrivalTime: new Date(nextWeek.getTime() + 15 * 60 * 60 * 1000), // 15h next week
        availableSeats: 2,
        totalSeats: 4,
        pricePerSeat: "45",
        description: "Trajet avec pause déjeuner à Avignon. Vue sur la mer à l'arrivée !",
        isActive: true, 
        createdAt: now,
      },
      // Toulouse-Paris trips
      {
        id: this.currentTripId++,
        driverId: drivers[3].id,
        departure: "Toulouse",
        destination: "Paris",
        departureTime: new Date(dayAfter.getTime() + 7 * 60 * 60 * 1000), // 7h day after
        arrivalTime: new Date(dayAfter.getTime() + 14 * 60 * 60 * 1000), // 14h day after
        availableSeats: 3,
        totalSeats: 4,
        pricePerSeat: "35",
        description: "Trajet matinal avec petit-déjeuner offert. Wifi gratuit dans le véhicule.",
        isActive: true,
        createdAt: now,
      },
      // Bordeaux-Lyon trips  
      {
        id: this.currentTripId++,
        driverId: drivers[1].id,
        departure: "Bordeaux",
        destination: "Lyon", 
        departureTime: new Date(tomorrow.getTime() + 9 * 60 * 60 * 1000), // 9h tomorrow
        arrivalTime: new Date(tomorrow.getTime() + 15 * 60 * 60 * 1000), // 15h tomorrow
        availableSeats: 4,
        totalSeats: 4,
        pricePerSeat: "40",
        description: "Premier trajet ! Véhicule spacieux, arrêt prévu à Limoges.",
        isActive: true,
        createdAt: now,
      },
      // Nice-Paris trips
      {
        id: this.currentTripId++,
        driverId: drivers[2].id,
        departure: "Nice",
        destination: "Paris",
        departureTime: new Date(nextWeek.getTime() + 10 * 60 * 60 * 1000), // 10h next week  
        arrivalTime: new Date(nextWeek.getTime() + 19 * 60 * 60 * 1000), // 19h next week
        availableSeats: 1,
        totalSeats: 3,
        pricePerSeat: "50",
        description: "Trajet panoramique le long de la côte puis autoroutes. Très bon conducteur.",
        isActive: true,
        createdAt: now,
      }
    ];

    // Add trips to storage
    sampleTrips.forEach(trip => {
      this.trips.set(trip.id, trip);
    });
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

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getTrip(id: number): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    return trip || undefined;
  }

  async getTripWithDriver(id: number): Promise<TripWithDriver | undefined> {
    const result = await db
      .select({
        id: trips.id,
        driverId: trips.driverId,
        departure: trips.departure,
        destination: trips.destination,
        departureTime: trips.departureTime,
        arrivalTime: trips.arrivalTime,
        availableSeats: trips.availableSeats,
        totalSeats: trips.totalSeats,
        pricePerSeat: trips.pricePerSeat,
        description: trips.description,
        isActive: trips.isActive,
        createdAt: trips.createdAt,
        driver: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          averageRating: users.averageRating,
          totalRatings: users.totalRatings,
        },
      })
      .from(trips)
      .innerJoin(users, eq(trips.driverId, users.id))
      .where(eq(trips.id, id));

    return result[0] || undefined;
  }

  async getTripsByDriver(driverId: number): Promise<Trip[]> {
    return await db.select().from(trips).where(eq(trips.driverId, driverId));
  }

  async searchTrips(departure: string, destination: string, date?: string): Promise<TripWithDriver[]> {
    let query = db
      .select({
        id: trips.id,
        driverId: trips.driverId,
        departure: trips.departure,
        destination: trips.destination,
        departureTime: trips.departureTime,
        arrivalTime: trips.arrivalTime,
        availableSeats: trips.availableSeats,
        totalSeats: trips.totalSeats,
        pricePerSeat: trips.pricePerSeat,
        description: trips.description,
        isActive: trips.isActive,
        createdAt: trips.createdAt,
        driver: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          averageRating: users.averageRating,
          totalRatings: users.totalRatings,
        },
      })
      .from(trips)
      .innerJoin(users, eq(trips.driverId, users.id))
      .where(
        and(
          eq(trips.isActive, true),
          like(trips.departure, `%${departure}%`),
          like(trips.destination, `%${destination}%`),
          sql`${trips.availableSeats} > 0`
        )
      );

    if (date) {
      query = query.where(
        and(
          eq(trips.isActive, true),
          like(trips.departure, `%${departure}%`),
          like(trips.destination, `%${destination}%`),
          sql`${trips.availableSeats} > 0`,
          sql`DATE(${trips.departureTime}) = ${date}`
        )
      );
    }

    return await query;
  }

  async getActiveTrips(): Promise<TripWithDriver[]> {
    return await db
      .select({
        id: trips.id,
        driverId: trips.driverId,
        departure: trips.departure,
        destination: trips.destination,
        departureTime: trips.departureTime,
        arrivalTime: trips.arrivalTime,
        availableSeats: trips.availableSeats,
        totalSeats: trips.totalSeats,
        pricePerSeat: trips.pricePerSeat,
        description: trips.description,
        isActive: trips.isActive,
        createdAt: trips.createdAt,
        driver: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          averageRating: users.averageRating,
          totalRatings: users.totalRatings,
        },
      })
      .from(trips)
      .innerJoin(users, eq(trips.driverId, users.id))
      .where(
        and(
          eq(trips.isActive, true),
          sql`${trips.availableSeats} > 0`
        )
      );
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const [trip] = await db
      .insert(trips)
      .values(insertTrip)
      .returning();
    return trip;
  }

  async updateTrip(id: number, updates: Partial<Trip>): Promise<Trip | undefined> {
    const [trip] = await db
      .update(trips)
      .set(updates)
      .where(eq(trips.id, id))
      .returning();
    return trip || undefined;
  }

  async deleteTrip(id: number): Promise<boolean> {
    const result = await db.delete(trips).where(eq(trips.id, id));
    return result.rowCount > 0;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getBookingsByTrip(tripId: number): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.tripId, tripId));
  }

  async getBookingsByPassenger(passengerId: number): Promise<BookingWithTrip[]> {
    return await db
      .select({
        id: bookings.id,
        tripId: bookings.tripId,
        passengerId: bookings.passengerId,
        seatsBooked: bookings.seatsBooked,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        message: bookings.message,
        createdAt: bookings.createdAt,
        trip: {
          id: trips.id,
          driverId: trips.driverId,
          departure: trips.departure,
          destination: trips.destination,
          departureTime: trips.departureTime,
          arrivalTime: trips.arrivalTime,
          availableSeats: trips.availableSeats,
          totalSeats: trips.totalSeats,
          pricePerSeat: trips.pricePerSeat,
          description: trips.description,
          isActive: trips.isActive,
          createdAt: trips.createdAt,
          driver: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            averageRating: users.averageRating,
            totalRatings: users.totalRatings,
          },
        },
      })
      .from(bookings)
      .innerJoin(trips, eq(bookings.tripId, trips.id))
      .innerJoin(users, eq(trips.driverId, users.id))
      .where(eq(bookings.passengerId, passengerId));
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db
      .insert(bookings)
      .values(insertBooking)
      .returning();
    return booking;
  }

  async updateBooking(id: number, updates: Partial<Booking>): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set(updates)
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async getRatingsByRatee(rateeId: number): Promise<Rating[]> {
    return await db.select().from(ratings).where(eq(ratings.rateeId, rateeId));
  }

  async createRating(insertRating: InsertRating): Promise<Rating> {
    const [rating] = await db
      .insert(ratings)
      .values(insertRating)
      .returning();
    return rating;
  }

  async updateUserRating(userId: number): Promise<void> {
    const userRatings = await this.getRatingsByRatee(userId);
    
    if (userRatings.length > 0) {
      const totalRating = userRatings.reduce((sum, rating) => sum + rating.rating, 0);
      const averageRating = (totalRating / userRatings.length).toFixed(1);
      
      await this.updateUser(userId, {
        averageRating: averageRating,
        totalRatings: userRatings.length,
      });
    }
  }
}

export const storage = new DatabaseStorage();
