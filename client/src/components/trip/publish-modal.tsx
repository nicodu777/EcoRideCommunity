import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Calendar, Clock, Users, DollarSign, X } from "lucide-react";
import { format } from "date-fns";

interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  onPublish: (tripData: {
    departure: string;
    destination: string;
    departureTime: Date;
    arrivalTime: Date;
    availableSeats: number;
    totalSeats: number;
    pricePerSeat: number;
    description?: string;
  }) => void;
  loading?: boolean;
}

export function PublishModal({ open, onClose, onPublish, loading = false }: PublishModalProps) {
  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [availableSeats, setAvailableSeats] = useState(1);
  const [pricePerSeat, setPricePerSeat] = useState(0);
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const departureDateTime = new Date(`${departureDate}T${departureTime}`);
    const arrivalDateTime = new Date(`${departureDate}T${arrivalTime}`);
    
    onPublish({
      departure,
      destination,
      departureTime: departureDateTime,
      arrivalTime: arrivalDateTime,
      availableSeats,
      totalSeats: availableSeats,
      pricePerSeat,
      description: description || undefined,
    });
  };

  const resetForm = () => {
    setDeparture("");
    setDestination("");
    setDepartureDate("");
    setDepartureTime("");
    setArrivalTime("");
    setAvailableSeats(1);
    setPricePerSeat(0);
    setDescription("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
    // Pour mobile, nettoyer l'URL si nécessaire
    if (window.location.search.includes('tab=publish')) {
      window.history.replaceState({}, '', '/dashboard');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose();
      }
    }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-slate-900">
              Publier un trajet
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
              }}
              type="button"
            >
              <X size={20} />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="departure" className="text-sm font-medium text-slate-700">
                Ville de départ
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-slate-400" size={16} />
                <Input
                  id="departure"
                  type="text"
                  placeholder="Paris"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  className="pl-10 focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="destination" className="text-sm font-medium text-slate-700">
                Ville d'arrivée
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-slate-400" size={16} />
                <Input
                  id="destination"
                  type="text"
                  placeholder="Lyon"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="pl-10 focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="departureDate" className="text-sm font-medium text-slate-700">
                Date du trajet
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 text-slate-400" size={16} />
                <Input
                  id="departureDate"
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="pl-10 focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="departureTime" className="text-sm font-medium text-slate-700">
                  Heure de départ
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 text-slate-400" size={16} />
                  <Input
                    id="departureTime"
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="pl-10 focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="arrivalTime" className="text-sm font-medium text-slate-700">
                  Heure d'arrivée
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 text-slate-400" size={16} />
                  <Input
                    id="arrivalTime"
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="pl-10 focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="seats" className="text-sm font-medium text-slate-700">
                  Places disponibles
                </Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 text-slate-400" size={16} />
                  <Input
                    id="seats"
                    type="number"
                    min="1"
                    max="8"
                    value={availableSeats}
                    onChange={(e) => setAvailableSeats(parseInt(e.target.value) || 1)}
                    className="pl-10 focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="price" className="text-sm font-medium text-slate-700">
                  Prix par place (€)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 text-slate-400" size={16} />
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="1"
                    value={pricePerSeat}
                    onChange={(e) => setPricePerSeat(parseFloat(e.target.value) || 0)}
                    className="pl-10 focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                Description (optionnel)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre trajet, vos préférences..."
                rows={3}
                className="focus:ring-2 focus:ring-eco-green focus:border-eco-green"
              />
            </div>
          </div>

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
              type="submit"
              className="flex-1 bg-eco-green hover:bg-green-600" 
              disabled={loading}
            >
              {loading ? "Publication..." : "Publier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
