import React from 'react';
import './RecipeModal.css';

const RecipeModal = ({ recipe, onClose }) => {
  if (!recipe) return null;

  // Debug: log recipe structure
  console.log('RecipeModal recipe:', recipe);

  const formatTime = (minutes) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes} perc`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}ó ${remainingMinutes}p` : `${hours} óra`;
  };

  return (
    <div className="recipe-modal-overlay" onClick={onClose}>
      <div className="recipe-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{recipe.title}</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="modal-content">
          {/* Recept kép */}
          {(recipe.image_url || recipe.image) && (
            <div className="modal-recipe-image">
              <img 
                src={recipe.image_url || recipe.image} 
                alt={recipe.title}
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
          )}

          {/* Recept információk */}
          <div className="recipe-info">
            {(recipe.description || recipe.summary) && (
              <div 
                className="modal-recipe-description"
                dangerouslySetInnerHTML={{ 
                  __html: recipe.description || recipe.summary 
                }}
              />
            )}

            <div className="modal-recipe-stats">
              {(recipe.cookingTime || recipe.readyInMinutes) && (
                <div className="modal-stat">
                  <span className="stat-icon">⏱️</span>
                  <span>{formatTime(recipe.cookingTime || recipe.readyInMinutes)}</span>
                </div>
              )}
              {recipe.servings && (
                <div className="modal-stat">
                  <span className="stat-icon">👥</span>
                  <span>{recipe.servings} adag</span>
                </div>
              )}
              {(recipe.difficulty || recipe.readyInMinutes) && (
                <div className="modal-stat">
                  <span className="stat-icon">📊</span>
                  <span>{recipe.difficulty || (recipe.readyInMinutes > 60 ? 'Nehéz' : recipe.readyInMinutes > 30 ? 'Közepes' : 'Könnyű')}</span>
                </div>
              )}
              {recipe.likes && (
                <div className="modal-stat">
                  <span className="stat-icon">❤️</span>
                  <span>{recipe.likes} kedvelés</span>
                </div>
              )}
            </div>
          </div>

          {/* Hozzávalók */}
          {((Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) || 
            (recipe.extendedIngredients && recipe.extendedIngredients.length > 0)) && (
            <div className="modal-section">
              <h3>🥘 Hozzávalók</h3>
              <ul className="modal-ingredients-list">
                {Array.isArray(recipe.ingredients) ? (
                  // Saját receptek hozzávalói
                  recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="modal-ingredient-item">
                      <span className="ingredient-bullet">•</span>
                      <span className="ingredient-text">{ingredient}</span>
                    </li>
                  ))
                ) : (
                  // API receptek hozzávalói
                  recipe.extendedIngredients?.map((ingredient, index) => (
                    <li key={index} className="modal-ingredient-item">
                      <span className="ingredient-bullet">•</span>
                      <span className="ingredient-text">
                        {ingredient.amount} {ingredient.unit} {ingredient.name}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {/* Elkészítés */}
          {((Array.isArray(recipe.instructions) && recipe.instructions.length > 0) || 
            (recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0) ||
            (typeof recipe.instructions === 'string' && recipe.instructions.trim())) && (
            <div className="modal-section">
              <h3>👩‍🍳 Elkészítés</h3>
              <ol className="modal-instructions-list">
                {Array.isArray(recipe.instructions) ? (
                  // Saját receptek utasításai (tömb)
                  recipe.instructions.map((instruction, index) => (
                    <li key={index} className="modal-instruction-item">
                      <span className="instruction-number">{index + 1}</span>
                      <span className="instruction-text">{instruction}</span>
                    </li>
                  ))
                ) : typeof recipe.instructions === 'string' ? (
                  // Saját receptek utasításai (string)
                  <li className="modal-instruction-item">
                    <span className="instruction-number">1</span>
                    <span className="instruction-text">{recipe.instructions}</span>
                  </li>
                ) : (
                  // API receptek utasításai
                  recipe.analyzedInstructions?.[0]?.steps?.map((step, index) => (
                    <li key={index} className="modal-instruction-item">
                      <span className="instruction-number">{step.number}</span>
                      <span className="instruction-text">{step.step}</span>
                    </li>
                  ))
                )}
              </ol>
            </div>
          )}

          {/* Forrás információ importált recepteknél */}
          {recipe.source_type && recipe.source_type !== 'manual' && (
            <div className="modal-section">
              <div className="recipe-source">
                <h4>📥 Forrás</h4>
                {recipe.source_url && (
                  <p>
                    <strong>URL:</strong>{' '}
                    <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
                      {recipe.source_url}
                    </a>
                  </p>
                )}
                {recipe.source_filename && (
                  <p><strong>Fájl:</strong> {recipe.source_filename}</p>
                )}
                <p><strong>Típus:</strong> {recipe.source_type === 'url' ? 'URL importálás' : 'PDF importálás'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeModal;
