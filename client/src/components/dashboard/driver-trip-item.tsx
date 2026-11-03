/**
 * Un trajet proposé par le chauffeur (US10, US11) :
 * démarrer -> arrivée à destination, ou annuler avant le départ.
 */
import { useState } from "react";
import type { TripWithDriver } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiJson } from "@/lib/queryClient";
import { useTripActions } from "@/hooks/use-trip-actions";
import { useToast } from "@/hooks/use-toast";
import { TRIP_STATUS_LABELS, formatCredits } from "@/lib/labels";
import { MessageCircle, Leaf } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  started: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-700",
};

interface DriverTripItemProps {
  trip: TripWithDriver;
  onOpenChat: (tripId: number) => void;
}

export function DriverTripItem({ trip, onOpenChat }: DriverTripItemProps) {
  const { refresh } = useTripActions();
  const { toast } = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const bookedSeats = trip.totalSeats - trip.availableSeats;

  const run = async (action: "start" | "complete" | "cancel", success: string) => {
    setBusy(true);
    try {
      await apiJson("POST", `/api/trips/${trip.id}/${action}`);
      toast({ title: success });
      setConfirmCancel(false);
      await refresh();
    } catch (error) {
      toast({ title: "Action impossible", description: (error as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-slate-900">{trip.departure} → {trip.destination}</p>
          <Badge className={STATUS_COLORS[trip.status]}>{TRIP_STATUS_LABELS[trip.status]}</Badge>
        </div>
        <p className="text-sm text-slate-600">{format(new Date(trip.departureTime), "dd MMM yyyy 'à' HH:mm", { locale: fr })}</p>
        <p className="text-sm text-slate-600 flex items-center gap-1">
          {trip.vehicle.brand} {trip.vehicle.model}
          {trip.isEcological && <Leaf size={14} className="text-green-700" aria-label="Trajet écologique" />}
        </p>
        <p className="text-sm text-slate-700">
          {bookedSeats} / {trip.totalSeats} place(s) réservée(s) · {formatCredits(trip.pricePerSeat)} par place
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {bookedSeats > 0 && trip.status !== "cancelled" && (
            <Button variant="outline" size="sm" onClick={() => onOpenChat(trip.id)}>
              <MessageCircle className="w-4 h-4 mr-1" aria-hidden="true" /> Chat
            </Button>
          )}
          {trip.status === "pending" && (
            <>
              <Button size="sm" className="bg-green-700 hover:bg-green-800" disabled={busy} onClick={() => run("start", "Trajet démarré. Bonne route !")}>
                Démarrer
              </Button>
              <Button size="sm" variant="outline" className="text-red-700" onClick={() => setConfirmCancel(true)}>Annuler</Button>
            </>
          )}
          {trip.status === "started" && (
            <Button size="sm" className="bg-blue-700 hover:bg-blue-800" disabled={busy}
              onClick={() => run("complete", "Arrivée enregistrée : vos passagers vont valider le trajet")}>
              Arrivée à destination
            </Button>
          )}
        </div>
      </CardContent>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce trajet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les {bookedSeats} passager(s) seront remboursés et prévenus. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); run("cancel", "Trajet annulé, passagers remboursés"); }}>
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
