import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { TripWithDriver } from "@shared/schema";
import { SearchForm } from "@/components/trip/search-form";
import { TripCard } from "@/components/trip/trip-card";
import { BookingModal } from "@/components/trip/booking-modal";
import { PublishModal } from "@/components/trip/publish-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { authService, AuthUser } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Plus, MessageSquare, Leaf, Shield, Euro, Car, Search as SearchIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FloatingMessagesButton } from "@/components/ui/floating-messages-button";

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeRole, setActiveRole] = useState<'passenger' | 'driver'>('passenger');
  const [selectedTrip, setSelectedTrip] = useState<TripWithDriver | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
    });

    return unsubscribe;
  }, []);

  const { data: trips = [], isLoading } = useQuery<TripWithDriver[]>({
    queryKey: ['/api/trips'],
  });

  const handleSearch = (departure: string, destination: string, date?: string) => {
    const searchParams = new URLSearchParams({
      departure,
      destination,
      ...(date && { date }),
    });
    
    window.location.href = `/search?${searchParams.toString()}`;
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
        totalPrice: totalPrice.toString(),
        message: message || null,
      });

      // Invalidate queries to refresh the data
      const { queryClient } = await import("@/lib/queryClient");
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/passenger/${user.profile.id}`] });

      toast({
        title: "Réservation confirmée",
        description: "Votre réservation a été enregistrée avec succès.",
      });

      setShowBookingModal(false);
      setSelectedTrip(null);
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

  const handlePublishTrip = async (tripData: any) => {
    if (!user?.profile) return;

    setPublishLoading(true);
    try {
      await apiRequest("POST", "/api/trips", {
        ...tripData,
        driverId: user.profile.id,
      });

      // Invalidate the trips cache to refresh the list
      const { queryClient } = await import("@/lib/queryClient");
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/passenger/${user.profile.id}`] });

      toast({
        title: "Trajet publié",
        description: "Votre trajet a été publié avec succès.",
      });

      setShowPublishModal(false);
    } catch (error) {
      console.error("Error publishing trip:", error);
      toast({
        title: "Erreur",
        description: "Impossible de publier le trajet. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setPublishLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Role Toggle Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-0">
            <button
              onClick={() => setActiveRole('passenger')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeRole === 'passenger'
                  ? 'text-eco-green border-eco-green bg-green-50'
                  : 'text-slate-600 border-transparent hover:text-eco-green'
              }`}
            >
              <SearchIcon className="inline mr-2" size={16} />
              Je cherche un trajet
            </button>
            <button
              onClick={() => setActiveRole('driver')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeRole === 'driver'
                  ? 'text-eco-green border-eco-green bg-green-50'
                  : 'text-slate-600 border-transparent hover:text-eco-green'
              }`}
            >
              <Car className="inline mr-2" size={16} />
              Je propose un trajet
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section for Passengers */}
        {activeRole === 'passenger' && (
          <section className="mb-12">
            <SearchForm onSearch={handleSearch} />
            
            {/* Quick Stats */}
            <div className="mt-6 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-eco-green">2,847</div>
                <div className="text-sm text-slate-600">Trajets disponibles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-eco-blue">15.2T</div>
                <div className="text-sm text-slate-600">CO₂ économisé</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-eco-trust">12,496</div>
                <div className="text-sm text-slate-600">Utilisateurs actifs</div>
              </div>
            </div>
          </section>
        )}

        {/* Publish Section for Drivers */}
        {activeRole === 'driver' && (
          <section className="mb-12">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-eco-green bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Car size={40} className="text-eco-green" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">
                  Proposez votre trajet
                </h2>
                <p className="text-slate-600 mb-6">
                  Partagez vos frais de transport et aidez d'autres voyageurs en proposant vos trajets disponibles.
                </p>
                {user ? (
                  <Button 
                    size="lg"
                    className="bg-eco-green hover:bg-green-600 text-white px-8 py-3"
                    onClick={() => setShowPublishModal(true)}
                  >
                    <Plus className="mr-2" size={20} />
                    Publier un trajet
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-slate-500 text-sm">Connectez-vous pour publier un trajet</p>
                    <div className="flex space-x-3 justify-center">
                      <Link href="/login">
                        <Button variant="outline">Se connecter</Button>
                      </Link>
                      <Link href="/register">
                        <Button className="bg-eco-green hover:bg-green-600">S'inscrire</Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Popular Routes Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900">Trajets populaires</h3>
            <Link href="/search">
              <span className="text-eco-green font-medium hover:text-green-600 transition-colors cursor-pointer">
                Voir tous
              </span>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.slice(0, 6).map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onBook={handleBookTrip}
                />
              ))}
            </div>
          )}
        </section>

        {/* Features Section */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-eco-green to-eco-blue rounded-2xl p-8 text-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Leaf size={32} />
                </div>
                <h4 className="text-lg font-semibold mb-2">Écoresponsable</h4>
                <p className="text-white text-opacity-90">
                  Réduisez votre empreinte carbone en partageant vos trajets
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield size={32} />
                </div>
                <h4 className="text-lg font-semibold mb-2">Sécurisé</h4>
                <p className="text-white text-opacity-90">
                  Profils vérifiés et système de notation pour votre sécurité
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Euro size={32} />
                </div>
                <h4 className="text-lg font-semibold mb-2">Économique</h4>
                <p className="text-white text-opacity-90">
                  Partagez les frais et voyagez à prix réduit
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quick Action Buttons */}
      {user && (
        <div className="hidden lg:block fixed right-6 bottom-6 space-y-4">
          <Button
            size="lg"
            className="w-14 h-14 bg-eco-green hover:bg-green-600 rounded-full shadow-lg"
            onClick={() => setShowPublishModal(true)}
            title="Publier un trajet"
          >
            <Plus size={20} />
          </Button>
        </div>
      )}

      {/* Floating Messages Button */}
      {user?.profile && <FloatingMessagesButton userId={user.profile.id} />}

      {/* Modals */}
      <BookingModal
        trip={selectedTrip}
        open={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setSelectedTrip(null);
        }}
        onConfirm={handleConfirmBooking}
        loading={bookingLoading}
        userCredits={user?.profile?.credits ? parseFloat(user.profile.credits) : 0}
      />

      <PublishModal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onPublish={handlePublishTrip}
        loading={publishLoading}
      />
    </div>
  );
}
