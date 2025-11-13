import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

function ThemeToggle({ onSettingsClick }) {
  const { theme, toggleTheme } = useTheme();

  const handleQuickToggle = () => {
    toggleTheme();
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

      {/* Általános beállítások gomb */}
      <button 
        className="settings-button"
        onClick={onSettingsClick}
        title="Beállítások"
      >
        <span className="settings-icon">⚙️</span>
      </button>

    </div>
  );
}

export default ThemeToggle;
