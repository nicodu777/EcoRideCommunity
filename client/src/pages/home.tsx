/**
 * Page d'accueil (US1) : présentation d'EcoRide, barre de recherche
 * d'itinéraire et prochains covoiturages disponibles.
 */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import type { TripWithDriver } from "@shared/schema";
import { SearchForm } from "@/components/trip/search-form";
import { TripCard } from "@/components/trip/trip-card";
import { BookingModal } from "@/components/trip/booking-modal";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FloatingMessagesButton } from "@/components/ui/floating-messages-button";
import { authService, AuthUser } from "@/lib/auth";
import { useTripActions } from "@/hooks/use-trip-actions";
import { useToast } from "@/hooks/use-toast";
import { Leaf, Shield, Coins, Car } from "lucide-react";

const VALUES = [
  { icon: Leaf, title: "Écoresponsable", text: "Moins de voitures sur la route, moins de CO₂. Les trajets en véhicule électrique sont mis en avant." },
  { icon: Shield, title: "De confiance", text: "Avis vérifiés par notre équipe et chauffeurs notés par leurs passagers." },
  { icon: Coins, title: "Économique", text: "20 crédits offerts à l'inscription pour partager les frais de vos premiers trajets." },
];

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [selectedTrip, setSelectedTrip] = useState<TripWithDriver | null>(null);
  const [, navigate] = useLocation();
  const { bookTrip, bookingLoading } = useTripActions();
  const { toast } = useToast();

  useEffect(() => authService.onAuthStateChanged(setUser), []);

  const { data: trips = [], isLoading } = useQuery<TripWithDriver[]>({ queryKey: ["/api/trips"] });

  const handleSearch = (departure: string, destination: string, date?: string) => {
    const params = new URLSearchParams({ departure, destination, ...(date ? { date } : {}) });
    navigate(`/search?${params.toString()}`);
  };

  const handleBookTrip = (trip: TripWithDriver) => {
    if (!user?.profile) {
      toast({ title: "Connexion requise", description: "Connectez-vous ou créez un compte pour participer.", variant: "destructive" });
      return;
    }
    setSelectedTrip(trip);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Présentation de l'entreprise */}
        <section className="mb-10 grid gap-8 lg:grid-cols-2 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Covoiturez malin, roulez <span className="text-eco-green">vert</span>
            </h1>
            <p className="text-slate-700 text-lg mb-6">
              EcoRide est une start-up française qui veut réduire l'impact environnemental des déplacements
              en encourageant le covoiturage. Notre plateforme met en relation chauffeurs et passagers
              pour des trajets en voiture uniquement, avec une priorité aux véhicules électriques.
            </p>
            {!user && (
              <div className="flex gap-3">
                <Link href="/register"><Button className="bg-eco-green hover:bg-green-600">Créer un compte</Button></Link>
                <Link href="/login"><Button variant="outline">Se connecter</Button></Link>
              </div>
            )}
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-green-700 to-cyan-700 p-10 text-white flex flex-col items-center justify-center min-h-[220px]" aria-hidden="true">
            <Car size={72} />
            <Leaf size={40} className="mt-4" />
          </div>
        </section>

        {/* Barre de recherche d'itinéraire */}
        <section className="mb-12" aria-label="Rechercher un covoiturage">
          <SearchForm onSearch={handleSearch} />
        </section>

        {/* Prochains covoiturages */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Prochains covoiturages</h2>
            <Link href="/search" className="text-eco-green font-medium hover:text-green-700">Rechercher</Link>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : trips.length === 0 ? (
            <p className="text-slate-600">Aucun covoiturage à venir pour le moment.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.slice(0, 6).map((trip) => (
                <TripCard key={trip.id} trip={trip} onBook={handleBookTrip} showBookButton={trip.driverId !== user?.profile?.id} />
              ))}
            </div>
          )}
        </section>

        {/* Nos valeurs */}
        <section className="mb-12" aria-labelledby="values-title">
          <h2 id="values-title" className="sr-only">Nos valeurs</h2>
          <div className="bg-gradient-to-r from-green-700 to-cyan-700 rounded-2xl p-8 text-white grid grid-cols-1 md:grid-cols-3 gap-8">
            {VALUES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon size={32} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-white/90">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {user?.profile && <FloatingMessagesButton />}

      <BookingModal
        trip={selectedTrip}
        open={selectedTrip !== null}
        onClose={() => setSelectedTrip(null)}
        onConfirm={async (tripId, seats, message) => {
          if (await bookTrip(tripId, seats, message)) setSelectedTrip(null);
        }}
        loading={bookingLoading}
        userCredits={Number(user?.profile?.credits ?? 0)}
      />
    </div>
  );
}
