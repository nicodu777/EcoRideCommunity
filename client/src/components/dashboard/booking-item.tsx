/**
 * Une réservation dans l'historique du passager (US10, US11).
 *
 * Actions possibles selon le statut :
 * - confirmée          -> annuler (crédits rendus) ;
 * - à valider          -> « tout s'est bien passé » ou « signaler un problème » ;
 * - validée/remboursée -> laisser un avis sur le chauffeur.
 */
import { useState } from "react";
import type { BookingWithTrip } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiJson } from "@/lib/queryClient";
import { useTripActions } from "@/hooks/use-trip-actions";
import { useToast } from "@/hooks/use-toast";
import { BOOKING_STATUS_LABELS, formatCredits } from "@/lib/labels";
import { MessageCircle, Star } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  awaiting_validation: "bg-orange-100 text-orange-800",
  validated: "bg-blue-100 text-blue-800",
  disputed: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-700",
  refunded: "bg-slate-100 text-slate-700",
};

interface BookingItemProps {
  booking: BookingWithTrip;
  onOpenChat: (tripId: number) => void;
}

export function BookingItem({ booking, onOpenChat }: BookingItemProps) {
  const { refresh } = useTripActions();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<"cancel" | "report" | "rate" | null>(null);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const { trip } = booking;

  /** Appelle l'API, affiche le résultat et rafraîchit les données. */
  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast({ title: success });
      setDialog(null);
      setText("");
      await refresh();
    } catch (error) {
      toast({ title: "Action impossible", description: (error as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-slate-900">{trip.departure} → {trip.destination}</p>
            <p className="text-sm text-slate-600">
              {format(new Date(trip.departureTime), "dd MMM yyyy 'à' HH:mm", { locale: fr })} ·{" "}
              {booking.seatsBooked} place{booking.seatsBooked > 1 ? "s" : ""} · {formatCredits(booking.totalPrice)}
            </p>
            <p className="text-sm text-slate-600">Chauffeur : {trip.driver.firstName} {trip.driver.lastName}</p>
          </div>
          <Badge className={STATUS_COLORS[booking.status]}>{BOOKING_STATUS_LABELS[booking.status]}</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {booking.status !== "cancelled" && (
            <Button variant="outline" size="sm" onClick={() => onOpenChat(trip.id)}>
              <MessageCircle className="w-4 h-4 mr-1" aria-hidden="true" /> Chat
            </Button>
          )}
          {booking.status === "confirmed" && trip.status === "pending" && (
            <Button variant="outline" size="sm" className="text-red-700" onClick={() => setDialog("cancel")}>Annuler</Button>
          )}
          {booking.status === "awaiting_validation" && (
            <>
              <Button size="sm" className="bg-eco-green hover:bg-green-600" disabled={busy}
                onClick={() => run(() => apiJson("POST", `/api/bookings/${booking.id}/validate`), "Merci ! Le chauffeur a été crédité.")}>
                Tout s'est bien passé
              </Button>
              <Button size="sm" variant="outline" className="text-red-700" onClick={() => setDialog("report")}>Signaler un problème</Button>
            </>
          )}
          {["validated", "refunded"].includes(booking.status) && (
            <Button size="sm" variant="outline" onClick={() => setDialog("rate")}>
              <Star className="w-4 h-4 mr-1" aria-hidden="true" /> Laisser un avis
            </Button>
          )}
        </div>
      </CardContent>

      {/* Double confirmation avant l'annulation */}
      <AlertDialog open={dialog === "cancel"} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle>
            <AlertDialogDescription>{formatCredits(booking.totalPrice)} vous seront rendus et la place sera libérée.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => {
              e.preventDefault();
              run(() => apiJson("POST", `/api/bookings/${booking.id}/cancel`), "Réservation annulée, crédits rendus");
            }}>Confirmer l'annulation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialog === "report"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signaler un problème</DialogTitle>
            <DialogDescription>Un employé EcoRide étudiera votre signalement avant que le chauffeur soit payé.</DialogDescription>
          </DialogHeader>
          <Label htmlFor={`report-${booking.id}`}>Que s'est-il passé ?</Label>
          <Textarea id={`report-${booking.id}`} rows={4} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
          <DialogFooter>
            <Button disabled={busy || text.trim().length < 10}
              onClick={() => run(() => apiJson("POST", `/api/bookings/${booking.id}/report`, { description: text }), "Signalement envoyé")}>
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "rate"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Votre avis sur {trip.driver.firstName}</DialogTitle>
            <DialogDescription>Il sera publié après validation par notre équipe.</DialogDescription>
          </DialogHeader>
          <fieldset>
            <legend className="text-sm font-medium mb-2">Note</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} étoile${n > 1 ? "s" : ""}`} aria-pressed={rating === n} onClick={() => setRating(n)}>
                  <Star className={n <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-300"} />
                </button>
              ))}
            </div>
          </fieldset>
          <Label htmlFor={`comment-${booking.id}`}>Commentaire (optionnel)</Label>
          <Textarea id={`comment-${booking.id}`} rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} />
          <DialogFooter>
            <Button disabled={busy}
              onClick={() => run(() => apiJson("POST", "/api/ratings", { tripId: trip.id, rating, comment: text || undefined }), "Avis envoyé, en attente de validation")}>
              Envoyer mon avis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
