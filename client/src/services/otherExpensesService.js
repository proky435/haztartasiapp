import apiService from './api';
import householdsService from './householdsService';

class OtherExpensesService {
  async getExpenses() {
    try {
      const currentHousehold = householdsService.getCurrentHousehold();
      if (!currentHousehold || !currentHousehold.id) {
        throw new Error('Nincs kiválasztott háztartás');
      }

      const data = await apiService.get(`/other-expenses/${currentHousehold.id}`);
      return data.expenses || [];
    } catch (error) {
      console.error('Error fetching other expenses:', error);
      throw error;
    }
  }

  async addExpense(expenseData) {
    try {
      const currentHousehold = householdsService.getCurrentHousehold();
      if (!currentHousehold || !currentHousehold.id) {
        throw new Error('Nincs kiválasztott háztartás');
      }

      const data = await apiService.post(`/other-expenses/${currentHousehold.id}`, expenseData);
      return data.expense;
    } catch (error) {
      console.error('Error adding other expense:', error);
      throw error;
    }
  }

  async updateExpense(expenseId, expenseData) {
    try {
      const currentHousehold = householdsService.getCurrentHousehold();
      if (!currentHousehold || !currentHousehold.id) {
        throw new Error('Nincs kiválasztott háztartás');
      }

      const data = await apiService.put(`/other-expenses/${currentHousehold.id}/${expenseId}`, expenseData);
      return data.expense;
    } catch (error) {
      console.error('Error updating other expense:', error);
      throw error;
    }
  }

  async deleteExpense(expenseId) {
    try {
      const currentHousehold = householdsService.getCurrentHousehold();
      if (!currentHousehold || !currentHousehold.id) {
        throw new Error('Nincs kiválasztott háztartás');
      }

      await apiService.delete(`/other-expenses/${currentHousehold.id}/${expenseId}`);
    } catch (error) {
      console.error('Error deleting other expense:', error);
      throw error;
    }
  }

  formatCost(amount) {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0
    }).format(amount || 0);
  }
}

export default new OtherExpensesService();
