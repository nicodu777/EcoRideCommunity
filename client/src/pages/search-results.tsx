import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { TripWithDriver } from "@shared/schema";
import { SearchForm } from "@/components/trip/search-form";
import { TripCard } from "@/components/trip/trip-card";
import { BookingModal } from "@/components/trip/booking-modal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { authService, AuthUser } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Search, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SearchResults() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<TripWithDriver | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    departure: "",
    destination: "",
    date: "",
  });
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
    });

    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const departure = urlParams.get('departure') || '';
    const destination = urlParams.get('destination') || '';
    const date = urlParams.get('date') || '';

    if (departure || destination) {
      setSearchParams({ departure, destination, date });
      setHasSearched(true);
    }

    return unsubscribe;
  }, []);

  const { data: searchResults = [], isLoading, refetch } = useQuery<TripWithDriver[]>({
    queryKey: ['/api/trips/search', searchParams],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/trips/search", searchParams);
      return response.json();
    },
    enabled: hasSearched && !!(searchParams.departure && searchParams.destination),
  });

  const handleSearch = async (departure: string, destination: string, date?: string) => {
    const newParams = { departure, destination, date: date || "" };
    setSearchParams(newParams);
    setHasSearched(true);
    
    // Update URL
    const urlParams = new URLSearchParams();
    urlParams.set('departure', departure);
    urlParams.set('destination', destination);
    if (date) urlParams.set('date', date);
    
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
  };

  const handleBookTrip = (trip: TripWithDriver) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour réserver un trajet.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedTrip(trip);
    setShowBookingModal(true);
  };

  const handleConfirmBooking = async (
    tripId: number,
    seatsBooked: number,
    message: string,
    totalPrice: number
  ) => {
    if (!user?.profile) return;

    setBookingLoading(true);
    try {
      await apiRequest("POST", "/api/bookings", {
        tripId,
        passengerId: user.profile.id,
        seatsBooked,
        totalPrice,
        message: message || undefined,
      });

      toast({
        title: "Réservation confirmée",
        description: "Votre réservation a été enregistrée avec succès.",
      });

      setShowBookingModal(false);
      setSelectedTrip(null);
      refetch(); // Refresh results to show updated available seats
    } catch (error) {
      console.error("Error booking trip:", error);
      toast({
        title: "Erreur",
        description: "Impossible de confirmer la réservation. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <section className="mb-8">
          <SearchForm
            onSearch={handleSearch}
            loading={isLoading}
          />
        </section>

        {/* Search Results */}
        {hasSearched && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Résultats de recherche
                </h2>
                {searchParams.departure && searchParams.destination && (
                  <p className="text-slate-600 mt-1">
                    <MapPin className="inline mr-1" size={16} />
                    {searchParams.departure} → {searchParams.destination}
                    {searchParams.date && ` • ${searchParams.date}`}
                  </p>
                )}
              </div>
              {!isLoading && (
                <span className="text-sm text-slate-600">
                  {searchResults.length} trajet{searchResults.length > 1 ? 's' : ''} trouvé{searchResults.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : searchResults.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Aucun trajet trouvé
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Nous n'avons trouvé aucun trajet correspondant à vos critères.
                    Essayez de modifier votre recherche ou vérifiez vos dates.
                  </p>
                  <div className="text-sm text-slate-500">
                    💡 Astuce : Essayez de rechercher avec des villes plus grandes
                    ou des dates légèrement différentes.
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onBook={handleBookTrip}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {!hasSearched && (
          <section className="text-center py-12">
            <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-slate-900 mb-2">
              Recherchez votre trajet
            </h2>
            <p className="text-slate-600">
              Utilisez le formulaire ci-dessus pour trouver des trajets écoresponsables.
            </p>
          </section>
        )}
      </div>

      <BookingModal
        trip={selectedTrip}
        open={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setSelectedTrip(null);
        }}
        onConfirm={handleConfirmBooking}
        loading={bookingLoading}
      />
    </div>
  );
}
