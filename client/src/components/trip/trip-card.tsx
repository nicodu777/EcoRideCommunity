import { TripWithDriver } from "@shared/schema";
import { estimateCo2SavedKg } from "@shared/co2";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Star, Users, Leaf } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ENERGY_LABELS, formatCredits } from "@/lib/labels";

interface TripCardProps {
  trip: TripWithDriver;
  onBook?: (trip: TripWithDriver) => void;
  showBookButton?: boolean;
}

export function TripCard({ trip, onBook, showBookButton = true }: TripCardProps) {
  const co2Saved = estimateCo2SavedKg(trip.departureTime, trip.arrivalTime);

  const getDriverInitials = () => {
    return `${trip.driver.firstName[0]}${trip.driver.lastName[0]}`.toUpperCase();
  };

  const renderStars = (rating: string) => {
    const ratingNum = parseFloat(rating);
    const fullStars = Math.floor(ratingNum);
    const hasHalfStar = ratingNum % 1 !== 0;
    
    return (
      <div className="flex text-yellow-400">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={12}
            className={i < fullStars ? "fill-current" : i === fullStars && hasHalfStar ? "fill-current opacity-50" : ""}
          />
        ))}
      </div>
    );
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-green-700 to-cyan-700 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">{getDriverInitials()}</span>
            </div>
            <div>
              <h4 className="font-medium text-slate-900">
                {trip.driver.firstName} {trip.driver.lastName}
              </h4>
              <div className="flex items-center space-x-1">
                {renderStars(trip.driver.averageRating || "0")}
                <span className="text-sm text-slate-700 ml-1 font-medium">
                  {parseFloat(trip.driver.averageRating || "0").toFixed(1)}
                </span>
                {trip.driver.totalRatings > 0 && (
                  <span className="text-sm text-slate-500">
                    ({trip.driver.totalRatings})
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-slate-900">
              {formatCredits(trip.pricePerSeat)}
            </div>
            <div className="text-sm text-slate-600">par place</div>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-eco-green rounded-full"></div>
            <span className="text-slate-900 font-semibold flex-1">{trip.departure}</span>
            <span className="text-sm text-slate-600 font-medium">
              {format(new Date(trip.departureTime), 'HH:mm', { locale: fr })}
            </span>
          </div>
          <div className="w-px h-6 bg-slate-300 ml-1.5"></div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-eco-blue rounded-full"></div>
            <span className="text-slate-900 font-semibold flex-1">{trip.destination}</span>
            <span className="text-sm text-slate-600 font-medium">
              {format(new Date(trip.arrivalTime), 'HH:mm', { locale: fr })}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 text-sm text-slate-700 font-medium">
            <span>
              {format(new Date(trip.departureTime), 'dd MMM', { locale: fr })}
            </span>
            <span className="flex items-center space-x-1">
              <Users size={14} />
              <span>{trip.availableSeats} place{trip.availableSeats > 1 ? 's' : ''}</span>
            </span>
          </div>
          {/* US3 : un trajet est écologique si le véhicule est électrique */}
          {trip.isEcological ? (
            <span className="flex items-center space-x-1 text-sm text-green-700 font-medium">
              <Leaf size={14} aria-hidden="true" />
              <span>Trajet écologique</span>
            </span>
          ) : (
            <span className="text-sm text-slate-600">
              {trip.vehicle.brand} {trip.vehicle.model} · {ENERGY_LABELS[trip.vehicle.energy]}
            </span>
          )}
        </div>

        {co2Saved > 0 && (
          <p className="mb-4 flex items-center gap-1 text-xs text-green-700" title="Estimation : durée × 80 km/h × 120 g de CO₂ évités par km">
            <Leaf size={12} aria-hidden="true" />
            ≈ {co2Saved} kg de CO₂ évités par passager
          </p>
        )}

        <div className="flex gap-2">
          {/* US5 : page de détail (véhicule, préférences et avis du chauffeur) */}
          <Link href={`/trips/${trip.id}`} className="flex-1">
            <Button variant="outline" className="w-full">Détails</Button>
          </Link>
          {showBookButton && (
            <Button className="flex-1 bg-eco-green hover:bg-green-600" onClick={() => onBook?.(trip)}>
              Participer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
