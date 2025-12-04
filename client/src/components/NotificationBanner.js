import React, { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { differenceInDays, parseISO } from 'date-fns';

function NotificationBanner({ products }) {
  const hasShownNotification = useRef(false);

  useEffect(() => {
    // Only show notification once when component mounts or products change significantly
    if (hasShownNotification.current || !products || products.length === 0) {
      return;
    }

    const checkExpiringProducts = () => {
      const today = new Date();
      const expired = [];
      const expiringToday = [];
      const expiringSoon = [];

      products.forEach(product => {
        if (product.expiryDate) {
          const expiryDate = parseISO(product.expiryDate);
          const daysUntilExpiry = differenceInDays(expiryDate, today);

          if (daysUntilExpiry < 0) {
            expired.push(product);
          } else if (daysUntilExpiry === 0) {
            expiringToday.push(product);
          } else if (daysUntilExpiry <= 3) {
            expiringSoon.push(product);
          }
        }
      });

      // Show toast notifications based on priority
      if (expired.length > 0) {
        const message = expired.length === 1 
          ? `🚨 ${expired[0].name} lejárt!`
          : `🚨 ${expired.length} termék lejárt! (${expired.slice(0, 3).map(p => p.name).join(', ')}${expired.length > 3 ? ` +${expired.length - 3} további` : ''})`;
        toast.error(message, { autoClose: 8000 });
        hasShownNotification.current = true;
      } else if (expiringToday.length > 0) {
        const message = expiringToday.length === 1 
          ? `⚠️ ${expiringToday[0].name} ma jár le!`
          : `⚠️ ${expiringToday.length} termék ma jár le! (${expiringToday.slice(0, 3).map(p => p.name).join(', ')}${expiringToday.length > 3 ? ` +${expiringToday.length - 3} további` : ''})`;
        toast.warning(message, { autoClose: 8000 });
        hasShownNotification.current = true;
      } else if (expiringSoon.length > 0) {
        const message = expiringSoon.length === 1 
          ? `📅 ${expiringSoon[0].name} hamarosan lejár`
          : `📅 ${expiringSoon.length} termék hamarosan lejár (${expiringSoon.slice(0, 3).map(p => p.name).join(', ')}${expiringSoon.length > 3 ? ` +${expiringSoon.length - 3} további` : ''})`;
        toast.info(message, { autoClose: 6000 });
        hasShownNotification.current = true;
      }
    };

    checkExpiringProducts();
  }, [products]);

  // This component no longer renders anything - it only shows toast notifications
  return null;
}

export default NotificationBanner;
