/**
 * Fenêtre « Publier un trajet » (US9).
 *
 * Le chauffeur choisit un de SES véhicules (enregistrés dans son espace) :
 * le caractère écologique du trajet est déduit de l'énergie du véhicule.
 * Les contrôles faits ici améliorent l'ergonomie ; les mêmes règles sont
 * vérifiées par le serveur, qui seul fait foi.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Vehicle, InsertTrip } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Calendar, Clock, Users, Coins, Leaf } from "lucide-react";
import { format } from "date-fns";
import { ENERGY_LABELS } from "@/lib/labels";

/** Crédits prélevés par la plateforme sur chaque place vendue (affiché au chauffeur). */
const PLATFORM_FEE = 2;

interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  onPublish: (tripData: InsertTrip) => void;
  loading?: boolean;
}

export function PublishModal({ open, onClose, onPublish, loading = false }: PublishModalProps) {
  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [totalSeats, setTotalSeats] = useState(1);
  const [pricePerSeat, setPricePerSeat] = useState(10);
  const [description, setDescription] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles/mine"],
    enabled: open,
  });
  const selectedVehicle = vehicles.find((v) => String(v.id) === vehicleId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const departureDateTime = new Date(`${departureDate}T${departureTime}`);
    // L'arrivée peut être le lendemain (trajet de nuit)
    const arrivalDateTime = new Date(`${arrivalDate || departureDate}T${arrivalTime}`);

    if (!selectedVehicle) return setError("Choisissez le véhicule utilisé pour ce trajet.");
    if (!departure.trim() || !destination.trim()) return setError("Indiquez les villes de départ et d'arrivée.");
    if (isNaN(departureDateTime.getTime()) || isNaN(arrivalDateTime.getTime())) return setError("Dates invalides.");
    if (departureDateTime <= new Date()) return setError("Le départ doit être dans le futur.");
    if (arrivalDateTime <= departureDateTime) return setError("L'arrivée doit être après le départ.");
    if (totalSeats < 1 || totalSeats > selectedVehicle.seats) {
      return setError(`Ce véhicule propose au maximum ${selectedVehicle.seats} place(s).`);
    }
    if (pricePerSeat <= PLATFORM_FEE) return setError(`Le prix doit être supérieur à ${PLATFORM_FEE} crédits.`);

    onPublish({
      vehicleId: selectedVehicle.id,
      departure: departure.trim(),
      destination: destination.trim(),
      departureTime: departureDateTime,
      arrivalTime: arrivalDateTime,
      totalSeats,
      pricePerSeat,
      description: description.trim() || undefined,
    });
  };

  const handleClose = () => {
    setError(null);
    onClose();
    if (window.location.search.includes("tab=publish")) {
      window.history.replaceState({}, "", "/dashboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">Publier un trajet</DialogTitle>
          <DialogDescription>
            Vous recevrez le prix de chaque place moins {PLATFORM_FEE} crédits de frais de plateforme.
          </DialogDescription>
        </DialogHeader>

        {!vehiclesLoading && vehicles.length === 0 ? (
          <div className="text-center space-y-4 py-6">
            <p className="text-slate-700">Enregistrez d'abord un véhicule pour pouvoir publier un trajet.</p>
            <Link href="/dashboard?tab=vehicles" onClick={handleClose}>
              <Button className="bg-eco-green hover:bg-green-600">Ajouter un véhicule</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="vehicle">Véhicule</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger id="vehicle"><SelectValue placeholder="Choisir un véhicule" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.brand} {v.model} · {ENERGY_LABELS[v.energy]} · {v.seats} places
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedVehicle?.energy === "electric" && (
                <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                  <Leaf size={14} aria-hidden="true" /> Ce trajet sera affiché comme écologique
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="departure">Ville de départ</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-slate-400" size={16} aria-hidden="true" />
                <Input id="departure" placeholder="Paris" value={departure} onChange={(e) => setDeparture(e.target.value)} className="pl-10" required maxLength={100} />
              </div>
            </div>

            <div>
              <Label htmlFor="destination">Ville d'arrivée</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-slate-400" size={16} aria-hidden="true" />
                <Input id="destination" placeholder="Lyon" value={destination} onChange={(e) => setDestination(e.target.value)} className="pl-10" required maxLength={100} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="departureDate">Date de départ</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-slate-400" size={16} aria-hidden="true" />
                  <Input id="departureDate" type="date" value={departureDate} min={format(new Date(), "yyyy-MM-dd")} onChange={(e) => setDepartureDate(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div>
                <Label htmlFor="departureTime">Heure de départ</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 text-slate-400" size={16} aria-hidden="true" />
                  <Input id="departureTime" type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div>
                <Label htmlFor="arrivalDate">Date d'arrivée</Label>
                <Input id="arrivalDate" type="date" value={arrivalDate || departureDate} min={departureDate} onChange={(e) => setArrivalDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="arrivalTime">Heure d'arrivée</Label>
                <Input id="arrivalTime" type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="seats">Places proposées</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 text-slate-400" size={16} aria-hidden="true" />
                  <Input id="seats" type="number" min={1} max={selectedVehicle?.seats ?? 8} value={totalSeats} onChange={(e) => setTotalSeats(parseInt(e.target.value) || 1)} className="pl-10" required />
                </div>
              </div>
              <div>
                <Label htmlFor="price">Prix par place (crédits)</Label>
                <div className="relative">
                  <Coins className="absolute left-3 top-3 text-slate-400" size={16} aria-hidden="true" />
                  <Input id="price" type="number" min={PLATFORM_FEE + 1} step={1} value={pricePerSeat} onChange={(e) => setPricePerSeat(parseFloat(e.target.value) || 0)} className="pl-10" required />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea id="description" rows={3} maxLength={500} placeholder="Point de rendez-vous, bagages acceptés..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Annuler</Button>
              <Button type="submit" className="flex-1 bg-eco-green hover:bg-green-600" disabled={loading}>
                {loading ? "Publication..." : "Publier"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
