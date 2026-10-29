/**
 * RatingService - Avis des passagers sur les chauffeurs.
 *
 * - un passager ne peut noter que le chauffeur d'un trajet qu'il a validé ;
 * - un seul avis par passager et par trajet ;
 * - l'avis reste invisible tant qu'un employé ne l'a pas approuvé (US12).
 */
import type { User, Rating, InsertRating } from "@shared/schema";
import type { RatingRepository, PendingRating } from "../repositories/RatingRepository";
import type { BookingRepository } from "../repositories/BookingRepository";
import type { TripRepository } from "../repositories/TripRepository";
import type { UserRepository } from "../repositories/UserRepository";
import { AppError } from "../errors/AppError";

export class RatingService {
  constructor(
    private readonly ratings: RatingRepository,
    private readonly bookings: BookingRepository,
    private readonly trips: TripRepository,
    private readonly users: UserRepository,
  ) {}

  async create(rater: User, data: InsertRating): Promise<Rating> {
    const trip = await this.trips.findById(data.tripId);
    if (!trip) throw AppError.notFound("Trajet introuvable");

    const participations = await this.bookings.findByTrip(trip.id, ["validated", "disputed", "refunded"]);
    if (!participations.some((b) => b.passengerId === rater.id)) {
      throw AppError.forbidden("Vous devez avoir terminé ce trajet pour laisser un avis");
    }
    if (await this.ratings.findByTripAndRater(trip.id, rater.id)) {
      throw AppError.conflict("Vous avez déjà donné votre avis sur ce trajet");
    }

    return this.ratings.create({ ...data, raterId: rater.id, rateeId: trip.driverId });
  }

  async listPending(): Promise<PendingRating[]> {
    return this.ratings.findPending();
  }

  /** Validation ou refus par un employé, puis mise à jour de la note moyenne du chauffeur. */
  async review(employeeId: number, ratingId: number, approve: boolean): Promise<Rating> {
    const rating = await this.ratings.findById(ratingId);
    if (!rating) throw AppError.notFound("Avis introuvable");
    if (rating.isApproved !== null) throw AppError.badRequest("Cet avis a déjà été modéré");

    const reviewed = await this.ratings.review(ratingId, employeeId, approve);
    const stats = await this.ratings.approvedStats(rating.rateeId);
    await this.users.updateRatingStats(rating.rateeId, stats.average, stats.count);
    return reviewed;
  }
}
