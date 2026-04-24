import { useState } from "react";
import { Link, useLocation } from "wouter";
import { authService } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Leaf, Mail, Lock, User, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive",
      });
      return;
    }

    if (!role) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner votre rôle principal.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await authService.register(email, password, firstName, lastName, role);
      toast({
        title: "Inscription réussie",
        description: "Bienvenue sur EcoRide ! Votre compte a été créé avec succès.",
      });
      setLocation("/");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Erreur d'inscription",
        description: error.message || "Une erreur s'est produite lors de l'inscription.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-eco-green rounded-full flex items-center justify-center">
              <Leaf className="text-white" size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">EcoRide</h1>
          </div>
          <CardTitle className="text-xl font-semibold text-slate-900">
            Créer un compte
          </CardTitle>
          <p className="text-slate-600">
            Rejoignez la communauté du covoiturage écoresponsable
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                  Prénom
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-slate-400" size={16} />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Jean"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-10 focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                  Nom
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-slate-400" size={16} />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Dupont"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="pl-10 focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={16} />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                Téléphone (optionnel)
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-slate-400" size={16} />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="role" className="text-sm font-medium text-slate-700">
                Je souhaite principalement
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="focus:ring-2 focus:ring-eco-green focus:border-eco-green">
                  <SelectValue placeholder="Choisir votre rôle principal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passenger">Chercher des trajets (passager)</SelectItem>
                  <SelectItem value="driver">Proposer des trajets (conducteur)</SelectItem>
                  <SelectItem value="both">Les deux</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={16} />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                Confirmer le mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={16} />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-eco-green hover:bg-green-600"
              disabled={loading}
            >
              {loading ? "Création du compte..." : "Créer mon compte"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Déjà un compte ?{" "}
              <Link href="/login">
                <span className="text-eco-green hover:text-green-600 font-medium cursor-pointer">
                  Se connecter
                </span>
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
