import apiService from './api';

/**
 * Expiry Pattern Service - Frontend
 * Lejárati dátum javaslatok kezelése
 */

/**
 * Lejárati javaslat lekérése egy termékhez
 * @param {string} householdId - Háztartás azonosító
 * @param {string} barcode - Termék vonalkód (opcionális)
 * @param {string} productName - Termék név (opcionális)
 * @returns {Promise<Object|null>} Javaslat objektum vagy null
 */
export async function getExpirySuggestion(householdId, barcode = null, productName = null) {
  try {
    if (!householdId) {
      throw new Error('Household ID kötelező');
    }

    if (!barcode && !productName) {
      return null;
    }

    const params = new URLSearchParams();
    if (barcode) params.append('barcode', barcode);
    if (productName) params.append('productName', productName);

    const response = await apiService.get(
      `/households/${householdId}/inventory/expiry-suggestion?${params.toString()}`
    );

    return response;
  } catch (error) {
    console.error('Hiba a lejárati javaslat lekérésekor:', error);
    
    // Ha nincs elég adat, ne dobjunk hibát
    if (error.response?.data?.hasPattern === false) {
      return null;
    }
    
    return null;
  }
}

/**
 * Lejárati dátum számítása napok alapján
 * @param {number} days - Napok száma
 * @returns {string} ISO formátumú dátum (YYYY-MM-DD)
 */
export function calculateExpiryDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Napok számítása két dátum között
 * @param {string} startDate - Kezdő dátum (YYYY-MM-DD)
 * @param {string} endDate - Vég dátum (YYYY-MM-DD)
 * @returns {number} Napok száma
 */
export function calculateDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Formázza a lejárati javaslatot emberi nyelvű szöveggé
 * @param {Object} suggestion - Javaslat objektum
 * @returns {string} Formázott szöveg
 */
export function formatSuggestionMessage(suggestion) {
  if (!suggestion || !suggestion.hasPattern) {
    return '';
  }

  const { averageShelfLifeDays, sampleCount, confidence } = suggestion;
  
  let confidenceEmoji = '';
  if (confidence === 'high') confidenceEmoji = '✅';
  else if (confidence === 'medium') confidenceEmoji = '⚠️';
  else confidenceEmoji = 'ℹ️';

  return `${confidenceEmoji} ${suggestion.message}`;
}

export default {
  getExpirySuggestion,
  calculateExpiryDate,
  calculateDaysBetween,
  formatSuggestionMessage
};
