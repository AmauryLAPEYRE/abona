// Pricing Abona - Source unique de vérité pour le calcul des prix (CommonJS).
// Toute modification ici DOIT être répliquée dans src/pricing.js
// Les deux fichiers ont un contenu identique (ES modules vs CommonJS).

const { DISCOUNT_RATE, DAYS_IN_MONTH, MAX_DURATION_DAYS, MIN_DURATION_DAYS } = require('./constants');

/**
 * Calcule le prix proratisé avec réduction Abona.
 * @param {number} originalMonthlyPrice - Prix mensuel officiel (ex: 20€ pour ChatGPT)
 * @param {number} durationDays - Nombre de jours souhaités (2-15)
 * @returns {number} Prix final arrondi à 2 décimales
 */
function calculatePrice(originalMonthlyPrice, durationDays) {
  if (!originalMonthlyPrice || !durationDays || originalMonthlyPrice <= 0 || durationDays <= 0) {
    return 0;
  }

  const clampedDuration = Math.min(Math.max(durationDays, MIN_DURATION_DAYS), MAX_DURATION_DAYS);
  const discountedMonthly = originalMonthlyPrice * DISCOUNT_RATE;
  const dailyRate = discountedMonthly / DAYS_IN_MONTH;

  return parseFloat((dailyRate * clampedDuration).toFixed(2));
}

/**
 * Calcule le prix mensuel réduit.
 * @param {number} originalMonthlyPrice - Prix mensuel officiel
 * @returns {number} Prix mensuel avec réduction Abona
 */
function calculateDiscountedMonthly(originalMonthlyPrice) {
  if (!originalMonthlyPrice || originalMonthlyPrice <= 0) return 0;
  return parseFloat((originalMonthlyPrice * DISCOUNT_RATE).toFixed(2));
}

/**
 * Valide qu'une durée est dans les bornes autorisées.
 * @param {number} duration
 * @returns {number} Durée clampée entre MIN et MAX
 */
function clampDuration(duration) {
  return Math.min(Math.max(Math.round(duration) || MIN_DURATION_DAYS, MIN_DURATION_DAYS), MAX_DURATION_DAYS);
}

module.exports = { calculatePrice, calculateDiscountedMonthly, clampDuration };
