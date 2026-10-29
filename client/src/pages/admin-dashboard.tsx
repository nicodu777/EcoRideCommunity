/**
 * Espace administrateur (US13).
 *
 * - Statistiques : covoiturages par jour, crédits gagnés par jour et au total ;
 * - Utilisateurs : suspension / réactivation de comptes ;
 * - Employés : création et désactivation de comptes employés ;
 * - Journal : historique des actions de l'administrateur (stocké dans MongoDB).
 *
 * L'affichage de cette page n'est qu'un confort : la vraie protection est
 * côté serveur, où chaque route /api/admin exige le rôle « admin ».
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, PublicEmployee, InsertEmployee } from "@shared/schema";
import { authService, AuthUser } from "@/lib/auth";
import { apiJson, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Users, TrendingUp, Coins, Ban } from "lucide-react";
import { ROLE_LABELS, formatCredits } from "@/lib/labels";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type AdminUser = Omit<User, "firebaseUid">;
type AdminAction = { action: string; adminId: number; targetId: number; details?: { email?: string }; createdAt: string };

const ACTION_LABELS: Record<string, string> = {
  suspend_user: "Compte suspendu",
  reactivate_user: "Compte réactivé",
  create_employee: "Employé créé",
  deactivate_employee: "Employé désactivé",
};

const EMPTY_EMPLOYEE = { email: "", password: "", firstName: "", lastName: "", phone: "", position: "Support Client" };

/** Affiche les dates du graphique au format jj/mm. */
const shortDate = (iso: string) => format(new Date(iso), "dd/MM", { locale: fr });

