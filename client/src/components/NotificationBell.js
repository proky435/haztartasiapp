import React, { useState, useEffect, useRef } from 'react';
import './NotificationBell.css';
import inAppNotificationService from '../services/inAppNotificationService';
import NotificationDropdown from './NotificationDropdown';

/**
 * NotificationBell - Harang ikon a header-ben
 * Badge-dzsel mutatja az olvasatlan értesítések számát
 */
function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    loadUnreadCount();
    
    // Polling - 30 másodpercenként frissítés
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Click outside handler
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const loadUnreadCount = async () => {
    try {
      const count = await inAppNotificationService.getUnreadCount();
      const oldCount = unreadCount;
      setUnreadCount(count);

      // Animáció ha új értesítés érkezett
      if (count > oldCount && count > 0) {
        triggerAnimation();
      }
    } catch (error) {
      console.error('Olvasatlan értesítések számának betöltési hiba:', error);
    }
  };

  const triggerAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleNotificationRead = () => {
    // Frissítjük a számlálót
    loadUnreadCount();
  };

  return (
    <div className="notification-bell-container" ref={bellRef}>
      <button
        className={`notification-bell ${isAnimating ? 'bell-shake' : ''}`}
        onClick={handleBellClick}
        aria-label="Értesítések"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className={`notification-badge ${isAnimating ? 'badge-pulse' : ''}`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <NotificationDropdown
          onClose={() => setShowDropdown(false)}
          onNotificationRead={handleNotificationRead}
        />
      )}
    </div>
  );
}

export default NotificationBell;
