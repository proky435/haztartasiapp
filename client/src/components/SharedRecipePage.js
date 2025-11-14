import React, { useState, useEffect } from 'react';
// import { useParams } from 'react-router-dom';
import './SharedRecipePage.css';

const SharedRecipePage = ({ shareId }) => {
  // const { shareId } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (shareId) {
      loadSharedRecipe();
    }
  }, [shareId]);

  const loadSharedRecipe = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://192.168.0.19:3001'}/api/v1/shared-recipes/${shareId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('A recept nem található vagy nem publikus');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Hiba a recept betöltésekor');
      }

      const result = await response.json();
      setRecipe(result.data);

    } catch (error) {
      console.error('Shared recipe load error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (minutes) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} perc`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}ó ${remainingMinutes}p` : `${hours} óra`;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'gyors': return '#10b981';
      case 'könnyű': return '#3b82f6';
      case 'közepes': return '#f59e0b';
      case 'nehéz': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (isLoading) {
    return (
      <div className="shared-recipe-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Recept betöltése...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shared-recipe-page">
        <div className="error-container">
          <div className="error-icon">😞</div>
          <h2>Hiba történt</h2>
          <p>{error}</p>
          <button onClick={() => window.location.href = '/'} className="home-button">
            🏠 Főoldal
          </button>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="shared-recipe-page">
        <div className="error-container">
          <div className="error-icon">📝</div>
          <h2>Recept nem található</h2>
          <p>A keresett recept nem létezik vagy nem elérhető.</p>
          <button onClick={() => window.location.href = '/'} className="home-button">
            🏠 Főoldal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shared-recipe-page">
      <div className="recipe-container">
        {/* Header */}
        <div className="recipe-header">
          <div className="recipe-title-section">
            <h1>{recipe.title}</h1>
            <div className="recipe-meta">
              {recipe.viewCount > 0 && (
                <span className="view-count">👁️ {recipe.viewCount} megtekintés</span>
              )}
            </div>
          </div>
          
          <div className="recipe-stats">
            {recipe.cookingTime && (
              <div className="stat">
                <span className="stat-icon">⏱️</span>
                <span>{formatTime(recipe.cookingTime)}</span>
              </div>
            )}
            {recipe.servings && (
              <div className="stat">
                <span className="stat-icon">👥</span>
                <span>{recipe.servings} adag</span>
              </div>
            )}
            {recipe.difficulty && (
              <div 
                className="difficulty-badge"
                style={{ backgroundColor: getDifficultyColor(recipe.difficulty) }}
              >
                {recipe.difficulty}
              </div>
            )}
          </div>
        </div>

        {/* Recipe Image */}
        {recipe.imageUrl && (
          <div className="recipe-image-container">
            <img 
              src={recipe.imageUrl} 
              alt={recipe.title}
              className="recipe-image"
            />
          </div>
        )}

        {/* Description */}
        {recipe.description && (
          <div className="recipe-section">
            <h2>📝 Leírás</h2>
            <p className="recipe-description">{recipe.description}</p>
          </div>
        )}

        {/* Ingredients */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className="recipe-section">
            <h2>🥘 Hozzávalók</h2>
            <ul className="ingredients-list">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="ingredient-item">
                  <span className="ingredient-bullet">•</span>
                  <span className="ingredient-text">{ingredient}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructions */}
        {recipe.instructions && recipe.instructions.length > 0 && (
          <div className="recipe-section">
            <h2>👩‍🍳 Elkészítés</h2>
            <ol className="instructions-list">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="instruction-item">
                  <span className="instruction-number">{index + 1}</span>
                  <span className="instruction-text">{instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Footer */}
        <div className="recipe-footer">
          <div className="share-info">
            <p>📱 Ez a recept megosztva lett a Háztartási App-ból</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="app-link-button"
            >
              🚀 Próbáld ki te is!
            </button>
          </div>
          
          <div className="created-date">
            <small>
              Létrehozva: {new Date(recipe.createdAt).toLocaleDateString('hu-HU')}
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedRecipePage;
