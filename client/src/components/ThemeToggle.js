import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

function ThemeToggle() {
  const { theme, toggleTheme, setLightTheme, setDarkTheme, setSystemTheme } = useTheme();
  const [showOptions, setShowOptions] = useState(false);

  const handleQuickToggle = () => {
    toggleTheme();
  };

  const handleOptionSelect = (option) => {
    switch (option) {
      case 'light':
        setLightTheme();
        break;
      case 'dark':
        setDarkTheme();
        break;
      case 'system':
        setSystemTheme();
        break;
      default:
        break;
    }
    setShowOptions(false);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'dark':
        return '🌙';
      case 'light':
        return '☀️';
      default:
        return '🌓';
    }
  };

  return (
    <div className="theme-toggle-container">
      {/* Gyors váltó gomb */}
      <button 
        className="theme-toggle-button"
        onClick={handleQuickToggle}
        title={`Jelenlegi téma: ${theme === 'dark' ? 'Sötét' : 'Világos'}`}
      >
        <span className="theme-icon">{getThemeIcon()}</span>
      </button>

      {/* Részletes opciók gomb */}
      <button 
        className="theme-options-button"
        onClick={() => setShowOptions(!showOptions)}
        title="Téma beállítások"
      >
        <span className="options-icon">⚙️</span>
      </button>

      {/* Opciók dropdown */}
      {showOptions && (
        <div className="theme-options-dropdown">
          <div className="theme-options-header">
            <h4>Téma Beállítások</h4>
          </div>
          
          <div className="theme-options-list">
            <button 
              className={`theme-option ${theme === 'light' ? 'active' : ''}`}
              onClick={() => handleOptionSelect('light')}
            >
              <span className="option-icon">☀️</span>
              <span className="option-text">Világos</span>
              {theme === 'light' && <span className="check-mark">✓</span>}
            </button>
            
            <button 
              className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => handleOptionSelect('dark')}
            >
              <span className="option-icon">🌙</span>
              <span className="option-text">Sötét</span>
              {theme === 'dark' && <span className="check-mark">✓</span>}
            </button>
            
            <button 
              className="theme-option"
              onClick={() => handleOptionSelect('system')}
            >
              <span className="option-icon">🖥️</span>
              <span className="option-text">Rendszer</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeToggle;
