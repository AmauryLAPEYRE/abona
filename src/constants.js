// Constantes métier - Pricing Abona
// L'admin entre le prix mensuel officiel du service.
// Le système applique la réduction puis proratise sur la durée choisie (max MAX_DURATION_DAYS).

export const DISCOUNT_RATE = 0.5;        // -50% sur le prix mensuel officiel
export const MAX_DURATION_DAYS = 15;     // Durée max achetable en une fois
export const MIN_DURATION_DAYS = 2;      // Durée min
export const DAYS_IN_MONTH = 30;         // Base fixe pour le calcul du prix journalier
