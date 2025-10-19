import React, { useState, useEffect } from 'react';
import './NotificationBanner.css';
import { differenceInDays, parseISO } from 'date-fns';

function NotificationBanner({ products }) {
  const [notifications, setNotifications] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkExpiringProducts = () => {
      const today = new Date();
      const expiringProducts = [];

      products.forEach(product => {
        if (product.expiryDate) {
          const expiryDate = parseISO(product.expiryDate);
          const daysUntilExpiry = differenceInDays(expiryDate, today);

          if (daysUntilExpiry < 0) {
            expiringProducts.push({
              ...product,
              status: 'expired',
              message: `${product.name} lejárt!`,
              priority: 'high'
            });
          } else if (daysUntilExpiry === 0) {
            expiringProducts.push({
              ...product,
              status: 'today',
              message: `${product.name} ma jár le!`,
              priority: 'high'
            });
          } else if (daysUntilExpiry <= 3) {
            expiringProducts.push({
              ...product,
              status: 'soon',
              message: `${product.name} ${daysUntilExpiry} nap múlva jár le`,
              priority: 'medium'
            });
          }
        }
      });

      setNotifications(expiringProducts);
      setIsVisible(expiringProducts.length > 0);
    };

    checkExpiringProducts();
  }, [products]);

  const dismissNotification = () => {
    setIsVisible(false);
  };

  const getHighestPriorityNotification = () => {
    if (notifications.length === 0) return null;
    
    const expired = notifications.filter(n => n.status === 'expired');
    const today = notifications.filter(n => n.status === 'today');
    const soon = notifications.filter(n => n.status === 'soon');

    if (expired.length > 0) {
      return {
        type: 'expired',
        count: expired.length,
        message: expired.length === 1 
          ? expired[0].message 
          : `${expired.length} termék lejárt!`,
        items: expired
      };
    }

    if (today.length > 0) {
      return {
        type: 'today',
        count: today.length,
        message: today.length === 1 
          ? today[0].message 
          : `${today.length} termék ma jár le!`,
        items: today
      };
    }

    if (soon.length > 0) {
      return {
        type: 'soon',
        count: soon.length,
        message: soon.length === 1 
          ? soon[0].message 
          : `${soon.length} termék hamarosan lejár`,
        items: soon
      };
    }

    return null;
  };

  const notification = getHighestPriorityNotification();

  if (!isVisible || !notification) {
    return null;
  }

  return (
    <div className={`notification-banner ${notification.type}`}>
      <div className="notification-content">
        <div className="notification-icon">
          {notification.type === 'expired' && '🚨'}
          {notification.type === 'today' && '⚠️'}
          {notification.type === 'soon' && '📅'}
        </div>
        <div className="notification-text">
          <strong>{notification.message}</strong>
          {notification.count > 1 && (
            <div className="notification-details">
              {notification.items.slice(0, 3).map(item => (
                <span key={item.id} className="product-name">
                  {item.name}
                </span>
              ))}
              {notification.items.length > 3 && (
                <span className="more-items">
                  +{notification.items.length - 3} további
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <button 
        className="dismiss-button"
        onClick={dismissNotification}
        title="Értesítés elrejtése"
      >
        ×
      </button>
    </div>
  );
}

export default NotificationBanner;
