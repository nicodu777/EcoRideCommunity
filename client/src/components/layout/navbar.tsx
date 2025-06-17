import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { authService, AuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Leaf, Search, Car, Calendar, User, LogOut } from "lucide-react";

export function Navbar() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [location] = useLocation();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await authService.logout();
  };

  const getInitials = (user: AuthUser) => {
    if (user.profile) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`.toUpperCase();
    }
    return user.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || user.email?.[0].toUpperCase() || 'U';
  };

  const getUserName = (user: AuthUser) => {
    if (user.profile) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }
    return user.displayName || user.email || 'Utilisateur';
  };

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-eco-green rounded-full flex items-center justify-center">
              <Leaf className="text-white" size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">EcoRide</h1>
          </Link>

          {/* Navigation Menu */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/search">
              <span className={`text-slate-700 hover:text-eco-green transition-colors font-medium cursor-pointer ${
                location === '/search' ? 'text-eco-green' : ''
              }`}>
                Rechercher
              </span>
            </Link>
            {user && (
              <>
                <Link href="/dashboard">
                  <span className={`text-slate-700 hover:text-eco-green transition-colors font-medium cursor-pointer ${
                    location === '/dashboard' ? 'text-eco-green' : ''
                  }`}>
                    Mes trajets
                  </span>
                </Link>
              </>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="hidden md:flex items-center space-x-3 bg-slate-50 rounded-full px-4 py-2 cursor-pointer">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-eco-blue text-white text-sm font-medium">
                        {getInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-slate-700 text-sm font-medium">
                      {getUserName(user)}
                    </span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Mon tableau de bord
                    </Link>
                  </DropdownMenuItem>
                  {user.profile?.role === 'employee' && (
                    <DropdownMenuItem onClick={() => window.location.href = '/employee'}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Espace employé
                    </DropdownMenuItem>
                  )}
                  {user.profile?.role === 'admin' && (
                    <DropdownMenuItem onClick={() => window.location.href = '/admin'}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Administration
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center space-x-3">
                <Link href="/login">
                  <Button variant="ghost">Se connecter</Button>
                </Link>
                <Link href="/register">
                  <Button>S'inscrire</Button>
                </Link>
              </div>
            )}
            
            {/* Mobile Menu Toggle */}
            <button className="md:hidden p-2 text-slate-700">
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                <span className="w-4 h-0.5 bg-current mb-1"></span>
                <span className="w-4 h-0.5 bg-current mb-1"></span>
                <span className="w-4 h-0.5 bg-current"></span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
