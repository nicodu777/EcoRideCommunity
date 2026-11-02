import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/navbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Footer } from "@/components/layout/footer";
import Home from "@/pages/home";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Dashboard from "@/pages/dashboard";
import SearchResults from "@/pages/search-results";
import TripDetailsPage from "@/pages/trip-details";
import LegalNotice from "@/pages/legal";
import { MessagesPage } from "@/pages/messages";
import NotFound from "@/pages/not-found";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Pages réservées (admin, employé) chargées seulement quand on les ouvre :
// un visiteur ne télécharge pas le code des graphiques de l'administrateur.
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const EmployeeLogin = lazy(() => import("@/pages/employee/login"));
const EmployeeDashboard = lazy(() => import("@/pages/employee/dashboard"));

/** Plan des pages de l'application (routage côté client avec wouter). */
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={SearchResults} />
      <Route path="/trips/:id" component={TripDetailsPage} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/employee/login" component={EmployeeLogin} />
      <Route path="/employee/dashboard" component={EmployeeDashboard} />
      <Route path="/employee"><Redirect to="/employee/login" /></Route>
      <Route path="/mentions-legales" component={LegalNotice} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <Navbar />
          <div className="flex-1">
            <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>}>
              <Router />
            </Suspense>
          </div>
          <Footer />
          <MobileNav />
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
