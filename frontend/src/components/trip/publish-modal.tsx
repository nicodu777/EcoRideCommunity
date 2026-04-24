import { useState } from "react";
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
  // Nouveaux champs obligatoires pour le véhicule
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des champs
    if (!departure.trim()) {
      alert("Veuillez entrer un point de départ");
      return;
    }
    if (!destination.trim()) {
      alert("Veuillez entrer une destination");
      return;
    }
    if (!departureDate) {
      alert("Veuillez sélectionner une date de départ");
      return;
    }
    if (!departureTime) {
      alert("Veuillez sélectionner une heure de départ");
      return;
    }
    if (!arrivalTime) {
      alert("Veuillez sélectionner une heure d'arrivée");
      return;
    }
    if (availableSeats < 1 || availableSeats > 8) {
      alert("Le nombre de places doit être entre 1 et 8");
      return;
    }
    if (pricePerSeat <= 0) {
      alert("Le prix par place doit être supérieur à 0");
      return;
    }
    
    // Validation obligatoire du véhicule selon les consignes
    if (!vehicleType) {
      alert("Veuillez sélectionner le type de véhicule");
      return;
    }
    if (!vehicleBrand.trim()) {
      alert("Veuillez entrer la marque du véhicule");
      return;
    }
    if (!vehicleModel.trim()) {
      alert("Veuillez entrer le modèle du véhicule");
      return;
    }
    
    const departureDateTime = new Date(`${departureDate}T${departureTime}`);
    const arrivalDateTime = new Date(`${departureDate}T${arrivalTime}`);
    
    // Validation des dates
    if (isNaN(departureDateTime.getTime()) || isNaN(arrivalDateTime.getTime())) {
      alert("Dates invalides");
      return;
    }
    
    if (departureDateTime >= arrivalDateTime) {
      alert("L'heure d'arrivée doit être après l'heure de départ");
      return;
    }

    if (departureDateTime <= new Date()) {
      alert("L'heure de départ doit être dans le futur");
      return;
    }
    
    const isEcological = vehicleType === "electric"; // Trajet écologique seulement si véhicule électrique
    
    const tripData = {
      departure: departure.trim(),
      destination: destination.trim(),
      departureTime: departureDateTime,
      arrivalTime: arrivalDateTime,
      availableSeats: Number(availableSeats),
      totalSeats: Number(availableSeats),
      pricePerSeat: Number(pricePerSeat),
      description: description.trim() || undefined,
      vehicleType: vehicleType,
      vehicleBrand: vehicleBrand.trim(),
      vehicleModel: vehicleModel.trim(),
      isEcological: isEcological,
    };

    console.log("Submitting trip data:", tripData);
    onPublish(tripData);
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
    setVehicleType("");
    setVehicleBrand("");
    setVehicleModel("");
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

            {/* Section véhicule obligatoire */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                🚗 Informations sur votre véhicule (obligatoire)
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="vehicleType" className="text-sm font-medium text-slate-700">
                    Type de véhicule
                  </Label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger className="focus:ring-2 focus:ring-eco-green focus:border-eco-green">
                      <SelectValue placeholder="Sélectionnez le type de véhicule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electric">
                        <div className="flex items-center">
                          <span className="mr-2">⚡</span>
                          Électrique (trajet écologique)
                        </div>
                      </SelectItem>
                      <SelectItem value="hybrid">
                        <div className="flex items-center">
                          <span className="mr-2">🔋</span>
                          Hybride
                        </div>
                      </SelectItem>
                      <SelectItem value="gasoline">
                        <div className="flex items-center">
                          <span className="mr-2">⛽</span>
                          Essence
                        </div>
                      </SelectItem>
                      <SelectItem value="diesel">
                        <div className="flex items-center">
                          <span className="mr-2">🛢️</span>
                          Diesel
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {vehicleType === "electric" && (
                    <p className="text-xs text-green-600 mt-1">
                      ✅ Ce trajet sera marqué comme écologique
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="vehicleBrand" className="text-sm font-medium text-slate-700">
                      Marque
                    </Label>
                    <Input
                      id="vehicleBrand"
                      type="text"
                      placeholder="ex: Tesla, Renault..."
                      value={vehicleBrand}
                      onChange={(e) => setVehicleBrand(e.target.value)}
                      className="focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="vehicleModel" className="text-sm font-medium text-slate-700">
                      Modèle
                    </Label>
                    <Input
                      id="vehicleModel"
                      type="text"
                      placeholder="ex: Model 3, Zoe..."
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      className="focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                      required
                    />
                  </div>
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
