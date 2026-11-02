/**
 * Onglet « Mon impact » de l'espace utilisateur : bilan et badges,
 * calculés à partir des réservations et trajets réels de l'utilisateur
 * (aucune donnée inventée).
 */
import type { BookingWithTrip, TripWithDriver } from "@shared/schema";
import { estimateCo2SavedKg } from "@shared/co2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCredits } from "@/lib/labels";
import { Leaf, Route, Users, Coins, Award, Zap, Heart, Sprout, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ImpactPanelProps {
  bookings: BookingWithTrip[];
  driverTrips: TripWithDriver[];
}

type BadgeDef = { icon: LucideIcon; title: string; description: string; unlocked: boolean };

export function ImpactPanel({ bookings, driverTrips }: ImpactPanelProps) {
  // Côté passager : seuls les trajets validés comptent (le trajet a bien eu lieu)
  const doneBookings = bookings.filter((b) => b.status === "validated");
  const passengerCo2 = doneBookings.reduce(
    (sum, b) => sum + estimateCo2SavedKg(b.trip.departureTime, b.trip.arrivalTime, b.seatsBooked), 0);
  const creditsSpent = doneBookings.reduce((sum, b) => sum + Number(b.totalPrice), 0);

  // Côté chauffeur : trajets terminés et passagers transportés
  const doneTrips = driverTrips.filter((t) => t.status === "completed");
  const passengersCarried = doneTrips.reduce((sum, t) => sum + (t.totalSeats - t.availableSeats), 0);
  const driverCo2 = doneTrips.reduce(
    (sum, t) => sum + estimateCo2SavedKg(t.departureTime, t.arrivalTime, t.totalSeats - t.availableSeats), 0);

  const totalCo2 = passengerCo2 + driverCo2;

  const figures = [
    { icon: Route, label: "Trajets effectués", value: doneBookings.length + doneTrips.length },
    { icon: Users, label: "Passagers transportés", value: passengersCarried },
    { icon: Leaf, label: "CO₂ évité (estimation)", value: `${totalCo2} kg` },
    { icon: Coins, label: "Crédits dépensés", value: formatCredits(creditsSpent) },
  ];

  const badges: BadgeDef[] = [
    { icon: Sprout, title: "Premier pas", description: "Effectuer un premier covoiturage", unlocked: doneBookings.length + doneTrips.length >= 1 },
    { icon: Trophy, title: "Habitué", description: "Effectuer 5 covoiturages", unlocked: doneBookings.length + doneTrips.length >= 5 },
    { icon: Zap, title: "Électrique", description: "Voyager dans un véhicule électrique", unlocked: doneBookings.some((b) => b.trip.isEcological) },
    { icon: Heart, title: "Chauffeur solidaire", description: "Transporter un premier passager", unlocked: passengersCarried >= 1 },
    { icon: Leaf, title: "50 kg de CO₂ évités", description: "Cumuler 50 kg de CO₂ évités", unlocked: totalCo2 >= 50 },
  ];
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {figures.map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="p-5 text-center">
              <Icon className="w-7 h-7 text-eco-green mx-auto mb-2" aria-hidden="true" />
              <div className="text-xl font-bold text-slate-900">{value}</div>
              <div className="text-sm text-slate-600">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-eco-green" aria-hidden="true" />
            Mes badges ({unlockedCount}/{badges.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {badges.map(({ icon: Icon, title, description, unlocked }) => (
              <li
                key={title}
                className={`rounded-xl border p-4 text-center ${unlocked ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50 opacity-60"}`}
              >
                <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${unlocked ? "bg-eco-green text-white" : "bg-slate-200 text-slate-500"}`}>
                  <Icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="text-xs text-slate-600">{description}</p>
                <p className={`mt-1 text-xs font-medium ${unlocked ? "text-green-700" : "text-slate-500"}`}>
                  {unlocked ? "Obtenu" : "À débloquer"}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-slate-500">
        Estimation du CO₂ : durée du trajet × 80 km/h × 120 g de CO₂ évités par kilomètre et par place occupée.
      </p>
    </div>
  );
}
