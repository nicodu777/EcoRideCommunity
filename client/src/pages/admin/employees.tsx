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

interface NewEmployee {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  position: string;
  permissions: string[];
}

const PERMISSION_OPTIONS = [
  { id: 'user_reports', label: 'Signalements utilisateurs', description: 'Gérer les signalements et plaintes' },
  { id: 'trip_issues', label: 'Problèmes trajets', description: 'Résoudre les problèmes de covoiturage' },
  { id: 'ratings', label: 'Évaluations', description: 'Modérer les avis et commentaires' },
  { id: 'support', label: 'Support client', description: 'Assistance aux utilisateurs' },
  { id: 'analytics', label: 'Analytics', description: 'Accès aux statistiques' }
];

const POSITION_OPTIONS = [
  'Support Client',
  'Modérateur',
  'Gestionnaire Contenus',
  'Analyste',
  'Responsable Qualité'
];

export default function EmployeesManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const [newEmployee, setNewEmployee] = useState<NewEmployee>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    position: 'Support Client',
    permissions: []
  });

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['/api/admin/employees'],
    queryFn: () => apiRequest('/api/admin/employees', {
      headers: { 'x-user-id': user?.id.toString() }
    })
  });

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (employeeData: NewEmployee) => {
      return apiRequest('/api/admin/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id.toString()
        },
        body: JSON.stringify(employeeData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Employé créé",
        description: "Le compte employé a été créé avec succès"
      });
      setNewEmployee({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        position: 'Support Client',
        permissions: []
      });
      setShowCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'employé",
        variant: "destructive"
      });
    }
  });

  const handleCreateEmployee = () => {
    if (!newEmployee.email || !newEmployee.password || !newEmployee.firstName || !newEmployee.lastName) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    if (newEmployee.permissions.length === 0) {
      toast({
        title: "Erreur", 
        description: "Veuillez sélectionner au moins une permission",
        variant: "destructive"
      });
      return;
    }

    createEmployeeMutation.mutate(newEmployee);
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setNewEmployee(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter(p => p !== permissionId)
    }));
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-xl font-bold text-red-600 mb-2">Accès refusé</h1>
              <p className="text-gray-600">Vous n'avez pas les permissions nécessaires.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Gestion des employés</h1>
              <p className="text-slate-600 mt-2">Créez et gérez les comptes employés</p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-eco-green hover:bg-green-600">
              <UserPlus className="w-4 h-4 mr-2" />
              Nouvel employé
            </Button>
          </div>

          {/* Employees List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="w-5 h-5 mr-2 text-blue-600" />
                Employés ({employees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eco-green mx-auto"></div>
                  <p className="text-slate-500 mt-2">Chargement...</p>
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-8">
                  <UserMinus className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Aucun employé créé</p>
                  <p className="text-xs text-slate-400 mt-1">Créez votre premier compte employé</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {employees.map((employee: Employee) => (
                    <div key={employee.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h3 className="font-medium text-slate-900">
                                {employee.firstName} {employee.lastName}
                              </h3>
                              <div className="flex items-center space-x-4 text-sm text-slate-500 mt-1">
                                <span className="flex items-center">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {employee.email}
                                </span>
                                {employee.phone && (
                                  <span className="flex items-center">
                                    <Phone className="w-3 h-3 mr-1" />
                                    {employee.phone}
                                  </span>
                                )}
                                <span className="flex items-center">
                                  <Briefcase className="w-3 h-3 mr-1" />
                                  {employee.position}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mt-3">
                            {employee.permissions.map(permission => {
                              const permissionInfo = PERMISSION_OPTIONS.find(p => p.id === permission);
                              return (
                                <Badge key={permission} variant="secondary" className="text-xs">
                                  {permissionInfo?.label || permission}
                                </Badge>
                              );
                            })}
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-2 text-xs text-slate-500">
                              <Calendar className="w-3 h-3" />
                              <span>Créé le {format(new Date(employee.createdAt), 'dd/MM/yyyy', { locale: fr })}</span>
                            </div>
                            <Badge variant={employee.isActive ? "default" : "destructive"}>
                              {employee.isActive ? "Actif" : "Inactif"}
                            </Badge>
                          </div>
                          
                          {employee.lastLoginAt && (
                            <div className="text-xs text-slate-500 mt-1">
                              Dernière connexion: {format(new Date(employee.lastLoginAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Employee Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <UserPlus className="w-5 h-5 mr-2 text-eco-green" />
                  Créer un nouveau compte employé
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Prénom *</Label>
                    <Input
                      id="firstName"
                      value={newEmployee.firstName}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Prénom"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Nom *</Label>
                    <Input
                      id="lastName"
                      value={newEmployee.lastName}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Nom"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@ecoride.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="06 12 34 56 78"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Mot de passe temporaire *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Mot de passe (min. 8 caractères)"
                  />
                  <p className="text-xs text-slate-500 mt-1">L'employé devra changer ce mot de passe à sa première connexion</p>
                </div>

                <div>
                  <Label htmlFor="position">Poste</Label>
                  <Select value={newEmployee.position} onValueChange={(value) => setNewEmployee(prev => ({ ...prev, position: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITION_OPTIONS.map(position => (
                        <SelectItem key={position} value={position}>{position}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Permissions *</Label>
                  <div className="space-y-3 mt-2">
                    {PERMISSION_OPTIONS.map(permission => (
                      <div key={permission.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={permission.id}
                          checked={newEmployee.permissions.includes(permission.id)}
                          onCheckedChange={(checked) => handlePermissionChange(permission.id, checked as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={permission.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {permission.label}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {permission.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button 
                    onClick={handleCreateEmployee}
                    disabled={createEmployeeMutation.isPending}
                    className="flex-1 bg-eco-green hover:bg-green-600"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {createEmployeeMutation.isPending ? 'Création...' : 'Créer le compte'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}