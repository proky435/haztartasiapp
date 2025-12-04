import React, { useState } from 'react';
import './FloatingActionButton.css';

const FloatingActionButton = ({ onAddProduct, onAddShoppingItem, onAddRecipe, onAddUtility }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleAction = (action) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className={`fab-container ${isOpen ? 'open' : ''}`}>
      {/* Háttér overlay */}
      {isOpen && <div className="fab-overlay" onClick={() => setIsOpen(false)} />}
      
      {/* Akció gombok */}
      <div className="fab-actions">
        <button 
          className="fab-action-button"
          onClick={() => handleAction(onAddUtility)}
          title="Új mérés/közműadat"
        >
          <span className="fab-icon">🔌</span>
          <span className="fab-label">Mérés</span>
        </button>
        
        <button 
          className="fab-action-button"
          onClick={() => handleAction(onAddRecipe)}
          title="Új recept"
        >
          <span className="fab-icon">🍳</span>
          <span className="fab-label">Recept</span>
        </button>
        
        <button 
          className="fab-action-button"
          onClick={() => handleAction(onAddShoppingItem)}
          title="Bevásárlólista elem"
        >
          <span className="fab-icon">🛒</span>
          <span className="fab-label">Lista</span>
        </button>
        
        <button 
          className="fab-action-button"
          onClick={() => handleAction(onAddProduct)}
          title="Termék hozzáadás"
        >
          <span className="fab-icon">➕</span>
          <span className="fab-label">Termék</span>
        </button>
      </div>
      
      {/* Fő FAB gomb */}
      <button 
        className={`fab-main-button ${isOpen ? 'active' : ''}`}
        onClick={toggleMenu}
        aria-label="Gyors műveletek"
      >
        <span className="fab-main-icon">{isOpen ? '✕' : '+'}</span>
      </button>
    </div>
  );
};

export default FloatingActionButton;
