import apiService from './api';
import householdsService from './householdsService';

class StatisticsService {
  async getStatistics(params = {}) {
    try {
      const currentHousehold = householdsService.getCurrentHousehold();
      if (!currentHousehold || !currentHousehold.id) {
        throw new Error('Nincs kiválasztott háztartás');
      }
      
      // Query paraméterek összeállítása
      const queryParams = new URLSearchParams();
      queryParams.append('range', params.range || 'month');
      if (params.year) queryParams.append('year', params.year);
      if (params.month) queryParams.append('month', params.month);
      
      const data = await apiService.get(`/statistics/${currentHousehold.id}?${queryParams.toString()}`);
      console.log('Raw API response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }
}

export default new StatisticsService();
