import { useState } from "react";
import { TripWithDriver } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Star, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BookingModalProps {
  trip: TripWithDriver | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (tripId: number, seatsBooked: number, message: string, totalPrice: number) => void;
  loading?: boolean;
}

export function BookingModal({ trip, open, onClose, onConfirm, loading = false }: BookingModalProps) {
  const [seatsBooked, setSeatsBooked] = useState(1);
  const [message, setMessage] = useState("");

  if (!trip) return null;

  // Reset form when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset form state when closing
      setSeatsBooked(1);
      setMessage("");
      onClose();
    }
  };

  const totalPrice = parseFloat(trip.pricePerSeat) * seatsBooked;

  const handleConfirm = () => {
    onConfirm(trip.id, seatsBooked, message, totalPrice);
  };

  const getDriverInitials = () => {
    return `${trip.driver.firstName[0]}${trip.driver.lastName[0]}`.toUpperCase();
  };

  const renderStars = (rating: string | null) => {
    const ratingNum = parseFloat(rating || "0");
    const fullStars = Math.floor(ratingNum);
    
    return (
      <div className="flex text-yellow-400 text-xs">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={12}
            className={i < fullStars ? "fill-current" : ""}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-slate-900">
              Réserver ce trajet
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-slate-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-eco-green rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {getDriverInitials()}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">
                    {trip.driver.firstName} {trip.driver.lastName}
                  </h4>
                  <div className="flex items-center space-x-1">
                    {renderStars(trip.driver.averageRating)}
                    <span className="text-sm text-slate-600 ml-1">
                      {trip.driver.averageRating ? parseFloat(trip.driver.averageRating).toFixed(1) : "0.0"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-slate-600">
                {trip.departure} → {trip.destination} • {format(new Date(trip.departureTime), 'dd MMM HH:mm', { locale: fr })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div>
              <Label htmlFor="seats" className="text-sm font-medium text-slate-700 mb-2">
                Nombre de places
              </Label>
              <Select value={seatsBooked.toString()} onValueChange={(value) => setSeatsBooked(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(Math.min(trip.availableSeats, 4))].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {i + 1} place{i + 1 > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="message" className="text-sm font-medium text-slate-700 mb-2">
                Message au conducteur (optionnel)
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Présentez-vous brièvement..."
                rows={3}
                className="focus:ring-2 focus:ring-eco-green focus:border-eco-green"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-eco-green bg-opacity-10 rounded-lg">
            <span className="font-medium text-slate-900">Total à payer</span>
            <span className="text-xl font-bold text-eco-green">
              {totalPrice.toFixed(0)}€
            </span>
          </div>

          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button 
              className="flex-1 bg-eco-green hover:bg-green-600" 
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "Confirmation..." : "Confirmer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
