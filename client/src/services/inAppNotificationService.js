import api from './api';

/**
 * In-App Notification Service
 * Értesítési központ frontend szolgáltatás
 */

const inAppNotificationService = {
  /**
   * Összes értesítés lekérése
   */
  async getNotifications(limit = 50, offset = 0, unreadOnly = false) {
    try {
      const response = await api.get('/in-app-notifications', {
        limit,
        offset,
        unread_only: unreadOnly
      });
      return response;
    } catch (error) {
      console.error('Értesítések lekérési hiba:', error);
      throw error;
    }
  },

  /**
   * Olvasatlan értesítések számának lekérése
   */
  async getUnreadCount() {
    try {
      const response = await api.get('/in-app-notifications/unread-count');
      return response.count;
    } catch (error) {
      console.error('Olvasatlan értesítések számának lekérési hiba:', error);
      return 0;
    }
  },

  /**
   * Értesítés olvasottnak jelölése
   */
  async markAsRead(notificationId) {
    try {
      const response = await api.patch(`/in-app-notifications/${notificationId}/read`);
      return response.notification;
    } catch (error) {
      console.error('Értesítés olvasottnak jelölési hiba:', error);
      throw error;
    }
  },

  /**
   * Összes értesítés olvasottnak jelölése
   */
  async markAllAsRead() {
    try {
      const response = await api.post('/in-app-notifications/mark-all-read');
      return response;
    } catch (error) {
      console.error('Összes értesítés olvasottnak jelölési hiba:', error);
      throw error;
    }
  },

  /**
   * Értesítés törlése
   */
  async deleteNotification(notificationId) {
    try {
      await api.delete(`/in-app-notifications/${notificationId}`);
    } catch (error) {
      console.error('Értesítés törlési hiba:', error);
      throw error;
    }
  },

  /**
   * Értesítés ikon lekérése típus alapján
   */
  getNotificationIcon(type) {
    const icons = {
      expiry_warning: '⚠️',
      low_stock: '🔴',
      budget_alert: '💰',
      recipe_shared: '🍳',
      shopping_reminder: '🛒',
      waste_alert: '🗑️',
      system: '🔔',
      success: '✅',
      info: 'ℹ️'
    };
    return icons[type] || '🔔';
  },

  /**
   * Értesítés színe típus alapján
   */
  getNotificationColor(type) {
    const colors = {
      expiry_warning: '#ff9800',
      low_stock: '#f44336',
      budget_alert: '#ff9800',
      recipe_shared: '#4caf50',
      shopping_reminder: '#2196f3',
      waste_alert: '#f44336',
      system: '#9e9e9e',
      success: '#4caf50',
      info: '#2196f3'
    };
    return colors[type] || '#9e9e9e';
  },

  /**
   * Pontos időformátum (pl. "2024.11.25. 23:15")
   */
  getRelativeTime(timestamp) {
    const time = new Date(timestamp);
    const now = new Date();
    const diffMs = now - time;
    const diffMin = Math.floor(diffMs / (1000 * 60));
    
    // Ha kevesebb mint 1 perc, akkor "Most"
    if (diffMin < 1) return 'Most';
    
    // Pontos dátum és idő formátum
    const year = time.getFullYear();
    const month = String(time.getMonth() + 1).padStart(2, '0');
    const day = String(time.getDate()).padStart(2, '0');
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    
    const today = new Date();
    const isToday = time.getDate() === today.getDate() && 
                    time.getMonth() === today.getMonth() && 
                    time.getFullYear() === today.getFullYear();
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = time.getDate() === yesterday.getDate() && 
                        time.getMonth() === yesterday.getMonth() && 
                        time.getFullYear() === yesterday.getFullYear();
    
    // Ha ma van, csak az időt mutatjuk
    if (isToday) {
      return `Ma ${hours}:${minutes}`;
    }
    
    // Ha tegnap volt
    if (isYesterday) {
      return `Tegnap ${hours}:${minutes}`;
    }
    
    // Egyébként teljes dátum + idő
    return `${year}.${month}.${day}. ${hours}:${minutes}`;
  }
};

export default inAppNotificationService;
