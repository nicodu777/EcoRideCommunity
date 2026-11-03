/**
 * ====================================================================
 * BookingService - Réservations et mouvements de crédits
 * ====================================================================
 *
 * Règles du sujet EcoRide appliquées ici :
 * - US6  : on ne peut réserver que s'il reste des places et si l'on a
 *          assez de crédits ; les crédits sont débités à la réservation ;
 * - US10 : le passager peut annuler (crédits rendus, place libérée) ;
 * - US11 : après l'arrivée, le passager valide le trajet -> le chauffeur
 *          reçoit le prix payé moins 2 crédits gardés par la plateforme ;
 *          s'il signale un problème, un employé tranche (litige).
 *
 * Chaque opération qui touche aux crédits est faite dans une transaction
 * avec des verrous de ligne (SELECT ... FOR UPDATE) : deux passagers qui
 * réservent la dernière place au même instant ne peuvent pas l'obtenir
 * tous les deux (pas de « survente »).
 * ====================================================================
 */
import type { User, Booking, BookingWithTrip, InsertBooking, TripIssue } from "@shared/schema";
import type { BookingRepository } from "../repositories/BookingRepository";
import type { TripRepository } from "../repositories/TripRepository";
import type { UserRepository } from "../repositories/UserRepository";
import type { EarningsRepository } from "../repositories/EarningsRepository";
import type { TripIssueRepository } from "../repositories/TripIssueRepository";
import type { Transaction } from "../db/postgres";
import type { TransactionRunner } from "./TransactionRunner";
import { PLATFORM_FEE } from "../config/rules";
import { AppError } from "../errors/AppError";

export class BookingService {
  constructor(
    private readonly bookings: BookingRepository,
    private readonly trips: TripRepository,
    private readonly users: UserRepository,
    private readonly earnings: EarningsRepository,
    private readonly issues: TripIssueRepository,
    private readonly transaction: TransactionRunner,
  ) {}

  async listMine(passenger: User): Promise<BookingWithTrip[]> {
    return this.bookings.findByPassengerWithTrip(passenger.id);
  }

  /** US6 : participer à un covoiturage. */
  async reserve(passengerId: number, data: InsertBooking): Promise<Booking> {
    return this.transaction(async (tx) => {
      // 1. On verrouille le trajet et le passager jusqu'à la fin de la transaction
      const trip = await this.trips.findByIdForUpdate(data.tripId, tx);
      if (!trip) throw AppError.notFound("Trajet introuvable");
      if (trip.status !== "pending" || trip.departureTime <= new Date()) {
        throw AppError.badRequest("Ce trajet n'est plus réservable");
      }
      if (trip.driverId === passengerId) throw AppError.badRequest("Vous ne pouvez pas réserver votre propre trajet");
      if (trip.availableSeats < data.seatsBooked) throw AppError.badRequest("Plus assez de places disponibles");
      if (await this.bookings.findActive(trip.id, passengerId, tx)) {
        throw AppError.conflict("Vous avez déjà une réservation sur ce trajet");
      }

      const passenger = await this.users.findByIdForUpdate(passengerId, tx);
      if (!passenger) throw AppError.notFound("Utilisateur introuvable");

      // 2. Le prix est recalculé côté serveur : on ne fait pas confiance au prix envoyé par le navigateur
      const totalPrice = Number(trip.pricePerSeat) * data.seatsBooked;
      if (Number(passenger.credits) < totalPrice) {
        throw AppError.badRequest(`Crédits insuffisants : ${totalPrice} nécessaires, ${Number(passenger.credits)} disponibles`);
      }

      // 3. Mouvements : débit du passager, places retirées, réservation créée
      await this.users.addCredits(passengerId, -totalPrice, tx);
      await this.trips.adjustSeats(trip.id, -data.seatsBooked, tx);
      return this.bookings.create({
        tripId: trip.id,
        passengerId,
        seatsBooked: data.seatsBooked,
        totalPrice: totalPrice.toFixed(2),
        message: data.message ?? null,
      }, tx);
    });
  }

