/**
 * ====================================================================
 * TripService - Logique métier des covoiturages
 * ====================================================================
 *
 * Cycle de vie d'un trajet :
 *   pending ──démarrer──▶ started ──arrivée──▶ completed
 *      └──────annuler──────▶ cancelled (passagers remboursés)
 *
 * À l'arrivée, chaque réservation passe en « awaiting_validation » :
 * le passager confirme ensuite que tout s'est bien passé (BookingService).
 * ====================================================================
 */
import type {
  User, Trip, InsertTrip, SearchTrip, SearchTripsResponse, TripWithDriver, TripDetails,
} from "@shared/schema";
import type { TripRepository } from "../repositories/TripRepository";
import type { VehicleRepository } from "../repositories/VehicleRepository";
import type { BookingRepository } from "../repositories/BookingRepository";
import type { UserRepository } from "../repositories/UserRepository";
import type { RatingRepository } from "../repositories/RatingRepository";
import type { NotificationRepository } from "../repositories/NotificationRepository";
import type { PreferenceRepository } from "../repositories/PreferenceRepository";
import type { TransactionRunner } from "./TransactionRunner";
import { isDriver } from "./VehicleService";
import { AppError } from "../errors/AppError";

export class TripService {
  constructor(
    private readonly trips: TripRepository,
    private readonly vehicles: VehicleRepository,
    private readonly bookings: BookingRepository,
    private readonly users: UserRepository,
    private readonly ratings: RatingRepository,
    private readonly notifications: NotificationRepository,
    private readonly preferences: PreferenceRepository,
    private readonly transaction: TransactionRunner,
  ) {}

  async listUpcoming(): Promise<TripWithDriver[]> {
    return this.trips.listUpcoming();
  }

  /** US3 + US4 : recherche avec filtres, et date la plus proche si aucun résultat. */
  async search(params: SearchTrip): Promise<SearchTripsResponse> {
    const trips = await this.trips.search(params);
    const suggestedDate = trips.length === 0 ? await this.trips.findNearestDate(params) : null;
    return { trips, suggestedDate };
  }

  /** US5 : détail d'un trajet avec avis publiés et préférences du chauffeur. */
  async getDetails(tripId: number): Promise<TripDetails> {
    const trip = await this.trips.findWithDriver(tripId);
    if (!trip) throw AppError.notFound("Trajet introuvable");
    const [reviews, driverPreferences] = await Promise.all([
      this.ratings.findApprovedForUser(trip.driverId),
      this.preferences.findByUser(trip.driverId).catch(() => null), // la page reste utilisable si MongoDB est indisponible
    ]);
    return { ...trip, reviews, driverPreferences };
  }

  async listMine(driver: User): Promise<TripWithDriver[]> {
    return this.trips.findByDriver(driver.id);
  }

  /** US9 : saisir un voyage. */
  async create(driver: User, data: InsertTrip): Promise<Trip> {
    if (!isDriver(driver)) throw AppError.forbidden("Passez votre profil en « chauffeur » pour publier un trajet");
    if (data.departureTime <= new Date()) throw AppError.badRequest("Le départ doit être dans le futur");

    const vehicle = await this.vehicles.findById(data.vehicleId);
    if (!vehicle || vehicle.ownerId !== driver.id) throw AppError.badRequest("Choisissez un de vos véhicules");
    if (data.totalSeats > vehicle.seats) {
      throw AppError.badRequest(`Ce véhicule ne propose que ${vehicle.seats} place(s)`);
    }

    return this.trips.create({
      driverId: driver.id,              // vient du token, jamais du formulaire
      vehicleId: vehicle.id,
      departure: data.departure,
      destination: data.destination,
      departureTime: data.departureTime,
      arrivalTime: data.arrivalTime,
      totalSeats: data.totalSeats,
      availableSeats: data.totalSeats,
      pricePerSeat: data.pricePerSeat.toFixed(2),
      description: data.description ?? null,
    });
  }

  /** Vérifie que le trajet existe et appartient bien au chauffeur connecté. */
  private async getOwnTrip(driver: User, tripId: number): Promise<Trip> {
    const trip = await this.trips.findById(tripId);
    if (!trip || trip.driverId !== driver.id) throw AppError.notFound("Trajet introuvable");
    return trip;
  }

  /** US11 : démarrer le covoiturage. */
  async start(driver: User, tripId: number): Promise<Trip> {
    const trip = await this.getOwnTrip(driver, tripId);
    if (trip.status !== "pending") throw AppError.badRequest("Ce trajet ne peut plus être démarré");
    return this.trips.update(trip.id, { status: "started", startedAt: new Date() });
  }

  /**
   * US11 : arrivée à destination. Les passagers sont invités à valider
   * le trajet ; le chauffeur ne sera payé qu'après leur validation.
   */
  async complete(driver: User, tripId: number): Promise<Trip> {
    const trip = await this.getOwnTrip(driver, tripId);
    if (trip.status !== "started") throw AppError.badRequest("Le trajet doit être démarré avant d'être terminé");

    return this.transaction(async (tx) => {
      const updated = await this.trips.update(trip.id, { status: "completed", completedAt: new Date() }, tx);
      const awaiting = await this.bookings.updateStatusForTrip(trip.id, "confirmed", "awaiting_validation", tx);
      for (const booking of awaiting) {
        await this.notifications.create(
          booking.passengerId,
          "Validez votre trajet",
          `Votre trajet ${trip.departure} → ${trip.destination} est terminé. Rendez-vous dans votre espace pour le valider et laisser un avis.`,
          tx,
        );
      }
      return updated;
    });
  }

  /**
   * US10 : annulation par le chauffeur. Tous les passagers sont remboursés
   * et prévenus. Tout est fait dans UNE transaction : en cas d'erreur au
   * milieu, aucun remboursement partiel n'est enregistré.
   */
  async cancel(driver: User, tripId: number): Promise<Trip> {
    const trip = await this.getOwnTrip(driver, tripId);
    if (trip.status !== "pending") throw AppError.badRequest("Seul un trajet qui n'a pas démarré peut être annulé");

    return this.transaction(async (tx) => {
      const cancelled = await this.bookings.updateStatusForTrip(trip.id, "confirmed", "cancelled", tx);
      for (const booking of cancelled) {
        await this.users.addCredits(booking.passengerId, Number(booking.totalPrice), tx);
        await this.notifications.create(
          booking.passengerId,
          "Trajet annulé",
          `Le chauffeur a annulé le trajet ${trip.departure} → ${trip.destination}. ${Number(booking.totalPrice)} crédits vous ont été rendus.`,
          tx,
        );
      }
      return this.trips.update(trip.id, { status: "cancelled" }, tx);
    });
  }
}
