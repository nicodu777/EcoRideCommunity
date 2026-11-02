/**
 * Gestion des véhicules du chauffeur (US8) : liste, ajout, suppression.
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Vehicle, InsertVehicle } from "@shared/schema";
import { ENERGY_TYPES } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiJson, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ENERGY_LABELS } from "@/lib/labels";
import { Car, Trash2, Leaf } from "lucide-react";

const EMPTY_VEHICLE: InsertVehicle = {
  plate: "", firstRegistrationDate: "", brand: "", model: "", color: "", energy: "electric", seats: 4,
};

export function VehicleManager() {
  const { toast } = useToast();
  const [form, setForm] = useState<InsertVehicle>(EMPTY_VEHICLE);

  const { data: vehicles = [] } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles/mine"] });

  const addVehicle = useMutation({
    mutationFn: (vehicle: InsertVehicle) => apiJson<Vehicle>("POST", "/api/vehicles", vehicle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles/mine"] });
      setForm(EMPTY_VEHICLE);
      toast({ title: "Véhicule ajouté" });
    },
    onError: (error: Error) => toast({ title: "Ajout impossible", description: error.message, variant: "destructive" }),
  });

  const removeVehicle = useMutation({
    mutationFn: (id: number) => apiJson("DELETE", `/api/vehicles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/vehicles/mine"] }),
    onError: (error: Error) => toast({ title: "Suppression impossible", description: error.message, variant: "destructive" }),
  });

  const update = (field: keyof InsertVehicle) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: field === "seats" ? Number(e.target.value) : e.target.value });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Car className="w-5 h-5 text-eco-green" aria-hidden="true" /> Mes véhicules</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {vehicles.length === 0 ? (
          <p className="text-slate-600">Aucun véhicule enregistré.</p>
        ) : (
          <ul className="divide-y">
            {vehicles.map((v) => (
              <li key={v.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900 flex items-center gap-2">
                    {v.brand} {v.model}
                    {v.energy === "electric" && <Leaf size={14} className="text-green-700" aria-label="Électrique" />}
                  </p>
                  <p className="text-sm text-slate-600">{v.plate} · {v.color} · {ENERGY_LABELS[v.energy]} · {v.seats} places · 1re immat. {v.firstRegistrationDate}</p>
                </div>
                <Button variant="ghost" size="sm" aria-label={`Supprimer ${v.brand} ${v.model}`}
                  onClick={() => removeVehicle.mutate(v.id)} disabled={removeVehicle.isPending}>
                  <Trash2 size={16} />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-4"
          onSubmit={(e) => { e.preventDefault(); addVehicle.mutate(form); }}
        >
          <h3 className="sm:col-span-2 font-semibold text-slate-900">Ajouter un véhicule</h3>
          <div><Label htmlFor="plate">Plaque d'immatriculation</Label><Input id="plate" value={form.plate} onChange={update("plate")} placeholder="AB-123-CD" required /></div>
          <div><Label htmlFor="registration">Date de 1re immatriculation</Label><Input id="registration" type="date" value={form.firstRegistrationDate} onChange={update("firstRegistrationDate")} required /></div>
          <div><Label htmlFor="brand">Marque</Label><Input id="brand" value={form.brand} onChange={update("brand")} required /></div>
          <div><Label htmlFor="model">Modèle</Label><Input id="model" value={form.model} onChange={update("model")} required /></div>
          <div><Label htmlFor="color">Couleur</Label><Input id="color" value={form.color} onChange={update("color")} required /></div>
          <div>
            <Label htmlFor="energy">Énergie</Label>
            <Select value={form.energy} onValueChange={(energy) => setForm({ ...form, energy: energy as InsertVehicle["energy"] })}>
              <SelectTrigger id="energy"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENERGY_TYPES.map((e) => <SelectItem key={e} value={e}>{ENERGY_LABELS[e]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="vseats">Nombre de places</Label><Input id="vseats" type="number" min={1} max={8} value={form.seats} onChange={update("seats")} required /></div>
          <div className="flex items-end">
            <Button type="submit" className="w-full bg-eco-green hover:bg-green-600" disabled={addVehicle.isPending}>Enregistrer</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