export default function AdminDashboard() {
  const [user, setUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [newEmployee, setNewEmployee] = useState(EMPTY_EMPLOYEE);
  const { toast } = useToast();

  useEffect(() => authService.onAuthStateChanged(setUser), []);
  const isAdmin = user?.profile?.role === "admin";

  const { data: users = [], isLoading: usersLoading } = useQuery<AdminUser[]>({ queryKey: ["/api/admin/users"], enabled: isAdmin });
  const { data: dailyTrips = [] } = useQuery<{ date: string; count: number }[]>({ queryKey: ["/api/admin/analytics/daily-trips"], enabled: isAdmin });
  const { data: dailyEarnings = [] } = useQuery<{ date: string; amount: number }[]>({ queryKey: ["/api/admin/analytics/daily-earnings"], enabled: isAdmin });
  const { data: total } = useQuery<{ total: number }>({ queryKey: ["/api/admin/analytics/total-earnings"], enabled: isAdmin });
  const { data: employees = [] } = useQuery<PublicEmployee[]>({ queryKey: ["/api/admin/employees"], enabled: isAdmin });
  const { data: actions = [] } = useQuery<AdminAction[]>({ queryKey: ["/api/admin/actions"], enabled: isAdmin });

  const onError = (error: Error) => toast({ title: "Action impossible", description: error.message, variant: "destructive" });
  const invalidateAdmin = () => queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/admin") });

  const setSuspended = useMutation({
    mutationFn: ({ id, suspend }: { id: number; suspend: boolean }) =>
      apiJson("PUT", `/api/admin/users/${id}/${suspend ? "suspend" : "reactivate"}`),
    onSuccess: (_data, { suspend }) => { invalidateAdmin(); toast({ title: suspend ? "Compte suspendu" : "Compte réactivé" }); },
    onError,
  });

  const createEmployee = useMutation({
    mutationFn: (employee: Partial<InsertEmployee>) => apiJson<PublicEmployee>("POST", "/api/admin/employees", employee),
    onSuccess: () => { invalidateAdmin(); setNewEmployee(EMPTY_EMPLOYEE); toast({ title: "Compte employé créé" }); },
    onError,
  });

  const deactivateEmployee = useMutation({
    mutationFn: (id: number) => apiJson("PATCH", `/api/admin/employees/${id}/deactivate`),
    onSuccess: () => { invalidateAdmin(); toast({ title: "Employé désactivé" }); },
    onError,
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full"><CardContent className="p-6 text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Accès refusé</h1>
          <p className="text-slate-600">Cette page est réservée à l'administrateur.</p>
        </CardContent></Card>
      </div>
    );
  }

  const field = (key: keyof typeof EMPTY_EMPLOYEE) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setNewEmployee({ ...newEmployee, [key]: e.target.value });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-900">Espace administrateur</h1>
        <p className="text-slate-600 mt-2 mb-8">Suivi de l'activité, gestion des comptes et des employés.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Users, label: "Utilisateurs", value: users.length },
            { icon: TrendingUp, label: "Covoiturages", value: dailyTrips.reduce((s, d) => s + d.count, 0) },
            { icon: Coins, label: "Crédits gagnés (total)", value: formatCredits(total?.total ?? 0) },
            { icon: Ban, label: "Comptes suspendus", value: users.filter((u) => u.isSuspended).length },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label}><CardContent className="p-5 text-center">
              <Icon className="w-7 h-7 text-eco-green mx-auto mb-2" aria-hidden="true" />
              <div className="text-xl font-bold text-slate-900">{value}</div>
              <div className="text-sm text-slate-600">{label}</div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="employees">Employés</TabsTrigger>
            <TabsTrigger value="log">Journal</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Covoiturages par jour</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyTrips.map((d) => ({ ...d, date: shortDate(d.date) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(v) => [v, "Covoiturages"]} />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Crédits gagnés par la plateforme par jour</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyEarnings.map((d) => ({ ...d, date: shortDate(d.date) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(v) => [formatCredits(Number(v)), "Gains"]} />
                    <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {usersLoading ? <LoadingSpinner size="lg" /> : users.filter((u) => u.role !== "admin").map((u) => (
              <Card key={u.id}>
                <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900 flex items-center gap-2">
                      {u.firstName} {u.lastName}
                      <Badge variant="outline">{ROLE_LABELS[u.role]}</Badge>
                      {u.isSuspended && <Badge className="bg-red-100 text-red-800">Suspendu</Badge>}
                    </p>
                    <p className="text-sm text-slate-600">
                      {u.email} · {formatCredits(u.credits)} · inscrit le {format(new Date(u.createdAt), "dd MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" disabled={setSuspended.isPending}
                    className={u.isSuspended ? "" : "border-red-300 text-red-700"}
                    onClick={() => setSuspended.mutate({ id: u.id, suspend: !u.isSuspended })}>
                    {u.isSuspended ? "Réactiver" : "Suspendre"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Créer un compte employé</CardTitle></CardHeader>
              <CardContent>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  onSubmit={(e) => { e.preventDefault(); createEmployee.mutate({ ...newEmployee, phone: newEmployee.phone || undefined }); }}>
                  <div><Label htmlFor="e-first">Prénom</Label><Input id="e-first" value={newEmployee.firstName} onChange={field("firstName")} required /></div>
                  <div><Label htmlFor="e-last">Nom</Label><Input id="e-last" value={newEmployee.lastName} onChange={field("lastName")} required /></div>
                  <div><Label htmlFor="e-email">Email</Label><Input id="e-email" type="email" value={newEmployee.email} onChange={field("email")} required /></div>
                  <div><Label htmlFor="e-phone">Téléphone</Label><Input id="e-phone" value={newEmployee.phone} onChange={field("phone")} /></div>
                  <div className="md:col-span-2">
                    <Label htmlFor="e-password">Mot de passe provisoire</Label>
                    <Input id="e-password" type="password" autoComplete="new-password" value={newEmployee.password} onChange={field("password")} required />
                    <p className="text-xs text-slate-500 mt-1">8 caractères minimum, dont une majuscule et un chiffre.</p>
                  </div>
                  <Button type="submit" className="bg-eco-green hover:bg-green-600 md:col-span-2" disabled={createEmployee.isPending}>Créer le compte</Button>
                </form>
              </CardContent>
            </Card>

            {employees.map((e) => (
              <Card key={e.id}>
                <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900 flex items-center gap-2">
                      {e.firstName} {e.lastName}
                      {!e.isActive && <Badge className="bg-red-100 text-red-800">Désactivé</Badge>}
                    </p>
                    <p className="text-sm text-slate-600">{e.email} · {e.position}</p>
                  </div>
                  {e.isActive && (
                    <Button size="sm" variant="outline" className="border-red-300 text-red-700"
                      onClick={() => deactivateEmployee.mutate(e.id)} disabled={deactivateEmployee.isPending}>
                      Désactiver
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="log">
            <Card>
              <CardHeader><CardTitle>Dernières actions</CardTitle></CardHeader>
              <CardContent>
                {actions.length === 0 ? <p className="text-slate-600">Aucune action enregistrée.</p> : (
                  <ul className="divide-y">
                    {actions.map((a, i) => (
                      <li key={i} className="py-2 text-sm text-slate-700">
                        <span className="font-medium">{ACTION_LABELS[a.action] ?? a.action}</span>
                        {a.details?.email && ` · ${a.details.email}`}
                        <span className="text-slate-500"> · {format(new Date(a.createdAt), "dd/MM/yyyy HH:mm")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
