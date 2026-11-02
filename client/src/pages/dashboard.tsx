/**
 * Espace utilisateur (US8 à US11).
 *
 * Onglets :
 * - Mes trajets (chauffeur) : publier, démarrer, arrivée, annuler ;
 * - Mes réservations (passager) : historique, annulation, validation, avis ;
 * - Véhicules & préférences (chauffeur) ;
 * - Profil : rôle (passager / chauffeur / les deux) et solde de crédits.
 */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import type { TripWithDriver, BookingWithTrip, RegisterUser } from "@shared/schema";
import { authService, AuthUser } from "@/lib/auth";
import { apiJson } from "@/lib/queryClient";
import { useTripActions } from "@/hooks/use-trip-actions";
import { useToast } from "@/hooks/use-toast";
import { PublishModal } from "@/components/trip/publish-modal";
import { ChatWindow } from "@/components/chat/chat-window";
import { DriverTripItem } from "@/components/dashboard/driver-trip-item";
import { BookingItem } from "@/components/dashboard/booking-item";
import { VehicleManager } from "@/components/dashboard/vehicle-manager";
import { PreferencesForm } from "@/components/dashboard/preferences-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ROLE_LABELS, formatCredits } from "@/lib/labels";
import { Plus, Car, Calendar, Star, Coins, LogOut, Shield } from "lucide-react";

const TABS = ["trips", "bookings", "vehicles", "profile"] as const;
type Tab = (typeof TABS)[number];

