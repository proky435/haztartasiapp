import api from './api';

/**
 * Consumption Tracking Service
 * Frontend API hívások a fogyasztási statisztikákhoz
 */

/**
 * Fogyasztási statisztika lekérése egy termékhez
 */
export const getConsumptionStats = async (householdId, productId, customName = null) => {
  try {
    const params = customName ? { customName } : {};
    const response = await api.get(
      `/households/${householdId}/consumption/stats/${productId}`,
      params
    );
    return response;
  } catch (error) {
    console.error('Error fetching consumption stats:', error);
    throw error;
  }
};

/**
 * Készlet elfogyási előrejelzés
 */
export const getStockPrediction = async (householdId, inventoryId) => {
  try {
    const response = await api.get(
      `/households/${householdId}/consumption/prediction/${inventoryId}`
    );
    return response;
  } catch (error) {
    console.error('Error fetching stock prediction:', error);
    throw error;
  }
};

/**
 * Automatikus bevásárlási javaslatok
 */
export const getAutoSuggestions = async (householdId) => {
  try {
    const response = await api.get(
      `/households/${householdId}/consumption/suggestions`
    );
    return response;
  } catch (error) {
    console.error('Error fetching auto suggestions:', error);
    throw error;
  }
};

/**
 * Pazarlás statisztika
 */
export const getWasteStatistics = async (householdId, months = 1) => {
  try {
    const response = await api.get(
      `/households/${householdId}/consumption/waste`,
      { months }
    );
    return response;
  } catch (error) {
    console.error('Error fetching waste statistics:', error);
    throw error;
  }
};

export default {
  getConsumptionStats,
  getStockPrediction,
  getAutoSuggestions,
  getWasteStatistics
};
