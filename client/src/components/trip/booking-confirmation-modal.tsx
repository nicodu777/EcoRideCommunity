import { useState } from "react";
import { TripWithDriver } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CreditCard, Shield } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BookingConfirmationModalProps {
  trip: TripWithDriver | null;
  seatsBooked: number;
  totalPrice: number;
  userCredits: number;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function BookingConfirmationModal({
  trip,
  seatsBooked,
  totalPrice,
  userCredits,
  open,
  onClose,
  onConfirm,
  loading = false
}: BookingConfirmationModalProps) {
  const [hasConfirmedTerms, setHasConfirmedTerms] = useState(false);
  const [hasConfirmedCredits, setHasConfirmedCredits] = useState(false);

  if (!trip) return null;

  const hasEnoughCredits = userCredits >= totalPrice;
  const canConfirm = hasConfirmedTerms && hasConfirmedCredits && hasEnoughCredits;

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
      // Reset confirmations
      setHasConfirmedTerms(false);
      setHasConfirmedCredits(false);
    }
  };

  const handleClose = () => {
    setHasConfirmedTerms(false);
    setHasConfirmedCredits(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-eco-green" />
            Confirmation de réservation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Résumé du trajet */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-slate-900 mb-2">Détails du trajet</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Trajet</span>
                  <span>{trip.departure} → {trip.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Date</span>
                  <span>{format(new Date(trip.departureTime), "EEEE d MMMM yyyy", { locale: fr })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Heure</span>
                  <span>{format(new Date(trip.departureTime), "HH:mm")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Places</span>
                  <span>{seatsBooked} place{seatsBooked > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{totalPrice}€</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vérification des crédits */}
          <Card className={!hasEnoughCredits ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4" />
                <h3 className="font-medium text-slate-900">Vérification des crédits</h3>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Vos crédits actuels</span>
                  <span className={userCredits >= totalPrice ? "text-green-600" : "text-red-600"}>
                    {userCredits}€
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Coût de la réservation</span>
                  <span>{totalPrice}€</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Crédits restants</span>
                  <span className={userCredits - totalPrice >= 0 ? "text-green-600" : "text-red-600"}>
                    {userCredits - totalPrice}€
                  </span>
                </div>
              </div>
              
              {!hasEnoughCredits && (
                <div className="mt-3 flex items-start gap-2 text-red-600">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    Vous n'avez pas assez de crédits pour effectuer cette réservation. 
                    Veuillez recharger votre compte.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Confirmations obligatoires */}
          {hasEnoughCredits && (
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="confirm-credits"
                  checked={hasConfirmedCredits}
                  onCheckedChange={setHasConfirmedCredits}
                />
                <label htmlFor="confirm-credits" className="text-sm text-slate-700 leading-5">
                  Je confirme que {totalPrice}€ seront déduits de mes crédits pour cette réservation.
                </label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="confirm-terms"
                  checked={hasConfirmedTerms}
                  onCheckedChange={setHasConfirmedTerms}
                />
                <label htmlFor="confirm-terms" className="text-sm text-slate-700 leading-5">
                  J'accepte les conditions de réservation et comprends que l'annulation peut entraîner 
                  des pénalités selon les conditions du conducteur.
                </label>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="flex-1 bg-eco-green hover:bg-green-600"
              onClick={handleConfirm}
              disabled={!canConfirm || loading}
            >
              {loading ? "Confirmation..." : "Confirmer la réservation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}