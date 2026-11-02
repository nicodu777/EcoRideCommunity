/**
 * Tableau de bord employé (US12) :
 * - valider ou refuser les avis des passagers avant leur publication ;
 * - traiter les covoiturages qui se sont mal passés : l'employé voit le
 *   numéro du trajet, le passager et le chauffeur (nom + email), les lieux
 *   et dates, puis décide de payer le chauffeur ou de rembourser le passager.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { PublicEmployee, Rating } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { employeeRequest, queryClient, ApiError, EMPLOYEE_TOKEN_KEY } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Shield, LogOut, Star, AlertTriangle, CheckCircle } from "lucide-react";

const PERMISSION_LABELS: Record<string, string> = {
  ratings: "Modération des avis",
  trip_issues: "Litiges entre passagers et chauffeurs",
};
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type PendingRating = Rating & { raterName: string; rateeName: string };
type TripIssue = {
  id: number; tripId: number; issueDescription: string; status: string; decision: string | null;
  resolution: string | null; createdAt: string;
  trip: { departure: string; destination: string; departureTime: string; arrivalTime: string };
  passenger: { name: string; email: string };
  driver: { name: string; email: string };
};

export default function EmployeeDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [resolutions, setResolutions] = useState<Record<number, string>>({});

  const logout = () => {
    sessionStorage.removeItem(EMPLOYEE_TOKEN_KEY);
    queryClient.removeQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/employee") });
    setLocation("/employee/login");
  };

  // Le token est vérifié par le serveur : s'il est absent, expiré ou falsifié → 401 → retour à la connexion
  const { data: employee, error } = useQuery<PublicEmployee>({
    queryKey: ["/api/employee/me"],
    queryFn: () => employeeRequest("GET", "/api/employee/me"),
  });
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) logout();
  }, [error]);

  const can = (permission: string) => employee?.permissions.includes(permission) ?? false;

  const { data: ratings = [] } = useQuery<PendingRating[]>({
    queryKey: ["/api/employee/pending-ratings"],
    queryFn: () => employeeRequest("GET", "/api/employee/pending-ratings"),
    enabled: can("ratings"),
  });
  const { data: issues = [] } = useQuery<TripIssue[]>({
    queryKey: ["/api/employee/trip-issues"],
    queryFn: () => employeeRequest("GET", "/api/employee/trip-issues"),
    enabled: can("trip_issues"),
  });

  const onError = (err: Error) => toast({ title: "Action impossible", description: err.message, variant: "destructive" });

  const reviewRating = useMutation({
    mutationFn: ({ id, approve }: { id: number; approve: boolean }) =>
      employeeRequest("PATCH", `/api/employee/ratings/${id}/${approve ? "approve" : "reject"}`),
    onSuccess: (_d, { approve }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/pending-ratings"] });
      toast({ title: approve ? "Avis publié" : "Avis refusé" });
    },
    onError,
  });

  const resolveIssue = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: "pay_driver" | "refund_passenger" }) =>
      employeeRequest("PATCH", `/api/employee/trip-issues/${id}/resolve`, { decision, resolution: resolutions[id] ?? "" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/trip-issues"] });
      toast({ title: "Litige traité" });
    },
    onError,
  });

  if (!employee) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-eco-green border-t-transparent rounded-full" /></div>;
  }

  const pendingIssues = issues.filter((i) => i.status === "pending");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-eco-green" aria-hidden="true" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Espace employé</h1>
              <p className="text-sm text-gray-600">{employee.firstName} {employee.lastName} · {employee.position}</p>
            </div>
          </div>
          <Button variant="outline" onClick={logout}><LogOut className="w-4 h-4 mr-2" aria-hidden="true" /> Déconnexion</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader><CardTitle>Mes permissions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {employee.permissions.map((permission) => (
              <Badge key={permission} variant="secondary">{PERMISSION_LABELS[permission] ?? permission}</Badge>
            ))}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Star, color: "bg-yellow-100 text-yellow-700", label: "Avis en attente", value: ratings.length, show: can("ratings") },
            { icon: AlertTriangle, color: "bg-red-100 text-red-700", label: "Litiges à traiter", value: pendingIssues.length, show: can("trip_issues") },
            { icon: CheckCircle, color: "bg-green-100 text-green-700", label: "Litiges résolus", value: issues.length - pendingIssues.length, show: can("trip_issues") },
          ].filter((s) => s.show).map(({ icon: Icon, color, label, value }) => (
            <Card key={label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-lg ${color}`}><Icon className="w-6 h-6" aria-hidden="true" /></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-sm text-gray-600">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue={can("ratings") ? "ratings" : "issues"} className="space-y-6">
          <TabsList>
            {can("ratings") && <TabsTrigger value="ratings">Avis à modérer ({ratings.length})</TabsTrigger>}
            {can("trip_issues") && <TabsTrigger value="issues">Litiges ({pendingIssues.length})</TabsTrigger>}
          </TabsList>

          <TabsContent value="ratings" className="space-y-4">
            {ratings.length === 0 && <p className="text-gray-600">Aucun avis en attente.</p>}
            {ratings.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{r.raterName} → {r.rateeName}</p>
                    <span className="flex items-center gap-1 text-yellow-600" aria-label={`${r.rating} sur 5`}>
                      <Star className="w-4 h-4 fill-current" aria-hidden="true" /> {r.rating}/5
                    </span>
                  </div>
                  {r.comment && <p className="text-gray-700">« {r.comment} »</p>}
                  <p className="text-xs text-gray-500">Trajet n°{r.tripId} · {format(new Date(r.createdAt), "dd/MM/yyyy HH:mm")}</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-eco-green hover:bg-green-600" disabled={reviewRating.isPending} onClick={() => reviewRating.mutate({ id: r.id, approve: true })}>Publier</Button>
                    <Button size="sm" variant="outline" className="text-red-700" disabled={reviewRating.isPending} onClick={() => reviewRating.mutate({ id: r.id, approve: false })}>Refuser</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="issues" className="space-y-4">
            {issues.length === 0 && <p className="text-gray-600">Aucun litige signalé.</p>}
            {issues.map((issue) => (
              <Card key={issue.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex flex-wrap items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" aria-hidden="true" />
                    Covoiturage n°{issue.tripId} : {issue.trip.departure} → {issue.trip.destination}
                    <Badge variant="outline">{issue.status === "pending" ? "À traiter" : "Traité"}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-700">
                  <p>Départ le {format(new Date(issue.trip.departureTime), "dd MMMM yyyy 'à' HH:mm", { locale: fr })} · arrivée {format(new Date(issue.trip.arrivalTime), "HH:mm")}</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <p><span className="font-medium">Passager :</span> {issue.passenger.name} ({issue.passenger.email})</p>
                    <p><span className="font-medium">Chauffeur :</span> {issue.driver.name} ({issue.driver.email})</p>
                  </div>
                  <p className="bg-orange-50 p-3 rounded">{issue.issueDescription}</p>

                  {issue.status === "pending" ? (
                    <div className="space-y-2">
                      <Label htmlFor={`resolution-${issue.id}`}>Décision motivée</Label>
                      <Textarea id={`resolution-${issue.id}`} rows={2} value={resolutions[issue.id] ?? ""}
                        onChange={(e) => setResolutions({ ...resolutions, [issue.id]: e.target.value })} />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" disabled={resolveIssue.isPending || !(resolutions[issue.id] ?? "").trim()}
                          onClick={() => resolveIssue.mutate({ id: issue.id, decision: "refund_passenger" })}>Rembourser le passager</Button>
                        <Button size="sm" variant="outline" disabled={resolveIssue.isPending || !(resolutions[issue.id] ?? "").trim()}
                          onClick={() => resolveIssue.mutate({ id: issue.id, decision: "pay_driver" })}>Payer le chauffeur</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">
                      Décision : {issue.decision === "refund_passenger" ? "passager remboursé" : "chauffeur payé"} · {issue.resolution}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
