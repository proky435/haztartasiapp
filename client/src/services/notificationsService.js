import apiService from './api';

class NotificationsService {
  // Értesítések lekérése
  async getNotifications(filters = {}) {
    try {
      const response = await apiService.get('/notifications', filters);
      return {
        notifications: response.notifications || [],
        pagination: response.pagination || {},
        unreadCount: response.unreadCount || 0
      };
    } catch (error) {
      console.error('Get notifications error:', error);
      throw error;
    }
  }

  // Csak olvasatlan értesítések lekérése
  async getUnreadNotifications() {
    try {
      return await this.getNotifications({ unread_only: true });
    } catch (error) {
      console.error('Get unread notifications error:', error);
      throw error;
    }
  }

  // Értesítés olvasottnak jelölése
  async markAsRead(notificationId) {
    try {
      await apiService.put(`/notifications/${notificationId}/read`);
      
      // Event dispatch a komponenseknek
      window.dispatchEvent(new CustomEvent('notificationRead', {
        detail: { notificationId }
      }));
      
      return true;
    } catch (error) {
      console.error('Mark notification as read error:', error);
      throw error;
    }
  }

  // Összes értesítés olvasottnak jelölése
  async markAllAsRead() {
    try {
      const response = await apiService.put('/notifications/read-all');
      
      // Event dispatch a komponenseknek
      window.dispatchEvent(new CustomEvent('allNotificationsRead'));
      
      return response;
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      throw error;
    }
  }

  // Értesítés törlése
  async deleteNotification(notificationId) {
    try {
      await apiService.delete(`/notifications/${notificationId}`);
      
      // Event dispatch a komponenseknek
      window.dispatchEvent(new CustomEvent('notificationDeleted', {
        detail: { notificationId }
      }));
      
      return true;
    } catch (error) {
      console.error('Delete notification error:', error);
      throw error;
    }
  }

  // Értesítés típusok fordítása
  translateNotificationType(type) {
    const typeMap = {
      'expiry_warning': 'Lejárati figyelmeztetés',
      'low_stock': 'Alacsony készlet',
      'shopping_list_assigned': 'Bevásárlólista hozzárendelés',
      'shopping_list_completed': 'Bevásárlólista befejezve',
      'household_invitation': 'Háztartás meghívó',
      'member_joined': 'Új tag csatlakozott',
      'member_left': 'Tag kilépett',
      'inventory_updated': 'Készlet frissítve',
      'system_update': 'Rendszer frissítés'
    };

    return typeMap[type] || type;
  }

  // Értesítés prioritás színe
  getPriorityColor(priority) {
    const colorMap = {
      1: '#10b981', // green - alacsony
      2: '#3b82f6', // blue - közepes
      3: '#f59e0b', // amber - magas
      4: '#ef4444', // red - kritikus
      5: '#dc2626'  // dark red - sürgős
    };

    return colorMap[priority] || colorMap[1];
  }

  // Értesítés prioritás szövege
  getPriorityText(priority) {
    const textMap = {
      1: 'Alacsony',
      2: 'Közepes', 
      3: 'Magas',
      4: 'Kritikus',
      5: 'Sürgős'
    };

    return textMap[priority] || 'Közepes';
  }

  // Értesítés ikon típusa
  getNotificationIcon(type) {
    const iconMap = {
      'expiry_warning': '⚠️',
      'low_stock': '📦',
      'shopping_list_assigned': '🛒',
      'shopping_list_completed': '✅',
      'household_invitation': '🏠',
      'member_joined': '👋',
      'member_left': '👋',
      'inventory_updated': '📝',
      'system_update': '🔄'
    };

    return iconMap[type] || '📢';
  }

  // Értesítés formázása megjelenítéshez
  formatNotification(notification) {
    return {
      ...notification,
      typeText: this.translateNotificationType(notification.type),
      priorityColor: this.getPriorityColor(notification.priority),
      priorityText: this.getPriorityText(notification.priority),
      icon: this.getNotificationIcon(notification.type),
      timeAgo: this.getTimeAgo(notification.createdAt),
      isExpired: notification.expiresAt && new Date(notification.expiresAt) < new Date()
    };
  }

  // Relatív idő számítása
  getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return 'Most';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} perce`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} órája`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} napja`;
    } else {
      return date.toLocaleDateString('hu-HU');
    }
  }

  // Helyi értesítések kezelése (browser notification API)
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  // Browser értesítés küldése
  showBrowserNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      // Automatikus bezárás 5 másodperc után
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    }
    return null;
  }

  // Értesítések polling (valós idejű frissítés)
  startNotificationPolling(interval = 30000) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        const { unreadCount } = await this.getUnreadNotifications();
        
        // Ha van új értesítés, frissítjük a UI-t
        window.dispatchEvent(new CustomEvent('unreadCountChanged', {
          detail: { unreadCount }
        }));
      } catch (error) {
        console.error('Notification polling error:', error);
      }
    }, interval);
  }

  // Polling leállítása
  stopNotificationPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Értesítések csoportosítása típus szerint
  groupNotificationsByType(notifications) {
    return notifications.reduce((groups, notification) => {
      const type = notification.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(notification);
      return groups;
    }, {});
  }

  // Értesítések szűrése dátum szerint
  filterNotificationsByDate(notifications, days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return notifications.filter(notification => 
      new Date(notification.createdAt) >= cutoffDate
    );
  }
}

// Singleton instance
const notificationsService = new NotificationsService();

export default notificationsService;
