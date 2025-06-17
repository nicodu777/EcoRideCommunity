import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { authService, AuthUser } from "@/lib/auth";
import { Trip, BookingWithTrip } from "@shared/schema";
import { TripCard } from "@/components/trip/trip-card";
import { PublishModal } from "@/components/trip/publish-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Plus, Car, Calendar, User, Star, Settings, LogOut } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Dashboard() {
  const [user, setUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [location] = useLocation();
  const { toast } = useToast();

  // Déterminer l'onglet actif basé sur les paramètres d'URL
  const getActiveTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    
    if (tab === 'publish') {
      // Ouvrir le modal de publication pour mobile
      if (!showPublishModal) {
        setShowPublishModal(true);
      }
      return 'trips';
    }
    
    switch (tab) {
      case 'profile':
        return 'profile';
      case 'bookings':
        return 'bookings';
      default:
        return 'trips';
    }
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
    });

    return unsubscribe;
  }, []);

  // Écouter les changements d'URL pour mobile
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location]);

  const { data: myTrips = [], isLoading: tripsLoading, error: tripsError } = useQuery<Trip[]>({
    queryKey: [`/api/trips/driver/${user?.profile?.id}`],
    enabled: !!user?.profile?.id,
  });

  const { data: myBookings = [], isLoading: bookingsLoading } = useQuery<BookingWithTrip[]>({
    queryKey: [`/api/bookings/passenger/${user?.profile?.id}`],
    enabled: !!user?.profile?.id,
    staleTime: 0,
    refetchOnMount: true,
  });



  const handlePublishTrip = async (tripData: any) => {
    if (!user?.profile) return;

    setPublishLoading(true);
    try {
      await apiRequest("POST", "/api/trips", {
        ...tripData,
        driverId: user.profile.id,
      });

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/trips/driver/${user.profile.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/passenger/${user.profile.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmé';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulé';
      case 'completed':
        return 'Terminé';
      case 'started':
        return 'En cours';
      default:
        return status;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'started':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStartTrip = async (tripId: number) => {
    if (!user?.profile) return;

    try {
      await apiRequest("PUT", `/api/trips/${tripId}/start`, {
        driverId: user.profile.id,
      });

      toast({
        title: "Trajet démarré",
        description: "Votre trajet a été démarré avec succès. Bon voyage !",
      });

      // Refresh trips data
      queryClient.invalidateQueries({ queryKey: ['/api/trips/driver', user.profile.id] });
    } catch (error) {
      console.error("Error starting trip:", error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer le trajet. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteTrip = async (tripId: number) => {
    if (!user?.profile) return;

    try {
      await apiRequest("PUT", `/api/trips/${tripId}/complete`, {
        driverId: user.profile.id,
      });

      toast({
        title: "Trajet terminé",
        description: "Votre trajet a été marqué comme terminé. Les crédits ont été ajoutés à votre compte.",
      });

      // Refresh trips data
      queryClient.invalidateQueries({ queryKey: ['/api/trips/driver', user.profile.id] });
    } catch (error) {
      console.error("Error completing trip:", error);
      toast({
        title: "Erreur",
        description: "Impossible de terminer le trajet. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user.profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Chargement du profil...</h2>
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Bonjour, {user.profile?.firstName || user.displayName || 'Utilisateur'} !
          </h1>
          <p className="text-slate-600 mt-2">
            Gérez vos trajets et réservations depuis votre tableau de bord.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <Car className="w-8 h-8 text-eco-green mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-900">{myTrips.length}</div>
              <div className="text-sm text-slate-600">Trajets publiés</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="w-8 h-8 text-eco-blue mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-900">{myBookings.length}</div>
              <div className="text-sm text-slate-600">Réservations</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-900">
                {user.profile && user.profile.averageRating ? parseFloat(user.profile.averageRating).toFixed(1) : '0.0'}
              </div>
              <div className="text-sm text-slate-600">Note moyenne</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <User className="w-8 h-8 text-eco-trust mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-900">
                {user.profile?.totalRatings || 0}
              </div>
              <div className="text-sm text-slate-600">Évaluations</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trips">Mes trajets</TabsTrigger>
            <TabsTrigger value="bookings">Mes réservations</TabsTrigger>
            <TabsTrigger value="profile">Profil</TabsTrigger>
          </TabsList>

          <TabsContent value="trips" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Trajets publiés</h2>
              <Button
                onClick={() => setShowPublishModal(true)}
                className="bg-eco-green hover:bg-green-600"
              >
                <Plus className="mr-2" size={16} />
                Publier un trajet
              </Button>
            </div>

            {tripsLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : myTrips.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Car className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Aucun trajet publié
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Commencez par publier votre premier trajet pour partager vos déplacements.
                  </p>
                  <Button
                    onClick={() => setShowPublishModal(true)}
                    className="bg-eco-green hover:bg-green-600"
                  >
                    <Plus className="mr-2" size={16} />
                    Publier mon premier trajet
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myTrips.map((trip) => (
                  <Card key={trip.id}>
                    <CardContent className="p-6">
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-eco-green rounded-full"></div>
                          <span className="text-slate-900 font-medium">{trip.departure}</span>
                        </div>
                        <div className="w-px h-6 bg-slate-300 ml-1.5"></div>
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-eco-blue rounded-full"></div>
                          <span className="text-slate-900 font-medium">{trip.destination}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-slate-600">
                          {format(new Date(trip.departureTime), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                          {parseFloat(trip.pricePerSeat).toFixed(0)}€
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-600">
                          {trip.availableSeats} / {trip.totalSeats} places libres
                        </span>
                        <Badge className={getStatusBadgeColor((trip as any).status || 'pending')}>
                          {getStatusText((trip as any).status || 'pending')}
                        </Badge>
                      </div>
                      
                      {/* Trip Management Buttons */}
                      <div className="flex gap-2">
                        {((trip as any).status === 'pending' || !(trip as any).status) && (
                          <Button
                            size="sm"
                            onClick={() => handleStartTrip(trip.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            Démarrer
                          </Button>
                        )}
                        {(trip as any).status === 'started' && (
                          <Button
                            size="sm"
                            onClick={() => handleCompleteTrip(trip.id)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                          >
                            Arrivée à destination
                          </Button>
                        )}
                        {(trip as any).status === 'completed' && (
                          <Badge className="flex-1 text-center bg-gray-100 text-gray-800">
                            Trajet terminé
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Mes réservations</h2>

            {bookingsLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : myBookings.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Aucune réservation
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Vous n'avez pas encore réservé de trajet. Recherchez un trajet pour commencer !
                  </p>
                  <Button className="bg-eco-green hover:bg-green-600">
                    Rechercher un trajet
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myBookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-3 h-3 bg-eco-green rounded-full"></div>
                            <span className="text-slate-900 font-medium">
                              {booking.trip.departure}
                            </span>
                          </div>
                          <div className="w-px h-6 bg-slate-300 ml-1.5"></div>
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-3 h-3 bg-eco-blue rounded-full"></div>
                            <span className="text-slate-900 font-medium">
                              {booking.trip.destination}
                            </span>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-slate-600">
                            <span>
                              {format(new Date(booking.trip.departureTime), 'dd MMM yyyy à HH:mm', { locale: fr })}
                            </span>
                            <span>{booking.seatsBooked} place{booking.seatsBooked > 1 ? 's' : ''}</span>
                            <span className="font-medium text-slate-900">
                              {parseFloat(booking.totalPrice).toFixed(0)}€
                            </span>
                          </div>
                        </div>

                        <Badge className={getStatusColor(booking.status)}>
                          {getStatusText(booking.status)}
                        </Badge>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-slate-600">Conducteur:</span>
                          <span className="text-sm font-medium text-slate-900">
                            {booking.trip.driver.firstName} {booking.trip.driver.lastName}
                          </span>
                          <div className="flex items-center space-x-1">
                            <Star className="text-yellow-400" size={14} />
                            <span className="text-sm text-slate-600">
                              {booking.trip.driver.averageRating && booking.trip.driver.averageRating !== null ? parseFloat(booking.trip.driver.averageRating).toFixed(1) : '0.0'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <div className="max-w-2xl">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Mon profil</h2>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-eco-green" />
                    <span>Informations personnelles</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Prénom</label>
                      <p className="text-slate-900 mt-1">{user.profile?.firstName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Nom</label>
                      <p className="text-slate-900 mt-1">{user.profile?.lastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Email</label>
                      <p className="text-slate-900 mt-1">{user.profile?.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Téléphone</label>
                      <p className="text-slate-900 mt-1">{user.profile?.phone || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Rôle</label>
                      <Badge variant="outline" className="mt-1">
                        {user.profile?.role === 'admin' ? 'Administrateur' : 
                         user.profile?.role === 'employee' ? 'Employé' : 'Utilisateur'}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Membre depuis</label>
                      <p className="text-slate-900 mt-1">
                        {user.profile?.createdAt ? 
                          format(new Date(user.profile.createdAt), 'dd MMMM yyyy', { locale: fr }) : 
                          'Date inconnue'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <span>Évaluations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900">
                        {user.profile?.averageRating ? parseFloat(user.profile.averageRating).toFixed(1) : '0.0'}
                      </div>
                      <div className="text-sm text-slate-600">Note moyenne</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900">
                        {user.profile?.totalRatings || 0}
                      </div>
                      <div className="text-sm text-slate-600">Évaluations reçues</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900">
                        {user.profile?.credits ? parseFloat(user.profile.credits).toFixed(0) : '0'}€
                      </div>
                      <div className="text-sm text-slate-600">Crédits</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-slate-600" />
                    <span>Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      toast({
                        title: "Fonctionnalité en cours de développement",
                        description: "La modification de profil sera bientôt disponible.",
                      });
                    }}
                  >
                    <Settings className="mr-2 w-4 h-4" />
                    Modifier mes informations
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={async () => {
                      try {
                        await authService.logout();
                        toast({
                          title: "Déconnexion réussie",
                          description: "À bientôt sur EcoRide !",
                        });
                      } catch (error) {
                        toast({
                          title: "Erreur",
                          description: "Impossible de se déconnecter.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <LogOut className="mr-2 w-4 h-4" />
                    Se déconnecter
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <PublishModal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onPublish={handlePublishTrip}
        loading={publishLoading}
      />
    </div>
  );
}