  /** Charge une réservation du passager connecté, verrouillée, avec le statut attendu. */
  private async getOwnBooking(tx: Transaction, passengerId: number, bookingId: number, expected: Booking["status"]) {
    const booking = await this.bookings.findByIdForUpdate(bookingId, tx);
    if (!booking || booking.passengerId !== passengerId) throw AppError.notFound("Réservation introuvable");
    if (booking.status !== expected) throw AppError.badRequest("Action impossible pour cette réservation");
    return booking;
  }

  /** US10 : annulation par le passager avant le départ. */
  async cancel(passengerId: number, bookingId: number): Promise<Booking> {
    return this.transaction(async (tx) => {
      const booking = await this.getOwnBooking(tx, passengerId, bookingId, "confirmed");
      const trip = await this.trips.findByIdForUpdate(booking.tripId, tx);
      if (!trip || trip.status !== "pending") throw AppError.badRequest("Le trajet a déjà démarré");

      await this.users.addCredits(passengerId, Number(booking.totalPrice), tx);
      await this.trips.adjustSeats(trip.id, booking.seatsBooked, tx);
      return this.bookings.updateStatus(booking.id, "cancelled", tx);
    });
  }

  /** Paie le chauffeur : prix payé moins la commission de la plateforme. */
  private async payDriver(tx: Transaction, booking: Booking): Promise<void> {
    const trip = await this.trips.findById(booking.tripId, tx);
    if (!trip) throw AppError.notFound("Trajet introuvable");
    const fee = Math.min(PLATFORM_FEE, Number(booking.totalPrice));
    await this.users.addCredits(trip.driverId, Number(booking.totalPrice) - fee, tx);
    await this.earnings.create(trip.id, booking.id, fee, tx);
  }

  /** US11 : le passager confirme que le trajet s'est bien passé. */
  async validate(passengerId: number, bookingId: number): Promise<Booking> {
    return this.transaction(async (tx) => {
      const booking = await this.getOwnBooking(tx, passengerId, bookingId, "awaiting_validation");
      await this.payDriver(tx, booking);
      return this.bookings.updateStatus(booking.id, "validated", tx);
    });
  }

  /** US11 : le passager signale un problème -> litige traité par un employé (US12). */
  async report(passengerId: number, bookingId: number, description: string): Promise<TripIssue> {
    return this.transaction(async (tx) => {
      const booking = await this.getOwnBooking(tx, passengerId, bookingId, "awaiting_validation");
      await this.bookings.updateStatus(booking.id, "disputed", tx);
      return this.issues.create({
        tripId: booking.tripId,
        bookingId: booking.id,
        reporterId: passengerId,
        issueDescription: description,
      }, tx);
    });
  }

  /**
   * US12 : l'employé tranche le litige.
   * - pay_driver       : le chauffeur est payé comme pour une validation normale ;
   * - refund_passenger : le passager récupère la totalité de ses crédits.
   */
  async resolveIssue(
    employeeId: number,
    issueId: number,
    decision: "pay_driver" | "refund_passenger",
    resolution: string,
  ): Promise<TripIssue> {
    return this.transaction(async (tx) => {
      const issue = await this.issues.findByIdForUpdate(issueId, tx);
      if (!issue) throw AppError.notFound("Litige introuvable");
      if (issue.status === "resolved") throw AppError.badRequest("Ce litige est déjà traité");

      const booking = await this.bookings.findByIdForUpdate(issue.bookingId, tx);
      if (!booking || booking.status !== "disputed") throw AppError.badRequest("Réservation non concernée par un litige");

      if (decision === "pay_driver") {
        await this.payDriver(tx, booking);
        await this.bookings.updateStatus(booking.id, "validated", tx);
      } else {
        await this.users.addCredits(booking.passengerId, Number(booking.totalPrice), tx);
        await this.bookings.updateStatus(booking.id, "refunded", tx);
      }
      return this.issues.resolve(issue.id, { decision, resolution, handledBy: employeeId }, tx);
    });
  }
}
