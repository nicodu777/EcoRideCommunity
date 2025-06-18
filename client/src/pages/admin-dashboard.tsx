import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { authService, AuthUser } from "@/lib/auth";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Users, TrendingUp, Euro, Ban, Plus, AlertTriangle, Activity } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
// import { ReportsManagement } from "@/components/admin/reports-management";

interface AnalyticsData {
  date: string;
  count?: number;
  amount?: string;
  trips?: number;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    password: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: !!user?.profile?.id && user?.profile?.role === 'admin',
  });

  const { data: dailyTrips = [], isLoading: tripsLoading } = useQuery<AnalyticsData[]>({
    queryKey: ['/api/admin/analytics/daily-trips'],
    enabled: !!user?.profile?.id && user?.profile?.role === 'admin',
  });

  const { data: dailyEarnings = [], isLoading: earningsLoading } = useQuery<AnalyticsData[]>({
    queryKey: ['/api/admin/analytics/daily-earnings'],
    enabled: !!user?.profile?.id && user?.profile?.role === 'admin',
  });

  const { data: totalEarnings = { total: "0.00" }, isLoading: totalLoading } = useQuery<{ total: string }>({
    queryKey: ['/api/admin/analytics/total-earnings'],
    enabled: !!user?.profile?.id && user?.profile?.role === 'admin',
  });

  const handleSuspendUser = async (userId: number) => {
    try {
      await apiRequest("PUT", `/api/admin/users/${userId}/suspend`, {});

      toast({
        title: "Utilisateur suspendu",
        description: "L'utilisateur a été suspendu avec succès.",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de suspendre l'utilisateur.",
        variant: "destructive",
      });
    }
  };

  const handleCreateEmployee = async () => {
    if (!newEmployee.email || !newEmployee.firstName || !newEmployee.lastName || !newEmployee.password) {
      toast({
        title: "Erreur",
        description: "Tous les champs sont obligatoires.",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/users", {
        ...newEmployee,
        role: "employee",
      });

      toast({
        title: "Employé créé",
        description: "Le compte employé a été créé avec succès.",
      });

      setNewEmployee({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        password: ""
      });

      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le compte employé.",
        variant: "destructive",
      });
    }
  };

  const formatChartData = (data: AnalyticsData[]) => {
    return data.map(item => ({
      ...item,
      date: format(new Date(item.date), 'dd/MM', { locale: fr }),
      amount: item.amount ? parseFloat(item.amount) : undefined
    }));
  };

  if (!user || user.profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Accès refusé</h2>
            <p className="text-slate-600">Vous n'avez pas les permissions administrateur pour accéder à cette page.</p>
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
            Espace Administrateur
          </h1>
          <p className="text-slate-600 mt-2">
            Gérez les employés, surveillez les performances et administrez la plateforme.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-eco-green mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-900">{users.length}</div>
              <div className="text-sm text-slate-600">Utilisateurs totaux</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 text-eco-blue mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-900">
                {dailyTrips.reduce((sum, day) => sum + (day.count || 0), 0)}
              </div>
              <div className="text-sm text-slate-600">Trajets ce mois</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Euro className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-900">
                {parseFloat(totalEarnings.total).toFixed(0)}€
              </div>
              <div className="text-sm text-slate-600">Revenus totaux</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Ban className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-900">
                {users.filter(u => u.isSuspended).length}
              </div>
              <div className="text-sm text-slate-600">Comptes suspendus</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="reports">Signalements</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="employees">Employés</TabsTrigger>
          </TabsList>
            <TabsTrigger value="employees">Gestion des employés</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Trips Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Nombre de covoiturages par jour</CardTitle>
                </CardHeader>
                <CardContent>
                  {tripsLoading ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={formatChartData(dailyTrips)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Daily Earnings Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenus de la plateforme par jour</CardTitle>
                </CardHeader>
                <CardContent>
                  {earningsLoading ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={formatChartData(dailyEarnings)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value}€`, 'Revenus']} />
                        <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Gestion des signalements</h2>
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Aucun signalement en attente</span>
                </div>
              </div>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-600">Aucun signalement pour le moment</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Les signalements d'utilisateurs apparaîtront ici pour modération
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Gestion des utilisateurs</h2>
            </div>

            {usersLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="space-y-4">
                {users.filter(u => u.role !== 'admin').map((user) => (
                  <Card key={user.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-slate-900">
                              {user.firstName} {user.lastName}
                            </h3>
                            <Badge className={
                              user.role === 'employee' 
                                ? "bg-blue-100 text-blue-800"
                                : user.role === 'driver'
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }>
                              {user.role === 'employee' ? 'Employé' : 
                               user.role === 'driver' ? 'Conducteur' : 'Passager'}
                            </Badge>
                            {user.isSuspended && (
                              <Badge className="bg-red-100 text-red-800">
                                Suspendu
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-slate-600 space-y-1">
                            <div>Email: {user.email}</div>
                            {user.phone && <div>Téléphone: {user.phone}</div>}
                            <div>Crédits: {parseFloat(user.credits || '0').toFixed(2)}€</div>
                            <div>
                              Note: {user.averageRating ? parseFloat(user.averageRating).toFixed(1) : '0.0'}/5 
                              ({user.totalRatings} évaluations)
                            </div>
                            <div>Inscrit le {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: fr })}</div>
                          </div>
                        </div>

                        {!user.isSuspended && user.role !== 'employee' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSuspendUser(user.id)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Suspendre
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Gestion des employés</h2>
            </div>

            {/* Create Employee Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Créer un compte employé
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Prénom
                    </label>
                    <Input
                      value={newEmployee.firstName}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Prénom"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nom
                    </label>
                    <Input
                      value={newEmployee.lastName}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Nom"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Téléphone
                    </label>
                    <Input
                      value={newEmployee.phone}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Mot de passe temporaire
                    </label>
                    <Input
                      type="password"
                      value={newEmployee.password}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Mot de passe"
                    />
                  </div>
                </div>
                <Button onClick={handleCreateEmployee} className="bg-eco-green hover:bg-green-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer le compte employé
                </Button>
              </CardContent>
            </Card>

            {/* Employees List */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900">Employés existants</h3>
              {users.filter(u => u.role === 'employee').map((employee) => (
                <Card key={employee.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-slate-900">
                            {employee.firstName} {employee.lastName}
                          </h3>
                          <Badge className="bg-blue-100 text-blue-800">
                            Employé
                          </Badge>
                          {employee.isSuspended && (
                            <Badge className="bg-red-100 text-red-800">
                              Suspendu
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-slate-600 space-y-1">
                          <div>Email: {employee.email}</div>
                          {employee.phone && <div>Téléphone: {employee.phone}</div>}
                          <div>Inscrit le {format(new Date(employee.createdAt), 'dd MMM yyyy', { locale: fr })}</div>
                        </div>
                      </div>

                      {!employee.isSuspended && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSuspendUser(employee.id)}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <Ban className="w-4 h-4 mr-1" />
                          Suspendre
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}