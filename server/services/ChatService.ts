/**
 * ChatService - Messagerie d'un trajet, réservée à ses participants
 * (le chauffeur et les passagers ayant une réservation non annulée).
 */
import type { User, ChatMessage, Trip } from "@shared/schema";
import type { ChatRepository } from "../repositories/ChatRepository";
import type { TripRepository } from "../repositories/TripRepository";
import type { BookingRepository } from "../repositories/BookingRepository";
import { AppError } from "../errors/AppError";

export type Conversation = {
  tripId: number;
  tripInfo: { departure: string; destination: string; departureTime: Date; driverName: string };
  unreadCount: number;
};

export class ChatService {
  constructor(
    private readonly chat: ChatRepository,
    private readonly trips: TripRepository,
    private readonly bookings: BookingRepository,
  ) {}

  /** Contrôle d'accès : seuls les participants lisent et écrivent les messages. */
  private async assertParticipant(user: User, tripId: number): Promise<Trip> {
    const trip = await this.trips.findById(tripId);
    if (!trip) throw AppError.notFound("Trajet introuvable");
    if (trip.driverId === user.id) return trip;
    const bookings = await this.bookings.findByTrip(tripId);
    if (!bookings.some((b) => b.passengerId === user.id && b.status !== "cancelled")) {
      throw AppError.forbidden("Vous ne participez pas à ce trajet");
    }
    return trip;
  }

  async messages(user: User, tripId: number): Promise<ChatMessage[]> {
    await this.assertParticipant(user, tripId);
    await this.chat.markRead(tripId, user.id);
    return this.chat.findByTrip(tripId);
  }

  async send(user: User, tripId: number, message: string): Promise<ChatMessage> {
    await this.assertParticipant(user, tripId);
    return this.chat.create(tripId, user.id, message); // l'expéditeur est l'utilisateur connecté
  }

  async conversations(user: User): Promise<Conversation[]> {
    const asDriver = await this.trips.findByDriver(user.id);
    const asPassenger = (await this.bookings.findByPassengerWithTrip(user.id))
      .filter((b) => b.status !== "cancelled")
      .map((b) => b.trip);

    const tripsById = new Map([...asPassenger, ...asDriver].map((t) => [t.id, t]));
    const unread = await this.chat.unreadCountsByTrip([...tripsById.keys()], user.id);

    return [...tripsById.values()].map((trip) => ({
      tripId: trip.id,
      tripInfo: {
        departure: trip.departure,
        destination: trip.destination,
        departureTime: trip.departureTime,
        driverName: `${trip.driver.firstName} ${trip.driver.lastName}`,
      },
      unreadCount: unread.get(trip.id) ?? 0,
    }));
  }

  async unreadCount(user: User): Promise<number> {
    const conversations = await this.conversations(user);
    return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }
}
