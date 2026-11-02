/**
 * Connexion à l'espace employé (US12).
 *
 * Le serveur renvoie un JWT signé valable 2 heures. Il est gardé en
 * sessionStorage : il disparaît à la fermeture de l'onglet.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import type { PublicEmployee } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { employeeRequest, EMPLOYEE_TOKEN_KEY } from "@/lib/queryClient";
import { Shield, Mail, Lock, LogIn } from "lucide-react";

export default function EmployeeLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      employeeRequest<{ token: string; employee: PublicEmployee }>("POST", "/api/employee/login", credentials),
    onSuccess: ({ token, employee }) => {
      sessionStorage.setItem(EMPLOYEE_TOKEN_KEY, token);
      toast({ title: "Connexion réussie", description: `Bienvenue ${employee.firstName}` });
      setLocation("/employee/dashboard");
    },
    onError: (error: Error) => toast({ title: "Connexion refusée", description: error.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-eco-green/10 p-3 rounded-full"><Shield className="w-8 h-8 text-eco-green" aria-hidden="true" /></div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Espace employé</CardTitle>
          <p className="text-gray-600">Connectez-vous avec les identifiants fournis par l'administrateur.</p>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); loginMutation.mutate({ email, password }); }}>
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required disabled={loginMutation.isPending} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required disabled={loginMutation.isPending} />
              </div>
            </div>
            <Button type="submit" className="w-full bg-eco-green hover:bg-green-600" disabled={loginMutation.isPending}>
              <LogIn className="w-5 h-5 mr-2" aria-hidden="true" />
              {loginMutation.isPending ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600">
            Vous êtes un utilisateur ? <Link href="/login" className="text-eco-green font-medium">Connexion utilisateur</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
