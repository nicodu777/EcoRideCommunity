/**
 * Détail d'un covoiturage (US5) : trajet, véhicule (marque, modèle, énergie),
 * préférences du chauffeur (lues dans MongoDB) et avis publiés.
 */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import type { TripDetails } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { BookingModal } from "@/components/trip/booking-modal";
import { authService, AuthUser } from "@/lib/auth";
import { useTripActions } from "@/hooks/use-trip-actions";
import { useToast } from "@/hooks/use-toast";
import { ENERGY_LABELS, formatCredits } from "@/lib/labels";
import { Leaf, Star, Users, Clock, Cigarette, PawPrint, ArrowLeft } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";

export default function TripDetailsPage() {
  const [, params] = useRoute("/trips/:id");
  const [user, setUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [bookingOpen, setBookingOpen] = useState(false);
  const { bookTrip, bookingLoading } = useTripActions();
  const { toast } = useToast();

  useEffect(() => authService.onAuthStateChanged(setUser), []);

  const { data: trip, isLoading, error } = useQuery<TripDetails>({
    queryKey: [`/api/trips/${params?.id}`],
    enabled: !!params?.id,
  });

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (error || !trip) return <p className="text-center py-20 text-slate-700">Ce covoiturage est introuvable.</p>;

  const duration = differenceInMinutes(new Date(trip.arrivalTime), new Date(trip.departureTime));
  const canBook = trip.status === "pending" && trip.availableSeats > 0 && trip.driverId !== user?.profile?.id;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link href="/search" className="inline-flex items-center text-slate-600 hover:text-slate-900">
        <ArrowLeft size={16} className="mr-1" aria-hidden="true" /> Retour aux résultats
      </Link>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{trip.departure} → {trip.destination}</h1>
              <p className="text-slate-600 mt-1">
                {format(new Date(trip.departureTime), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                {" · arrivée "}{format(new Date(trip.arrivalTime), "HH:mm")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">{formatCredits(trip.pricePerSeat)}</p>
              <p className="text-sm text-slate-600">par place</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-slate-700">
            <span className="flex items-center gap-1"><Users size={16} aria-hidden="true" /> {trip.availableSeats} place(s) restante(s)</span>
            <span className="flex items-center gap-1"><Clock size={16} aria-hidden="true" /> {Math.floor(duration / 60)} h {String(duration % 60).padStart(2, "0")}</span>
            {trip.isEcological && <Badge className="bg-green-100 text-green-800"><Leaf size={14} className="mr-1" aria-hidden="true" /> Écologique</Badge>}
          </div>

          {trip.description && <p className="text-slate-700">{trip.description}</p>}

          {canBook && (
            <Button className="bg-eco-green hover:bg-green-600" onClick={() => {
              if (!user?.profile) {
                toast({ title: "Connexion requise", description: "Connectez-vous ou créez un compte pour participer.", variant: "destructive" });
                return;
              }
              setBookingOpen(true);
            }}>
              Participer à ce covoiturage
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Chauffeur et véhicule</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-slate-700">
            <p className="font-medium text-slate-900">{trip.driver.firstName} {trip.driver.lastName}</p>
            <p className="flex items-center gap-1">
              <Star size={16} className="text-yellow-500" aria-hidden="true" />
              {Number(trip.driver.averageRating).toFixed(1)} / 5 ({trip.driver.totalRatings} avis)
            </p>
            <p>{trip.vehicle.brand} {trip.vehicle.model} · {trip.vehicle.color} · {ENERGY_LABELS[trip.vehicle.energy]}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Préférences du chauffeur</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-slate-700">
            {trip.driverPreferences ? (
              <>
                <p className="flex items-center gap-2"><Cigarette size={16} aria-hidden="true" /> {trip.driverPreferences.smoker ? "Fumeur accepté" : "Non-fumeur"}</p>
                <p className="flex items-center gap-2"><PawPrint size={16} aria-hidden="true" /> {trip.driverPreferences.animals ? "Animaux acceptés" : "Pas d'animaux"}</p>
                {trip.driverPreferences.custom.length > 0 && (
                  <ul className="list-disc pl-5">
                    {trip.driverPreferences.custom.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                )}
              </>
            ) : (
              <p>Le chauffeur n'a pas encore indiqué ses préférences.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Avis des passagers</CardTitle></CardHeader>
        <CardContent>
          {trip.reviews.length === 0 ? (
            <p className="text-slate-600">Aucun avis publié pour ce chauffeur.</p>
          ) : (
            <ul className="divide-y">
              {trip.reviews.map((review) => (
                <li key={review.id} className="py-3">
                  <p className="font-medium text-slate-900" aria-label={`${review.rating} étoiles sur 5`}>
                    {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                  </p>
                  {/* React échappe automatiquement ce texte : un commentaire contenant du HTML ne s'exécute pas (anti-XSS) */}
                  {review.comment && <p className="text-slate-700">{review.comment}</p>}
                  <p className="text-xs text-slate-500">{format(new Date(review.createdAt), "d MMMM yyyy", { locale: fr })}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <BookingModal
        trip={bookingOpen ? trip : null}
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onConfirm={async (tripId, seats, message) => {
          if (await bookTrip(tripId, seats, message)) setBookingOpen(false);
        }}
        loading={bookingLoading}
        userCredits={Number(user?.profile?.credits ?? 0)}
      />
    </main>
  );
}
