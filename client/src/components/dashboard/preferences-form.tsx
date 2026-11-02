/**
 * Préférences du chauffeur (US8) : fumeur, animaux, et préférences libres.
 * Elles sont stockées dans la base NoSQL (MongoDB), car leur structure varie.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { DriverPreferences } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiJson, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings2, X } from "lucide-react";

export function PreferencesForm() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<DriverPreferences>({ smoker: false, animals: false, custom: [] });
  const [newPreference, setNewPreference] = useState("");

  const { data } = useQuery<DriverPreferences>({ queryKey: ["/api/preferences/me"] });
  useEffect(() => { if (data) setPrefs(data); }, [data]);

  const save = useMutation({
    mutationFn: (value: DriverPreferences) => apiJson<DriverPreferences>("PUT", "/api/preferences/me", value),
    onSuccess: (saved) => {
      queryClient.setQueryData(["/api/preferences/me"], saved);
      toast({ title: "Préférences enregistrées" });
    },
    onError: (error: Error) => toast({ title: "Enregistrement impossible", description: error.message, variant: "destructive" }),
  });

  const addCustom = () => {
    const value = newPreference.trim();
    if (value && !prefs.custom.includes(value)) setPrefs({ ...prefs, custom: [...prefs.custom, value] });
    setNewPreference("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5 text-eco-green" aria-hidden="true" /> Mes préférences de chauffeur</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch id="smoker" checked={prefs.smoker} onCheckedChange={(smoker) => setPrefs({ ...prefs, smoker })} />
          <Label htmlFor="smoker">J'accepte les fumeurs</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="animals" checked={prefs.animals} onCheckedChange={(animals) => setPrefs({ ...prefs, animals })} />
          <Label htmlFor="animals">J'accepte les animaux</Label>
        </div>

        <div>
          <Label htmlFor="custom">Autre préférence</Label>
          <div className="flex gap-2">
            <Input id="custom" maxLength={60} value={newPreference} placeholder="Ex. : pause toutes les 2 heures"
              onChange={(e) => setNewPreference(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }} />
            <Button type="button" variant="outline" onClick={addCustom}>Ajouter</Button>
          </div>
          <ul className="flex flex-wrap gap-2 mt-3">
            {prefs.custom.map((p) => (
              <li key={p} className="flex items-center gap-1 bg-slate-100 rounded-full px-3 py-1 text-sm">
                {p}
                <button type="button" aria-label={`Retirer ${p}`} onClick={() => setPrefs({ ...prefs, custom: prefs.custom.filter((c) => c !== p) })}>
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <Button className="bg-eco-green hover:bg-green-600" onClick={() => save.mutate(prefs)} disabled={save.isPending}>
          Enregistrer mes préférences
        </Button>
      </CardContent>
    </Card>
  );
}
