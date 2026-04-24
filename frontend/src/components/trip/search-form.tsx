import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

interface SearchFormProps {
  onSearch: (departure: string, destination: string, date?: string) => void;
  loading?: boolean;
}

export function SearchForm({ onSearch, loading = false }: SearchFormProps) {
  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (departure.trim() && destination.trim()) {
      onSearch(departure.trim(), destination.trim(), date || undefined);
    }
  };

  return (
    <Card className="shadow-lg border border-slate-200">
      <CardContent className="p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
          Trouvez votre trajet écoresponsable
        </h2>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Departure */}
          <div className="space-y-2">
            <Label htmlFor="departure" className="text-sm font-medium text-slate-700">
              Départ
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-slate-400" size={16} />
              <Input
                id="departure"
                type="text"
                placeholder="Paris"
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                className="pl-10 focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                required
              />
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination" className="text-sm font-medium text-slate-700">
              Destination
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-slate-400" size={16} />
              <Input
                id="destination"
                type="text"
                placeholder="Lyon"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="pl-10 focus:ring-2 focus:ring-eco-green focus:border-eco-green"
                required
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium text-slate-700">
              Date
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 text-slate-400" size={16} />
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="pl-10 focus:ring-2 focus:ring-eco-green focus:border-eco-green"
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="space-y-2">
            <Label className="opacity-0">Rechercher</Label>
            <Button 
              type="submit" 
              className="w-full bg-eco-green hover:bg-green-600 shadow-md"
              disabled={loading}
            >
              <Search className="mr-2" size={16} />
              {loading ? "Recherche..." : "Rechercher"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
