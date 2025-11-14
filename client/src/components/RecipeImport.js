import React, { useState } from 'react';
import './RecipeImport.css';

const RecipeImport = ({ onClose, onImportSuccess }) => {
  const [activeTab, setActiveTab] = useState('url'); // 'url' vagy 'pdf'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importedRecipe, setImportedRecipe] = useState(null);
  
  // URL import state
  const [url, setUrl] = useState('');
  
  // PDF import state
  const [selectedFile, setSelectedFile] = useState(null);

  const handleUrlImport = async () => {
    if (!url.trim()) {
      setError('Kérlek adj meg egy URL-t');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://192.168.0.19:3001'}/api/v1/recipe-import/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'X-Current-Household': getCurrentHouseholdId()
        },
        body: JSON.stringify({ url: url.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Hiba az URL importálásakor');
      }

      const result = await response.json();
      setImportedRecipe(result.data);
      
    } catch (error) {
      console.error('URL import error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfImport = async () => {
    if (!selectedFile) {
      setError('Kérlek válassz ki egy PDF fájlt');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('pdf', selectedFile);

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://192.168.0.19:3001'}/api/v1/recipe-import/pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'X-Current-Household': getCurrentHouseholdId()
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Hiba a PDF importálásakor');
      }

      const result = await response.json();
      setImportedRecipe(result.data);
      
    } catch (error) {
      console.error('PDF import error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!importedRecipe) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://192.168.0.19:3001'}/api/v1/recipe-import/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'X-Current-Household': getCurrentHouseholdId()
        },
        body: JSON.stringify(importedRecipe)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Hiba a recept mentésekor');
      }

      const result = await response.json();
      
      if (onImportSuccess) {
        onImportSuccess(result.data);
      }
      
      onClose();
      
    } catch (error) {
      console.error('Save recipe error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Csak PDF fájlok engedélyezettek');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('A fájl túl nagy. Maximum 10MB engedélyezett');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const getCurrentHouseholdId = () => {
    try {
      const currentHousehold = localStorage.getItem('currentHousehold');
      return currentHousehold ? JSON.parse(currentHousehold).id : null;
    } catch (error) {
      return null;
    }
  };

  const resetImport = () => {
    setImportedRecipe(null);
    setUrl('');
    setSelectedFile(null);
    setError(null);
  };

  return (
    <div className="recipe-import-overlay" onClick={onClose}>
      <div className="recipe-import-modal" onClick={e => e.stopPropagation()}>
        <div className="import-header">
          <h2>📝 Recept importálása</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        {!importedRecipe ? (
          <div className="import-content">
            {/* Tab selector */}
            <div className="import-tabs">
              <button 
                className={`tab-button ${activeTab === 'url' ? 'active' : ''}`}
                onClick={() => setActiveTab('url')}
              >
                🌐 URL-ből
              </button>
              <button 
                className={`tab-button ${activeTab === 'pdf' ? 'active' : ''}`}
                onClick={() => setActiveTab('pdf')}
              >
                📄 PDF-ből
              </button>
            </div>

            {error && (
              <div className="import-error">
                ⚠️ {error}
              </div>
            )}

            {/* URL import */}
            {activeTab === 'url' && (
              <div className="import-section">
                <h3>🌐 Importálás URL-ből</h3>
                <p>Add meg a recept URL-jét egy receptes weboldalról:</p>
                
                <div className="url-input-container">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/recept"
                    className="url-input"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleUrlImport}
                    disabled={isLoading || !url.trim()}
                    className="import-button"
                  >
                    {isLoading ? '⏳ Importálás...' : '📥 Importálás'}
                  </button>
                </div>

                <div className="import-tips">
                  <h4>💡 Tippek:</h4>
                  <ul>
                    <li>Népszerű receptes oldalak: nosalty.hu, mindmegette.hu, stb.</li>
                    <li>Az oldal tartalmazzon strukturált recept adatokat</li>
                    <li>Néhány oldal nem támogatott a CORS policy miatt</li>
                  </ul>
                </div>
              </div>
            )}

            {/* PDF import */}
            {activeTab === 'pdf' && (
              <div className="import-section">
                <h3>📄 Importálás PDF-ből</h3>
                <p>Tölts fel egy PDF fájlt ami tartalmaz recept adatokat:</p>
                
                <div className="pdf-upload-container">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="pdf-input"
                    id="pdf-input"
                    disabled={isLoading}
                  />
                  <label htmlFor="pdf-input" className="pdf-upload-label">
                    {selectedFile ? (
                      <span>📄 {selectedFile.name}</span>
                    ) : (
                      <span>📁 PDF fájl kiválasztása</span>
                    )}
                  </label>
                  
                  {selectedFile && (
                    <button
                      onClick={handlePdfImport}
                      disabled={isLoading}
                      className="import-button"
                    >
                      {isLoading ? '⏳ Importálás...' : '📥 Importálás'}
                    </button>
                  )}
                </div>

                <div className="import-tips">
                  <h4>💡 Tippek:</h4>
                  <ul>
                    <li>A PDF tartalmazzon olvasható szöveget (nem csak képeket)</li>
                    <li>Strukturált formátum: cím, hozzávalók, elkészítés</li>
                    <li>Maximum 10MB fájlméret</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Importált recept előnézet */
          <div className="imported-recipe-preview">
            <h3>✅ Recept sikeresen importálva!</h3>
            
            <div className="recipe-preview">
              <h4>{importedRecipe.title}</h4>
              
              {importedRecipe.description && (
                <p className="recipe-description">{importedRecipe.description}</p>
              )}

              <div className="recipe-details">
                {importedRecipe.cookingTime && (
                  <span className="detail">⏱️ {importedRecipe.cookingTime} perc</span>
                )}
                {importedRecipe.servings && (
                  <span className="detail">👥 {importedRecipe.servings} adag</span>
                )}
                <span className="detail">📊 {importedRecipe.difficulty}</span>
              </div>

              {importedRecipe.ingredients && importedRecipe.ingredients.length > 0 && (
                <div className="preview-section">
                  <h5>🥘 Hozzávalók ({importedRecipe.ingredients.length})</h5>
                  <ul className="ingredients-preview">
                    {importedRecipe.ingredients.slice(0, 3).map((ingredient, index) => (
                      <li key={index}>{ingredient}</li>
                    ))}
                    {importedRecipe.ingredients.length > 3 && (
                      <li>... és még {importedRecipe.ingredients.length - 3} hozzávaló</li>
                    )}
                  </ul>
                </div>
              )}

              {importedRecipe.instructions && importedRecipe.instructions.length > 0 && (
                <div className="preview-section">
                  <h5>👩‍🍳 Elkészítés ({importedRecipe.instructions.length} lépés)</h5>
                  <ol className="instructions-preview">
                    {importedRecipe.instructions.slice(0, 2).map((instruction, index) => (
                      <li key={index}>{instruction}</li>
                    ))}
                    {importedRecipe.instructions.length > 2 && (
                      <li>... és még {importedRecipe.instructions.length - 2} lépés</li>
                    )}
                  </ol>
                </div>
              )}
            </div>

            <div className="preview-actions">
              <button
                onClick={handleSaveRecipe}
                disabled={isLoading}
                className="save-recipe-button"
              >
                {isLoading ? '⏳ Mentés...' : '💾 Recept mentése'}
              </button>
              <button
                onClick={resetImport}
                disabled={isLoading}
                className="reset-button"
              >
                🔄 Új importálás
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeImport;
