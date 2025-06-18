import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, AlertCircle } from "lucide-react";

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

interface MapIntegrationProps {
  departure?: LocationData;
  destination?: LocationData;
  showCurrentLocation?: boolean;
  onLocationSelect?: (location: LocationData) => void;
}

export function MapIntegration({ 
  departure, 
  destination, 
  showCurrentLocation = true,
  onLocationSelect 
}: MapIntegrationProps) {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("La géolocalisation n'est pas supportée par votre navigateur");
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        const location: LocationData = {
          latitude,
          longitude,
          address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        };
        
        setCurrentLocation(location);
        if (onLocationSelect) {
          onLocationSelect(location);
        }
        
        setIsLoadingLocation(false);
      },
      (error) => {
        let errorMessage = "Erreur de géolocalisation";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Accès à la localisation refusé";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Position indisponible";
            break;
          case error.TIMEOUT:
            errorMessage = "Délai d'attente dépassé";
            break;
        }
        
        setLocationError(errorMessage);
        setIsLoadingLocation(false);
      }
    );
  };

  const calculateDistance = (loc1: LocationData, loc2: LocationData): number => {
    const R = 6371;
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const estimatedDuration = departure && destination ? 
    Math.round(calculateDistance(departure, destination) / 80 * 60) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-eco-blue" />
          Informations de trajet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showCurrentLocation && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Position actuelle</span>
              <Button
                variant="outline"
                size="sm"
                onClick={getCurrentLocation}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <div className="animate-spin w-4 h-4 border-2 border-eco-blue border-t-transparent rounded-full" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            {currentLocation && (
              <div className="p-2 bg-blue-50 rounded-lg text-sm text-blue-800">
                📍 {currentLocation.address}
              </div>
            )}
            
            {locationError && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-sm text-red-800">
                <AlertCircle className="w-4 h-4" />
                {locationError}
              </div>
            )}
          </div>
        )}

        {departure && destination && (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-eco-green rounded-full"></div>
                <span className="text-sm font-medium">Départ</span>
              </div>
              <div className="text-sm text-slate-600 ml-5">
                {departure.address}
              </div>
            </div>
            
            <div className="w-px h-4 bg-slate-300 ml-1.5"></div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-eco-blue rounded-full"></div>
                <span className="text-sm font-medium">Destination</span>
              </div>
              <div className="text-sm text-slate-600 ml-5">
                {destination.address}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600">
                  {calculateDistance(departure, destination).toFixed(0)} km
                </span>
              </div>
              
              {estimatedDuration && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-600">
                    ~{estimatedDuration} min
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Conditions météo</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              ☀️ Ensoleillé 22°C
            </Badge>
          </div>
        </div>

        {departure && destination && (
          <Button 
            className="w-full bg-eco-blue hover:bg-blue-600"
            onClick={() => {
              const url = `https://www.google.com/maps/dir/${departure.latitude},${departure.longitude}/${destination.latitude},${destination.longitude}`;
              window.open(url, '_blank');
            }}
          >
            <Navigation className="w-4 h-4 mr-2" />
            Ouvrir dans Google Maps
          </Button>
        )}
      </CardContent>
    </Card>
  );
}