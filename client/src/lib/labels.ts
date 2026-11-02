/**
 * Libellés français des valeurs techniques renvoyées par l'API.
 * Centralisés ici pour être identiques sur toutes les pages.
 */
export const ENERGY_LABELS: Record<string, string> = {
  electric: "Électrique",
  hybrid: "Hybride",
  gasoline: "Essence",
  diesel: "Diesel",
};

export const TRIP_STATUS_LABELS: Record<string, string> = {
  pending: "À venir",
  started: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmée",
  cancelled: "Annulée",
  awaiting_validation: "À valider",
  validated: "Validée",
  disputed: "Litige en cours",
  refunded: "Remboursée",
};

export const ROLE_LABELS: Record<string, string> = {
  passenger: "Passager",
  driver: "Chauffeur",
  both: "Chauffeur et passager",
  admin: "Administrateur",
};

/** Affiche un montant en crédits (et non en euros : EcoRide fonctionne avec des crédits). */
export function formatCredits(value: string | number | null | undefined): string {
  const amount = Number(value ?? 0);
  return `${Number.isInteger(amount) ? amount : amount.toFixed(2)} crédit${Math.abs(amount) >= 2 ? "s" : ""}`;
}