export default function Dashboard() {
  const [user, setUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("bookings");
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [chatTripId, setChatTripId] = useState<number | null>(null);
  const { publishTrip, publishLoading, refresh } = useTripActions();
  const { toast } = useToast();

  useEffect(() => authService.onAuthStateChanged(setUser), []);

  const profile = user?.profile;
  const isDriver = profile?.role === "driver" || profile?.role === "both";

  // Onglet choisi dans l'URL (?tab=...) - utilisé par la navigation mobile
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "publish") {
      setActiveTab("trips");
      setShowPublishModal(true);
    } else if (TABS.includes(tab as Tab)) {
      setActiveTab(tab as Tab);
    } else if (isDriver) {
      setActiveTab("trips");
    }
  }, [location, isDriver]);

  const { data: myTrips = [], isLoading: tripsLoading } = useQuery<TripWithDriver[]>({
    queryKey: ["/api/trips/mine"],
    enabled: isDriver,
  });
  const { data: myBookings = [], isLoading: bookingsLoading } = useQuery<BookingWithTrip[]>({
    queryKey: ["/api/bookings/mine"],
    enabled: !!profile,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-700">Connectez-vous pour accéder à votre espace.</p>
        <Link href="/login"><Button className="bg-eco-green hover:bg-green-600">Se connecter</Button></Link>
      </div>
    );
  }
  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  const changeRole = async (role: RegisterUser["role"]) => {
    try {
      await apiJson("PATCH", "/api/users/me", { role });
      await refresh();
      toast({ title: "Profil mis à jour", description: `Vous êtes maintenant : ${ROLE_LABELS[role].toLowerCase()}.` });
    } catch (error) {
      toast({ title: "Modification impossible", description: (error as Error).message, variant: "destructive" });
    }
  };

  const stats = [
    { icon: Coins, label: "Crédits", value: formatCredits(profile.credits) },
    { icon: Car, label: "Trajets proposés", value: myTrips.length },
    { icon: Calendar, label: "Réservations", value: myBookings.length },
    { icon: Star, label: "Note moyenne", value: `${Number(profile.averageRating).toFixed(1)} (${profile.totalRatings})` },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-900">Bonjour, {profile.firstName} !</h1>
        <p className="text-slate-600 mt-2 mb-8">Gérez vos trajets, vos réservations et votre profil.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map(({ icon: Icon, label, value }) => (
            <Card key={label}>
              <CardContent className="p-5 text-center">
                <Icon className="w-7 h-7 text-eco-green mx-auto mb-2" aria-hidden="true" />
                <div className="text-xl font-bold text-slate-900">{value}</div>
                <div className="text-sm text-slate-600">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={(t) => { setActiveTab(t as Tab); navigate(`/dashboard?tab=${t}`); }} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
            <TabsTrigger value="trips">Mes trajets</TabsTrigger>
            <TabsTrigger value="bookings">Mes réservations</TabsTrigger>
            <TabsTrigger value="vehicles">Véhicules</TabsTrigger>
            <TabsTrigger value="profile">Profil</TabsTrigger>
          </TabsList>

          <TabsContent value="trips" className="space-y-6">
            {!isDriver ? (
              <Card><CardContent className="p-8 text-center text-slate-700">
                Passez votre profil en « chauffeur » (onglet Profil) pour proposer des trajets.
              </CardContent></Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">Trajets proposés</h2>
                  <Button onClick={() => setShowPublishModal(true)} className="bg-eco-green hover:bg-green-600">
                    <Plus className="mr-2" size={16} aria-hidden="true" /> Publier un trajet
                  </Button>
                </div>
                {tripsLoading ? <LoadingSpinner size="lg" /> : myTrips.length === 0 ? (
                  <p className="text-slate-600">Vous n'avez encore proposé aucun trajet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myTrips.map((trip) => <DriverTripItem key={trip.id} trip={trip} onOpenChat={setChatTripId} />)}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Historique de mes covoiturages</h2>
            {bookingsLoading ? <LoadingSpinner size="lg" /> : myBookings.length === 0 ? (
              <Card><CardContent className="p-8 text-center space-y-4">
                <p className="text-slate-700">Vous n'avez encore réservé aucun trajet.</p>
                <Link href="/search"><Button className="bg-eco-green hover:bg-green-600">Rechercher un trajet</Button></Link>
              </CardContent></Card>
            ) : (
              myBookings.map((booking) => <BookingItem key={booking.id} booking={booking} onOpenChat={setChatTripId} />)
            )}
          </TabsContent>

          <TabsContent value="vehicles" className="space-y-6">
            {isDriver ? (
              <>
                <VehicleManager />
                <PreferencesForm />
              </>
            ) : (
              <Card><CardContent className="p-8 text-center text-slate-700">
                Les véhicules et préférences concernent les chauffeurs. Changez votre rôle dans l'onglet Profil.
              </CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-6 max-w-2xl">
            <Card>
              <CardHeader><CardTitle>Mes informations</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-slate-700">
                <p><span className="font-medium">Nom :</span> {profile.firstName} {profile.lastName}</p>
                <p><span className="font-medium">Email :</span> {profile.email}</p>
                <p><span className="font-medium">Téléphone :</span> {profile.phone || "non renseigné"}</p>
              </CardContent>
            </Card>

            {profile.role !== "admin" && (
              <Card>
                <CardHeader><CardTitle>Je souhaite être…</CardTitle></CardHeader>
                <CardContent>
                  <RadioGroup value={profile.role} onValueChange={(role) => changeRole(role as RegisterUser["role"])} className="space-y-2">
                    {(["passenger", "driver", "both"] as const).map((role) => (
                      <div key={role} className="flex items-center gap-2">
                        <RadioGroupItem value={role} id={`role-${role}`} />
                        <Label htmlFor={`role-${role}`}>{ROLE_LABELS[role]}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col gap-3">
              {profile.role === "admin" && (
                <Link href="/admin"><Button variant="outline" className="w-full justify-start"><Shield className="mr-2 w-4 h-4" aria-hidden="true" /> Administration</Button></Link>
              )}
              <Button variant="outline" className="justify-start text-red-700" onClick={() => authService.logout().then(() => navigate("/"))}>
                <LogOut className="mr-2 w-4 h-4" aria-hidden="true" /> Se déconnecter
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <PublishModal
          open={showPublishModal}
          onClose={() => !publishLoading && setShowPublishModal(false)}
          onPublish={async (trip) => { if (await publishTrip(trip)) setShowPublishModal(false); }}
          loading={publishLoading}
        />

        {chatTripId !== null && (
          <ChatWindow tripId={chatTripId} userId={profile.id} isOpen onClose={() => setChatTripId(null)} />
        )}
      </div>
    </div>
  );
}
