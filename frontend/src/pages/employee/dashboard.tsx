import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { 
  Shield, 
  LogOut, 
  AlertTriangle, 
  MessageSquare, 
  Star, 
  Clock,
  CheckCircle,
  XCircle,
  Eye
} from "lucide-react";

interface Employee {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  position: string;
  permissions: string[];
}

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const employeeData = localStorage.getItem('employee_data');
    const employeeToken = localStorage.getItem('employee_token');
    
    if (!employeeData || !employeeToken) {
      setLocation('/employee/login');
      return;
    }
    
    setEmployee(JSON.parse(employeeData));
    setToken(employeeToken);
  }, [navigate]);

  const { data: userReports = [] } = useQuery({
    queryKey: ['/api/employee/user-reports'],
    queryFn: () => apiRequest('/api/employee/user-reports', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),
    enabled: !!token && employee?.permissions.includes('user_reports'),
  });

  const { data: tripIssues = [] } = useQuery({
    queryKey: ['/api/employee/trip-issues'],
    queryFn: () => apiRequest('/api/employee/trip-issues', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),
    enabled: !!token && employee?.permissions.includes('trip_issues'),
  });

  const { data: pendingRatings = [] } = useQuery({
    queryKey: ['/api/employee/pending-ratings'],
    queryFn: () => apiRequest('/api/employee/pending-ratings', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),
    enabled: !!token && employee?.permissions.includes('ratings'),
  });

  const handleLogout = () => {
    localStorage.removeItem('employee_token');
    localStorage.removeItem('employee_data');
    setLocation('/employee/login');
  };

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eco-green border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasPermission = (permission: string) => {
    return employee.permissions.includes(permission);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-eco-green/10 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-eco-green" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Espace Employé
                </h1>
                <p className="text-sm text-gray-600">
                  {employee.firstName} {employee.lastName} - {employee.position}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Permissions Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Mes permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {employee.permissions.map((permission) => (
                <Badge key={permission} variant="secondary">
                  {permission === 'user_reports' && 'Signalements utilisateurs'}
                  {permission === 'trip_issues' && 'Problèmes de trajets'}
                  {permission === 'ratings' && 'Modération des évaluations'}
                  {permission === 'support' && 'Support client'}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {hasPermission('user_reports') && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-red-100 p-3 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{userReports.length}</p>
                    <p className="text-sm text-gray-600">Signalements en attente</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {hasPermission('trip_issues') && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{tripIssues.length}</p>
                    <p className="text-sm text-gray-600">Problèmes de trajets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {hasPermission('ratings') && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingRatings.length}</p>
                    <p className="text-sm text-gray-600">Évaluations à modérer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="grid w-full lg:w-auto grid-cols-3">
            {hasPermission('user_reports') && (
              <TabsTrigger value="reports">Signalements</TabsTrigger>
            )}
            {hasPermission('trip_issues') && (
              <TabsTrigger value="issues">Problèmes</TabsTrigger>
            )}
            {hasPermission('ratings') && (
              <TabsTrigger value="ratings">Évaluations</TabsTrigger>
            )}
          </TabsList>

          {hasPermission('user_reports') && (
            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>Signalements utilisateurs</CardTitle>
                </CardHeader>
                <CardContent>
                  {userReports.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Aucun signalement en attente</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userReports.map((report: any) => (
                        <div key={report.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{report.title}</h4>
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              En attente
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" />
                              Examiner
                            </Button>
                            <Button size="sm" className="bg-eco-green hover:bg-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Résoudre
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {hasPermission('trip_issues') && (
            <TabsContent value="issues">
              <Card>
                <CardHeader>
                  <CardTitle>Problèmes de trajets</CardTitle>
                </CardHeader>
                <CardContent>
                  {tripIssues.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Aucun problème signalé</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tripIssues.map((issue: any) => (
                        <div key={issue.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">Trajet #{issue.tripId}</h4>
                            <Badge variant="destructive">
                              {issue.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{issue.description}</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" />
                              Détails
                            </Button>
                            <Button size="sm" className="bg-eco-green hover:bg-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Résoudre
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {hasPermission('ratings') && (
            <TabsContent value="ratings">
              <Card>
                <CardHeader>
                  <CardTitle>Évaluations en attente de modération</CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingRatings.length === 0 ? (
                    <div className="text-center py-8">
                      <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Aucune évaluation à modérer</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingRatings.map((rating: any) => (
                        <div key={rating.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < rating.rating
                                          ? 'text-yellow-400 fill-current'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm text-gray-600">
                                  {rating.rating}/5
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Trajet #{rating.tripId}
                              </p>
                            </div>
                            <Badge variant="outline">En attente</Badge>
                          </div>
                          {rating.comment && (
                            <p className="text-sm text-gray-600 mb-3">"{rating.comment}"</p>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-eco-green hover:bg-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approuver
                            </Button>
                            <Button size="sm" variant="outline">
                              <XCircle className="w-4 h-4 mr-1" />
                              Rejeter
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}