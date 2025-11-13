import React, { useState, useEffect } from 'react';
import './TouchOptimized.css';

// Touch-optimized button component
export const TouchButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  className = '',
  ...props 
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = () => {
    if (!disabled) {
      setIsPressed(true);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  const classes = [
    'touch-btn',
    `touch-btn-${variant}`,
    `touch-btn-${size}`,
    isPressed && 'touch-btn-pressed',
    disabled && 'touch-btn-disabled',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      {...props}
    >
      {children}
    </button>
  );
};

// Touch-optimized card component
export const TouchCard = ({ 
  children, 
  onClick, 
  className = '',
  hoverable = false,
  ...props 
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = () => {
    if (onClick) {
      setIsPressed(true);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  const classes = [
    'touch-card',
    hoverable && 'touch-card-hoverable',
    isPressed && 'touch-card-pressed',
    onClick && 'touch-card-clickable',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      {...props}
    >
      {children}
    </div>
  );
};

// Touch-optimized input component
export const TouchInput = ({ 
  label,
  error,
  className = '',
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const classes = [
    'touch-input-wrapper',
    isFocused && 'touch-input-focused',
    error && 'touch-input-error',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {label && (
        <label className="touch-input-label">
          {label}
        </label>
      )}
      <input
        className="touch-input"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error && (
        <span className="touch-input-error-text">
          {error}
        </span>
      )}
    </div>
  );
};

// Touch-optimized select component
export const TouchSelect = ({ 
  label,
  options = [],
  error,
  className = '',
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const classes = [
    'touch-select-wrapper',
    isFocused && 'touch-select-focused',
    error && 'touch-select-error',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {label && (
        <label className="touch-select-label">
          {label}
        </label>
      )}
      <select
        className="touch-select"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      >
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="touch-select-error-text">
          {error}
        </span>
      )}
    </div>
  );
};

// Swipe gesture hook
export const useSwipeGesture = (onSwipeLeft, onSwipeRight, threshold = 50) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = threshold;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};

// Pull to refresh component
export const PullToRefresh = ({ 
  onRefresh, 
  children, 
  threshold = 80,
  className = '' 
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);

  const handleTouchStart = (e) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    
    if (distance > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(distance, threshold * 1.5));
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
  };

  const refreshProgress = Math.min(pullDistance / threshold, 1);

  return (
    <div 
      className={`pull-to-refresh ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pullDistance > 0 && (
        <div 
          className="pull-indicator"
          style={{ 
            transform: `translateY(${pullDistance}px)`,
            opacity: refreshProgress 
          }}
        >
          <div 
            className={`pull-icon ${isRefreshing ? 'spinning' : ''}`}
            style={{ 
              transform: `rotate(${refreshProgress * 180}deg)` 
            }}
          >
            🔄
          </div>
          <span className="pull-text">
            {isRefreshing ? 'Frissítés...' : pullDistance >= threshold ? 'Elengedés a frissítéshez' : 'Húzd le a frissítéshez'}
          </span>
        </div>
      )}
      <div 
        className="pull-content"
        style={{ 
          transform: `translateY(${pullDistance}px)` 
        }}
      >
        {children}
      </div>
    </div>
  );
};

// Haptic feedback hook (if supported)
export const useHapticFeedback = () => {
  const triggerHaptic = (type = 'impact') => {
    if (navigator.vibrate) {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(20);
          break;
        case 'heavy':
          navigator.vibrate(40);
          break;
        case 'success':
          navigator.vibrate([10, 50, 10]);
          break;
        case 'error':
          navigator.vibrate([20, 100, 20, 100, 20]);
          break;
        default:
          navigator.vibrate(15);
      }
    }
  };

  return { triggerHaptic };
};

export default {
  TouchButton,
  TouchCard,
  TouchInput,
  TouchSelect,
  useSwipeGesture,
  PullToRefresh,
  useHapticFeedback
};
