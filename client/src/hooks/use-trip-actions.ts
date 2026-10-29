/**
 * Actions réutilisées sur plusieurs pages : réserver une place, publier un trajet.
 *
 * Avant, ce code était copié dans home.tsx, search-results.tsx et
 * dashboard.tsx. Un hook unique évite la duplication : une correction
 * faite ici s'applique partout.
 */
import { useState } from "react";
import type { InsertTrip } from "@shared/schema";
import { apiJson, queryClient } from "@/lib/queryClient";
import { authService } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function useTripActions() {
  const { toast } = useToast();
  const [bookingLoading, setBookingLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  /** Rafraîchit les listes et le solde de crédits affiché. */
  const refresh = async () => {
    // Toutes les requêtes en cache dont l'URL concerne les trajets ou les réservations
    await queryClient.invalidateQueries({
      predicate: (query) => /^\/api\/(trips|bookings|chat)/.test(String(query.queryKey[0])),
    });
    await authService.refreshProfile();
  };

  /** US6 : seuls le trajet, le nombre de places et le message sont envoyés. */
  const bookTrip = async (tripId: number, seatsBooked: number, message: string): Promise<boolean> => {
    setBookingLoading(true);
    try {
      await apiJson("POST", "/api/bookings", { tripId, seatsBooked, message: message || null });
      await refresh();
      toast({ title: "Réservation confirmée", description: "Vos crédits ont été débités. Bon voyage !" });
      return true;
    } catch (error) {
      toast({ title: "Réservation impossible", description: (error as Error).message, variant: "destructive" });
      return false;
    } finally {
      setBookingLoading(false);
    }
  };

  const publishTrip = async (trip: InsertTrip): Promise<boolean> => {
    setPublishLoading(true);
    try {
      await apiJson("POST", "/api/trips", trip);
      await refresh();
      toast({ title: "Trajet publié", description: "Votre trajet est visible dans la recherche." });
      return true;
    } catch (error) {
      toast({ title: "Publication impossible", description: (error as Error).message, variant: "destructive" });
      return false;
    } finally {
      setPublishLoading(false);
    }
  };

  return { bookTrip, publishTrip, refresh, bookingLoading, publishLoading };
}
