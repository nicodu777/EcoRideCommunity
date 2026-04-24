import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { authService, AuthUser } from "@/lib/auth";
import { Search, Plus, Calendar, User } from "lucide-react";

export function MobileNav() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [location] = useLocation();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
    });

    return unsubscribe;
  }, []);

  if (!user) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 z-40">
      <div className="grid grid-cols-4 gap-1">
        <Link href="/search">
          <div className={`flex flex-col items-center py-2 ${
            location === '/search' ? 'text-eco-green' : 'text-slate-400'
          }`}>
            <Search className="mb-1" size={20} />
            <span className="text-xs font-medium">Rechercher</span>
          </div>
        </Link>
        
        <Link href="/dashboard?tab=publish">
          <div className={`flex flex-col items-center py-2 ${
            location.includes('publish') ? 'text-eco-green' : 'text-slate-400'
          }`}>
            <Plus className="mb-1" size={20} />
            <span className="text-xs">Publier</span>
          </div>
        </Link>
        
        <Link href="/dashboard">
          <div className={`flex flex-col items-center py-2 ${
            location === '/dashboard' ? 'text-eco-green' : 'text-slate-400'
          }`}>
            <Calendar className="mb-1" size={20} />
            <span className="text-xs">Mes trajets</span>
          </div>
        </Link>
        
        <Link href="/dashboard?tab=profile">
          <div className={`flex flex-col items-center py-2 ${
            location.includes('profile') ? 'text-eco-green' : 'text-slate-400'
          }`}>
            <User className="mb-1" size={20} />
            <span className="text-xs">Profil</span>
          </div>
        </Link>
      </div>
    </nav>
  );
}
