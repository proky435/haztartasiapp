import apiService from './api';

/**
 * Utilities Service - Közműfogyasztás kezelése
 */
class UtilitiesService {
  
  // =====================================================
  // KÖZMŰTÍPUSOK
  // =====================================================

  /**
   * Összes elérhető közműtípus lekérdezése
   * @returns {Promise<Array>} Közműtípusok listája
   */
  async getUtilityTypes() {
    try {
      const response = await apiService.get('/utilities/types');
      return response.data;
    } catch (error) {
      console.error('Error fetching utility types:', error);
      throw new Error(error.message || 'Hiba történt a közműtípusok betöltésekor');
    }
  }

  // =====================================================
  // KÖZMŰFOGYASZTÁS LEKÉRDEZÉSE
  // =====================================================

  /**
   * Háztartás közműfogyasztásainak lekérdezése
   * @param {string} householdId - Háztartás ID
   * @param {Object} filters - Szűrők (utility_type_id, start_date, end_date, limit, offset)
   * @returns {Promise<Object>} Fogyasztási adatok és statisztikák
   */
  async getUtilities(householdId, filters = {}) {
    try {
      const params = new URLSearchParams({
        household_id: householdId,
        ...filters
      });

      const response = await apiService.get(`/utilities?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching utilities:', error);
      throw new Error(error.message || 'Hiba történt a közműfogyasztások betöltésekor');
    }
  }

  /**
   * Közműfogyasztás statisztikák lekérdezése
   * @param {string} householdId - Háztartás ID
   * @param {string} period - Időszak (month, quarter, year)
   * @returns {Promise<Object>} Statisztikai adatok
   */
  async getUtilityStats(householdId, period = 'month') {
    try {
      const response = await apiService.get(`/utilities/stats/${householdId}?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching utility stats:', error);
      throw new Error(error.message || 'Hiba történt a statisztikák betöltésekor');
    }
  }

  // =====================================================
  // MÉRŐÓRA ÁLLÁS KEZELÉSE
  // =====================================================

  /**
   * Új mérőóra állás rögzítése
   * @param {Object} readingData - Mérési adatok
   * @returns {Promise<Object>} Létrehozott mérés
   */
  async addUtilityReading(readingData) {
    try {
      const response = await apiService.post('/utilities', readingData);
      return response.data;
    } catch (error) {
      console.error('Error adding utility reading:', error);
      throw new Error(error.message || 'Hiba történt a mérőóra állás rögzítésekor');
    }
  }

  /**
   * Mérőóra állás módosítása
   * @param {string} readingId - Mérés ID
   * @param {Object} readingData - Módosított adatok
   * @returns {Promise<Object>} Módosított mérés
   */
  async updateUtilityReading(readingId, readingData) {
    try {
      const response = await apiService.put(`/utilities/${readingId}`, readingData);
      return response.data;
    } catch (error) {
      console.error('Error updating utility reading:', error);
      throw new Error(error.message || 'Hiba történt a mérőóra állás módosításakor');
    }
  }

  /**
   * Mérőóra állás törlése
   * @param {string} readingId - Mérés ID
   * @returns {Promise<boolean>} Sikeres törlés
   */
  async deleteUtilityReading(readingId) {
    try {
      await apiService.delete(`/utilities/${readingId}`);
      return true;
    } catch (error) {
      console.error('Error deleting utility reading:', error);
      throw new Error(error.message || 'Hiba történt a mérőóra állás törlésekor');
    }
  }

  // =====================================================
  // ÁRBEÁLLÍTÁSOK KEZELÉSE
  // =====================================================

  /**
   * Háztartás közműbeállításainak lekérdezése
   * @param {string} householdId - Háztartás ID
   * @returns {Promise<Array>} Közműbeállítások listája
   */
  async getUtilitySettings(householdId) {
    try {
      const response = await apiService.get(`/utility-settings/${householdId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching utility settings:', error);
      throw new Error(error.message || 'Hiba történt a beállítások betöltésekor');
    }
  }

  /**
   * Közműbeállítás létrehozása vagy frissítése
   * @param {string} householdId - Háztartás ID
   * @param {Object} settingsData - Beállítási adatok
   * @returns {Promise<Object>} Mentett beállítás
   */
  async saveUtilitySettings(householdId, settingsData) {
    try {
      const response = await apiService.post(`/utility-settings/${householdId}`, settingsData);
      return response.data;
    } catch (error) {
      console.error('Error saving utility settings:', error);
      throw new Error(error.message || 'Hiba történt a beállítások mentésekor');
    }
  }

  /**
   * Konkrét közműbeállítás frissítése
   * @param {string} householdId - Háztartás ID
   * @param {string} utilityTypeId - Közműtípus ID
   * @param {Object} settingsData - Frissítendő adatok
   * @returns {Promise<Object>} Frissített beállítás
   */
  async updateUtilitySettings(householdId, utilityTypeId, settingsData) {
    try {
      const response = await apiService.put(`/utility-settings/${householdId}/${utilityTypeId}`, settingsData);
      return response.data;
    } catch (error) {
      console.error('Error updating utility settings:', error);
      throw new Error(error.message || 'Hiba történt a beállítások frissítésekor');
    }
  }

  /**
   * Közműbeállítás letiltása
   * @param {string} householdId - Háztartás ID
   * @param {string} utilityTypeId - Közműtípus ID
   * @returns {Promise<boolean>} Sikeres letiltás
   */
  async disableUtilitySettings(householdId, utilityTypeId) {
    try {
      await apiService.delete(`/utility-settings/${householdId}/${utilityTypeId}`);
      return true;
    } catch (error) {
      console.error('Error disabling utility settings:', error);
      throw new Error(error.message || 'Hiba történt a beállítások letiltásakor');
    }
  }

  /**
   * Költségkalkulátor - adott fogyasztásra számított költség
   * @param {string} householdId - Háztartás ID
   * @param {string} utilityTypeId - Közműtípus ID
   * @param {number} consumption - Fogyasztás mennyisége
   * @returns {Promise<Object>} Számított költség részletei
   */
  async calculateUtilityCost(householdId, utilityTypeId, consumption) {
    try {
      const response = await apiService.get(`/utility-settings/${householdId}/calculate/${utilityTypeId}?consumption=${consumption}`);
      return response.data;
    } catch (error) {
      console.error('Error calculating utility cost:', error);
      throw new Error(error.message || 'Hiba történt a költségszámításkor');
    }
  }

  // =====================================================
  // SEGÉDFÜGGVÉNYEK
  // =====================================================

  /**
   * Fogyasztás formázása megjelenítéshez
   * @param {number} consumption - Fogyasztás értéke
   * @param {string} unit - Mértékegység
   * @returns {string} Formázott fogyasztás
   */
  formatConsumption(consumption, unit) {
    if (!consumption || consumption === 0) return '0 ' + unit;
    
    if (consumption < 1) {
      return `${(consumption * 1000).toFixed(0)} ${unit === 'm³' ? 'liter' : 'Wh'}`;
    }
    
    return `${consumption.toFixed(2)} ${unit}`;
  }

  /**
   * Költség formázása
   * @param {number} cost - Költség Ft-ban
   * @returns {string} Formázott költség
   */
  formatCost(cost) {
    if (!cost || cost === 0) return '0 Ft';
    
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(cost);
  }

  /**
   * Dátum formázása
   * @param {string} dateString - ISO dátum string
   * @returns {string} Formázott dátum
   */
  formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }

  /**
   * Hónap név lekérése
   * @param {string} dateString - ISO dátum string
   * @returns {string} Hónap neve
   */
  getMonthName(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('hu-HU', {
      year: 'numeric',
      month: 'long'
    }).format(date);
  }

  /**
   * Fogyasztás trend kiszámítása
   * @param {Array} readings - Mérések listája (időrendi sorrendben)
   * @returns {Object} Trend információ
   */
  calculateTrend(readings) {
    if (!readings || readings.length < 2) {
      return { trend: 'neutral', percentage: 0, message: 'Nincs elég adat a trend számításához' };
    }

    const latest = readings[0];
    const previous = readings[1];

    if (!latest.consumption || !previous.consumption) {
      return { trend: 'neutral', percentage: 0, message: 'Hiányos fogyasztási adatok' };
    }

    const change = ((latest.consumption - previous.consumption) / previous.consumption) * 100;
    
    let trend = 'neutral';
    let message = 'Változatlan fogyasztás';
    
    if (change > 5) {
      trend = 'up';
      message = `${change.toFixed(1)}%-kal nőtt a fogyasztás`;
    } else if (change < -5) {
      trend = 'down';
      message = `${Math.abs(change).toFixed(1)}%-kal csökkent a fogyasztás`;
    } else {
      message = 'Stabil fogyasztás';
    }

    return {
      trend,
      percentage: Math.abs(change),
      message,
      change: change
    };
  }

  /**
   * Havi átlag fogyasztás kiszámítása
   * @param {Array} readings - Mérések listája
   * @param {number} months - Hónapok száma
   * @returns {number} Havi átlag
   */
  calculateMonthlyAverage(readings, months = 12) {
    if (!readings || readings.length === 0) return 0;

    const totalConsumption = readings
      .filter(reading => reading.consumption > 0)
      .reduce((sum, reading) => sum + reading.consumption, 0);

    return totalConsumption / Math.min(readings.length, months);
  }

  /**
   * Következő leolvasás dátumának becslése
   * @param {Array} readings - Mérések listája
   * @returns {string} Becsült dátum (ISO string)
   */
  estimateNextReadingDate(readings) {
    if (!readings || readings.length < 2) {
      // Ha nincs elég adat, 30 napot adunk hozzá az utolsó méréshez
      const lastReading = readings?.[0];
      if (lastReading) {
        const nextDate = new Date(lastReading.reading_date);
        nextDate.setDate(nextDate.getDate() + 30);
        return nextDate.toISOString().split('T')[0];
      }
      return new Date().toISOString().split('T')[0];
    }

    // Átlagos időköz kiszámítása az utolsó mérések alapján
    const intervals = [];
    for (let i = 0; i < Math.min(readings.length - 1, 3); i++) {
      const current = new Date(readings[i].reading_date);
      const previous = new Date(readings[i + 1].reading_date);
      const diffDays = Math.abs((current - previous) / (1000 * 60 * 60 * 24));
      intervals.push(diffDays);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
    const lastDate = new Date(readings[0].reading_date);
    lastDate.setDate(lastDate.getDate() + Math.round(avgInterval));
    
    return lastDate.toISOString().split('T')[0];
  }
}

// Singleton instance
const utilitiesService = new UtilitiesService();

export default utilitiesService;
