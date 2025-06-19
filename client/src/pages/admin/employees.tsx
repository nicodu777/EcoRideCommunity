import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { UserPlus, UserMinus, Eye, Calendar, Mail, Phone, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Employee {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  position: string;
  permissions: string[];
  isActive: boolean;
  createdBy: number;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

const AVAILABLE_PERMISSIONS = [
  { value: 'user_reports', label: 'Signalements utilisateurs' },
  { value: 'trip_issues', label: 'Problèmes de trajets' },
  { value: 'ratings', label: 'Modération des évaluations' },
  { value: 'support', label: 'Support client' },
];

export default function EmployeesPage() {
  const { user } = useAuth();
  const userId = user?.profile?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    position: '',
    permissions: [] as string[],
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['/api/admin/employees'],
    queryFn: () => apiRequest('/api/admin/employees', {
      headers: {
        'x-user-id': userId?.toString() || '',
      },
    }),
    enabled: !!userId && user?.profile?.role === 'admin',
  });

  const createEmployeeMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      apiRequest('/api/admin/employees', {
        method: 'POST',
        headers: {
          'x-user-id': userId?.toString() || '',
        },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Employé créé avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      setIsCreateDialogOpen(false);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        position: '',
        permissions: [],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création",
        variant: "destructive",
      });
    },
  });

  const deactivateEmployeeMutation = useMutation({
    mutationFn: (employeeId: number) =>
      apiRequest(`/api/admin/employees/${employeeId}/deactivate`, {
        method: 'PATCH',
        headers: {
          'x-user-id': userId?.toString() || '',
        },
      }),
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Employé désactivé avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la désactivation",
        variant: "destructive",
      });
    },
  });

  const handleCreateEmployee = () => {
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName || !formData.position) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    createEmployeeMutation.mutate(formData);
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
  };

  if (user?.profile?.role !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Accès refusé - Administrateur requis</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des employés</h1>
          <p className="text-muted-foreground">Créer et gérer les comptes employés</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-eco-green hover:bg-green-600">
              <UserPlus className="w-4 h-4 mr-2" />
              Nouvel employé
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Créer un compte employé</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Nom"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemple.com"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Mot de passe *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Mot de passe sécurisé"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="06 12 34 56 78"
                />
              </div>
              
              <div>
                <Label htmlFor="position">Poste *</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="Support client, Modérateur..."
                />
              </div>
              
              <div>
                <Label>Permissions</Label>
                <div className="space-y-2">
                  {AVAILABLE_PERMISSIONS.map((permission) => (
                    <div key={permission.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission.value}
                        checked={formData.permissions.includes(permission.value)}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(permission.value, checked as boolean)
                        }
                      />
                      <Label htmlFor={permission.value} className="text-sm">
                        {permission.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button
                onClick={handleCreateEmployee}
                disabled={createEmployeeMutation.isPending}
                className="w-full bg-eco-green hover:bg-green-600"
              >
                {createEmployeeMutation.isPending ? "Création..." : "Créer l'employé"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-eco-green border-t-transparent rounded-full" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {employees.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun employé créé</p>
                  <p className="text-sm text-muted-foreground">Créez votre premier compte employé</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {employees.map((employee: Employee) => (
                <Card key={employee.id} className="border-l-4 border-l-eco-green">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {employee.firstName} {employee.lastName}
                          <Badge variant={employee.isActive ? "default" : "secondary"}>
                            {employee.isActive ? "Actif" : "Inactif"}
                          </Badge>
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {employee.position}
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {employee.email}
                          </div>
                          {employee.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {employee.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {employee.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deactivateEmployeeMutation.mutate(employee.id)}
                            disabled={deactivateEmployeeMutation.isPending}
                          >
                            <UserMinus className="w-4 h-4 mr-1" />
                            Désactiver
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium mb-2">Permissions</h4>
                        <div className="flex flex-wrap gap-2">
                          {employee.permissions.length > 0 ? (
                            employee.permissions.map((permission) => {
                              const permissionLabel = AVAILABLE_PERMISSIONS.find(p => p.value === permission)?.label || permission;
                              return (
                                <Badge key={permission} variant="outline">
                                  {permissionLabel}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-sm text-muted-foreground">Aucune permission</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Créé le {format(new Date(employee.createdAt), "dd MMMM yyyy", { locale: fr })}
                        </div>
                        {employee.lastLoginAt && (
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            Dernière connexion: {format(new Date(employee.lastLoginAt), "dd/MM/yyyy à HH:mm", { locale: fr })}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}