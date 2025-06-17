import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { authService, AuthUser } from "@/lib/auth";
import { Rating, TripIssue } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertTriangle, Star } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function EmployeeDashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const { data: pendingRatings = [], isLoading: ratingsLoading } = useQuery<Rating[]>({
    queryKey: ['/api/ratings/pending'],
    enabled: !!user?.profile?.id && user?.profile?.role === 'employee',
  });

  const { data: tripIssues = [], isLoading: issuesLoading } = useQuery<TripIssue[]>({
    queryKey: ['/api/trip-issues'],
    enabled: !!user?.profile?.id && user?.profile?.role === 'employee',
  });

  const handleApproveRating = async (ratingId: number) => {
    if (!user?.profile) return;

    try {
      await apiRequest("PUT", `/api/ratings/${ratingId}/approve`, {
        employeeId: user.profile.id,
      });

      toast({
        title: "Avis approuvé",
        description: "L'avis a été approuvé et sera visible publiquement.",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/ratings/pending'] });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'approuver l'avis.",
        variant: "destructive",
      });
    }
  };

  const handleRejectRating = async (ratingId: number) => {
    if (!user?.profile) return;

    try {
      await apiRequest("PUT", `/api/ratings/${ratingId}/reject`, {
        employeeId: user.profile.id,
      });

      toast({
        title: "Avis rejeté",
        description: "L'avis a été rejeté et ne sera pas visible.",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/ratings/pending'] });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de rejeter l'avis.",
        variant: "destructive",
      });
    }
  };

  const handleResolveIssue = async (issueId: number, resolution: string) => {
    if (!user?.profile) return;

    try {
      await apiRequest("PUT", `/api/trip-issues/${issueId}/resolve`, {
        employeeId: user.profile.id,
        resolution,
      });

      toast({
        title: "Problème résolu",
        description: "Le problème a été marqué comme résolu.",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/trip-issues'] });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de résoudre le problème.",
        variant: "destructive",
      });
    }
  };

  if (!user || user.profile?.role !== 'employee') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Accès refusé</h2>
            <p className="text-slate-600">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Espace Employé
          </h1>
          <p className="text-slate-600 mt-2">
            Gérez les avis des utilisateurs et résolvez les problèmes signalés.
          </p>
        </div>

        <Tabs defaultValue="ratings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ratings">
              Avis en attente ({pendingRatings.length})
            </TabsTrigger>
            <TabsTrigger value="issues">
              Problèmes signalés ({tripIssues.filter(i => i.status === 'pending').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ratings" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Avis en attente de validation</h2>
            </div>

            {ratingsLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : pendingRatings.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Star className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Aucun avis en attente
                  </h3>
                  <p className="text-slate-600">
                    Tous les avis ont été traités. Revenez plus tard pour de nouveaux avis à valider.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingRatings.map((rating) => (
                  <Card key={rating.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < rating.rating
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-slate-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-slate-600">
                              {rating.rating}/5
                            </span>
                          </div>
                          
                          {rating.comment && (
                            <p className="text-slate-900 mb-3">{rating.comment}</p>
                          )}
                          
                          <div className="text-sm text-slate-600">
                            Trajet #{rating.tripId} • {format(new Date(rating.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveRating(rating.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectRating(rating.id)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Rejeter
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="issues" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Problèmes signalés</h2>
            </div>

            {issuesLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : tripIssues.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Aucun problème signalé
                  </h3>
                  <p className="text-slate-600">
                    Excellent ! Aucun problème n'a été signalé récemment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tripIssues.map((issue) => (
                  <Card key={issue.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-3">
                            <Badge className={
                              issue.status === 'resolved' 
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }>
                              {issue.status === 'resolved' ? 'Résolu' : 'En attente'}
                            </Badge>
                            <span className="text-sm text-slate-600">
                              Trajet #{issue.tripId}
                            </span>
                          </div>
                          
                          <p className="text-slate-900 mb-3">{issue.issueDescription}</p>
                          
                          {issue.resolution && (
                            <div className="bg-green-50 p-3 rounded-lg mb-3">
                              <p className="text-sm text-green-800">
                                <strong>Résolution :</strong> {issue.resolution}
                              </p>
                            </div>
                          )}
                          
                          <div className="text-sm text-slate-600">
                            Signalé le {format(new Date(issue.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                            {issue.resolvedAt && (
                              <span> • Résolu le {format(new Date(issue.resolvedAt), 'dd MMM yyyy à HH:mm', { locale: fr })}</span>
                            )}
                          </div>
                        </div>

                        {issue.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              const resolution = prompt("Entrez la résolution du problème :");
                              if (resolution) {
                                handleResolveIssue(issue.id, resolution);
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Résoudre
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}