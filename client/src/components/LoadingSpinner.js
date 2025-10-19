import React from 'react';
import './LoadingSpinner.css';

function LoadingSpinner({ message = 'Betöltés...', size = 'medium' }) {
  return (
    <div className="loading-container">
      <div className={`loading-spinner ${size}`}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}

export default LoadingSpinner;
