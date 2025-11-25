import React, { useState, useEffect } from 'react';
import './NotificationDropdown.css';
import inAppNotificationService from '../services/inAppNotificationService';

/**
 * NotificationDropdown - Értesítések dropdown lista
 * Megjelenik a harang ikon alatt
 */
function NotificationDropdown({ onClose, onNotificationRead }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await inAppNotificationService.getNotifications(10, 0, false);
      setNotifications(response.notifications || []);
    } catch (error) {
      console.error('Értesítések betöltési hiba:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        await inAppNotificationService.markAsRead(notification.id);
        // Frissítjük a listát
        setNotifications(notifications.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        ));
        onNotificationRead();
      }

      // TODO: Navigáció az értesítés céljához
      // pl. ha expiry_warning, akkor navigálj a készlethez
    } catch (error) {
      console.error('Értesítés olvasottnak jelölési hiba:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await inAppNotificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      onNotificationRead();
    } catch (error) {
      console.error('Összes olvasottnak jelölési hiba:', error);
    }
  };

  const handleDelete = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await inAppNotificationService.deleteNotification(notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
      onNotificationRead();
    } catch (error) {
      console.error('Értesítés törlési hiba:', error);
    }
  };

  if (loading) {
    return (
      <div className="notification-dropdown">
        <div className="notification-header">
          <h3>🔔 Értesítések</h3>
        </div>
        <div className="notification-loading">
          <div className="spinner"></div>
          <p>Betöltés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3>🔔 Értesítések</h3>
        {notifications.some(n => !n.read) && (
          <button 
            className="mark-all-read-btn"
            onClick={handleMarkAllRead}
          >
            Összes olvasva
          </button>
        )}
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="no-notifications">
            <span className="no-notif-icon">✨</span>
            <p>Nincs új értesítés</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-icon">
                {inAppNotificationService.getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <div className="notification-title">{notification.title}</div>
                {notification.message && (
                  <div className="notification-message">{notification.message}</div>
                )}
                <div className="notification-time">
                  {inAppNotificationService.getRelativeTime(notification.created_at)}
                </div>
              </div>
              <button
                className="notification-delete"
                onClick={(e) => handleDelete(notification.id, e)}
                aria-label="Törlés"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="notification-footer">
          <button className="view-all-btn" onClick={onClose}>
            Bezárás
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
