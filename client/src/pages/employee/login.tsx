import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Mail, Lock, LogIn } from "lucide-react";

interface EmployeeLoginResponse {
  token: string;
  employee: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    position: string;
    permissions: string[];
  };
}

export default function EmployeeLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const [, navigate] = useNavigate();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiRequest('/api/employee/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      return response as EmployeeLoginResponse;
    },
    onSuccess: (data) => {
      // Stocker le token et les informations de l'employé
      localStorage.setItem('employee_token', data.token);
      localStorage.setItem('employee_data', JSON.stringify(data.employee));
      
      toast({
        title: "Connexion réussie",
        description: `Bienvenue ${data.employee.firstName} ${data.employee.lastName}`,
      });
      
      // Rediriger vers le tableau de bord employé
      navigate('/employee/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de connexion",
        description: error.message || "Identifiants invalides",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-eco-green/10 p-3 rounded-full">
              <Shield className="w-8 h-8 text-eco-green" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Espace Employé
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Connectez-vous avec vos identifiants employé
            </p>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">
                Adresse email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@ecoride.com"
                  className="pl-10 border-gray-300 focus:border-eco-green"
                  disabled={loginMutation.isPending}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  className="pl-10 border-gray-300 focus:border-eco-green"
                  disabled={loginMutation.isPending}
                />
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-eco-green hover:bg-green-600 text-white py-3 text-lg font-medium"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Connexion...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  Se connecter
                </div>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Vous êtes un utilisateur ?{" "}
              <button
                onClick={() => navigate('/')}
                className="text-eco-green hover:text-green-600 font-medium"
              >
                Retour à l'application
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}