import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const useDarkThemeForce = () => {
  const { theme } = useTheme();

  useEffect(() => {
    if (theme !== 'dark') return;

    // Force dark backgrounds on all product list items
    const forceProductListItemBackgrounds = () => {
      const productItems = document.querySelectorAll('.product-list-item');
      
      productItems.forEach(item => {
        // Remove any inline white backgrounds from the main item
        item.style.removeProperty('background');
        item.style.removeProperty('background-color');
        
        // Check if it's an expired/expiring item
        const isExpired = item.classList.contains('expired') || 
                         item.classList.contains('expires-today') || 
                         item.classList.contains('expires-soon');
        
        // Force appropriate dark background
        const backgroundColor = isExpired ? '#334155' : '#1e293b';
        item.style.setProperty('background-color', backgroundColor, 'important');
        item.style.setProperty('background', backgroundColor, 'important');
        
        // Ensure buttons keep their proper colors
        const quantityButtons = item.querySelectorAll('.quantity-controls button');
        const deleteButton = item.querySelector('.delete-button');
        
        quantityButtons.forEach(btn => {
          btn.style.removeProperty('background');
          btn.style.removeProperty('background-color');
          btn.style.removeProperty('color');
        });
        
        if (deleteButton) {
          deleteButton.style.removeProperty('background');
          deleteButton.style.removeProperty('background-color');
          deleteButton.style.removeProperty('color');
        }
      });
    };

    // Initial force
    forceProductListItemBackgrounds();

    // Create a MutationObserver to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        // Check if new nodes were added
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.classList?.contains('product-list-item') || 
                  node.querySelector?.('.product-list-item')) {
                shouldUpdate = true;
              }
            }
          });
        }
        
        // Check if attributes changed (like style)
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'style' &&
            mutation.target.classList?.contains('product-list-item')) {
          shouldUpdate = true;
        }
      });
      
      if (shouldUpdate) {
        // Small delay to ensure DOM is ready
        setTimeout(forceProductListItemBackgrounds, 10);
      }
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // Also run periodically as a fallback
    const interval = setInterval(forceProductListItemBackgrounds, 1000);

    // Cleanup
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [theme]);
};
