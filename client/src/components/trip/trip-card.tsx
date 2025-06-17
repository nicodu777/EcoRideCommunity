import { TripWithDriver } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Users, Leaf, MapPin } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TripCardProps {
  trip: TripWithDriver;
  onBook?: (trip: TripWithDriver) => void;
  showBookButton?: boolean;
}

export function TripCard({ trip, onBook, showBookButton = true }: TripCardProps) {
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

  const co2Saved = Math.round(parseFloat(trip.pricePerSeat) * 0.5); // Rough calculation

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-eco-green to-eco-blue rounded-full flex items-center justify-center">
              <span className="text-white font-medium">{getDriverInitials()}</span>
            </div>
            <div>
              <h4 className="font-medium text-slate-900">
                {trip.driver.firstName} {trip.driver.lastName}
              </h4>
              <div className="flex items-center space-x-1">
                {renderStars(trip.driver.averageRating)}
                <span className="text-sm text-slate-600 ml-1">
                  {parseFloat(trip.driver.averageRating).toFixed(1)}
                </span>
                {trip.driver.totalRatings > 0 && (
                  <span className="text-sm text-slate-400">
                    ({trip.driver.totalRatings})
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-slate-900">
              {parseFloat(trip.pricePerSeat).toFixed(0)}€
            </div>
            <div className="text-sm text-slate-600">par personne</div>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-eco-green rounded-full"></div>
            <span className="text-slate-900 font-medium flex-1">{trip.departure}</span>
            <span className="text-sm text-slate-500">
              {format(new Date(trip.departureTime), 'HH:mm', { locale: fr })}
            </span>
          </div>
          <div className="w-px h-6 bg-slate-300 ml-1.5"></div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-eco-blue rounded-full"></div>
            <span className="text-slate-900 font-medium flex-1">{trip.destination}</span>
            <span className="text-sm text-slate-500">
              {format(new Date(trip.arrivalTime), 'HH:mm', { locale: fr })}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 text-sm text-slate-600">
            <span>
              {format(new Date(trip.departureTime), 'dd MMM', { locale: fr })}
            </span>
            <span className="flex items-center space-x-1">
              <Users size={14} />
              <span>{trip.availableSeats} place{trip.availableSeats > 1 ? 's' : ''}</span>
            </span>
          </div>
          <div className="flex items-center space-x-1 text-sm text-eco-green">
            <Leaf size={14} />
            <span>-{co2Saved}kg CO₂</span>
          </div>
        </div>

        {showBookButton && (
          <Button 
            className="w-full bg-eco-green hover:bg-green-600" 
            onClick={() => onBook?.(trip)}
          >
            Réserver ce trajet
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
