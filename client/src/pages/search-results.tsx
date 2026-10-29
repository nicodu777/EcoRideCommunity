/**
 * Page « Covoiturages » : recherche (US3) et filtres (US4).
 *
 * La recherche et les filtres sont envoyés au serveur, qui renvoie les
 * trajets correspondants avec au moins une place libre. Si aucun trajet
 * n'existe à la date demandée, le serveur propose la date la plus proche.
 */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TripWithDriver, SearchTripsResponse, SearchTrip } from "@shared/schema";
import { SearchForm } from "@/components/trip/search-form";
import { TripCard } from "@/components/trip/trip-card";
import { BookingModal } from "@/components/trip/booking-modal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { authService, AuthUser } from "@/lib/auth";
import { apiJson } from "@/lib/queryClient";
import { useTripActions } from "@/hooks/use-trip-actions";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Filters = Pick<SearchTrip, "ecologicalOnly" | "maxPrice" | "maxDurationMinutes" | "minRating">;

/** Convertit un champ de saisie numérique en nombre (ou undefined s'il est vide). */
const toNumber = (value: string) => (value === "" ? undefined : Number(value));

export default function SearchResults() {
  const [user, setUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [selectedTrip, setSelectedTrip] = useState<TripWithDriver | null>(null);
  const [criteria, setCriteria] = useState({ departure: "", destination: "", date: "" });
  const [filters, setFilters] = useState<Filters>({});
  const { bookTrip, bookingLoading } = useTripActions();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(setUser);
    // Les critères peuvent venir de l'URL (formulaire de la page d'accueil)
    const params = new URLSearchParams(window.location.search);
    setCriteria({
      departure: params.get("departure") ?? "",
      destination: params.get("destination") ?? "",
      date: params.get("date") ?? "",
    });
    return unsubscribe;
  }, []);

  const hasSearched = Boolean(criteria.departure && criteria.destination);
  const searchBody = { ...criteria, ...filters };

  const { data, isLoading } = useQuery<SearchTripsResponse>({
    queryKey: ["/api/trips/search", searchBody],
    queryFn: () => apiJson("POST", "/api/trips/search", searchBody),
    enabled: hasSearched,
  });
  const trips = data?.trips ?? [];

  const handleSearch = (departure: string, destination: string, date?: string) => {
    const next = { departure, destination, date: date ?? "" };
    setCriteria(next);
    const url = new URLSearchParams({ departure, destination, ...(date ? { date } : {}) });
    window.history.replaceState({}, "", `/search?${url.toString()}`);
  };

  const handleBookTrip = (trip: TripWithDriver) => {
    if (!user?.profile) {
      toast({ title: "Connexion requise", description: "Connectez-vous ou créez un compte pour participer.", variant: "destructive" });
      return;
    }
    setSelectedTrip(trip);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-6">
          <SearchForm onSearch={handleSearch} loading={isLoading} initialValues={criteria} />
        </section>

        {hasSearched && (
          <section aria-labelledby="filters-title" className="mb-8">
            <Card>
              <CardContent className="p-4">
                <h2 id="filters-title" className="text-sm font-semibold text-slate-900 mb-3">Filtres</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="eco"
                      checked={filters.ecologicalOnly ?? false}
                      onCheckedChange={(checked) => setFilters({ ...filters, ecologicalOnly: checked || undefined })}
                    />
                    <Label htmlFor="eco">Trajets écologiques uniquement</Label>
                  </div>
                  <div>
                    <Label htmlFor="maxPrice">Prix maximum (crédits)</Label>
                    <Input id="maxPrice" type="number" min={1} value={filters.maxPrice ?? ""} onChange={(e) => setFilters({ ...filters, maxPrice: toNumber(e.target.value) })} />
                  </div>
                  <div>
                    <Label htmlFor="maxDuration">Durée maximum (heures)</Label>
                    <Input id="maxDuration" type="number" min={1} step={0.5}
                      value={filters.maxDurationMinutes ? filters.maxDurationMinutes / 60 : ""}
                      onChange={(e) => {
                        const hours = toNumber(e.target.value);
                        setFilters({ ...filters, maxDurationMinutes: hours ? Math.round(hours * 60) : undefined });
                      }} />
                  </div>
                  <div>
                    <Label htmlFor="minRating">Note minimale du chauffeur</Label>
                    <Input id="minRating" type="number" min={0} max={5} step={0.5} value={filters.minRating ?? ""} onChange={(e) => setFilters({ ...filters, minRating: toNumber(e.target.value) })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {hasSearched ? (
          <section aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Covoiturages disponibles</h1>
                <p className="text-slate-600 mt-1">
                  <MapPin className="inline mr-1" size={16} aria-hidden="true" />
                  {criteria.departure} → {criteria.destination}
                  {criteria.date && ` • ${format(new Date(criteria.date), "d MMMM yyyy", { locale: fr })}`}
                </p>
              </div>
              {!isLoading && (
                <span className="text-sm text-slate-600">
                  {trips.length} trajet{trips.length > 1 ? "s" : ""} trouvé{trips.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
            ) : trips.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center space-y-4">
                  <Search className="w-16 h-16 text-slate-300 mx-auto" aria-hidden="true" />
                  <h2 className="text-lg font-medium text-slate-900">Aucun covoiturage ne correspond à votre recherche</h2>
                  {data?.suggestedDate ? (
                    <>
                      <p className="text-slate-600">
                        Un trajet est disponible le {format(new Date(data.suggestedDate), "EEEE d MMMM yyyy", { locale: fr })}.
                      </p>
                      <Button className="bg-eco-green hover:bg-green-600" onClick={() => handleSearch(criteria.departure, criteria.destination, data.suggestedDate!)}>
                        <CalendarClock className="mr-2" size={16} aria-hidden="true" /> Voir les trajets de cette date
                      </Button>
                    </>
                  ) : (
                    <p className="text-slate-600">Essayez d'élargir vos filtres ou de modifier les villes.</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} onBook={handleBookTrip} showBookButton={trip.driverId !== user?.profile?.id} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="text-center py-12">
            <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" aria-hidden="true" />
            <h1 className="text-xl font-medium text-slate-900 mb-2">Recherchez votre covoiturage</h1>
            <p className="text-slate-600">Indiquez une ville de départ et d'arrivée pour voir les trajets disponibles.</p>
          </section>
        )}
      </div>

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
