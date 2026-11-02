/**
 * Estimation du CO₂ évité par le covoiturage (partagée client / serveur).
 *
 * Hypothèses, volontairement simples et affichées comme une estimation :
 * - la distance est déduite de la durée du trajet, à 80 km/h de moyenne ;
 * - chaque place occupée évite le trajet d'une autre voiture, soit
 *   120 g de CO₂ par kilomètre (moyenne d'une voiture thermique en France).
 */
export const AVERAGE_SPEED_KMH = 80;
export const CO2_SAVED_KG_PER_KM = 0.12;

/** CO₂ évité (kg, arrondi) pour un trajet et un nombre de places occupées. */
export function estimateCo2SavedKg(departureTime: Date | string, arrivalTime: Date | string, seats = 1): number {
  const hours = (new Date(arrivalTime).getTime() - new Date(departureTime).getTime()) / 3_600_000;
  if (!(hours > 0)) return 0;
  return Math.round(hours * AVERAGE_SPEED_KMH * CO2_SAVED_KG_PER_KM * seats);
}
