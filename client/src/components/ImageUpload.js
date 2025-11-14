import React, { useState, useRef } from 'react';
import './ImageUpload.css';

const ImageUpload = ({ onImageUpload, onImageRemove, currentImage, disabled = false }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImage || null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Támogatott fájltípusok
  const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const validateFile = (file) => {
    if (!file) return 'Nincs fájl kiválasztva';
    
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return 'Csak JPEG, PNG, WebP és GIF fájlok engedélyezettek';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return 'A fájl túl nagy. Maximum 5MB engedélyezett';
    }
    
    return null;
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Előnézet létrehozása
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(file);

      // Fájl feltöltése
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://192.168.0.19:3001'}/api/v1/upload/recipe-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'X-Current-Household': getCurrentHouseholdId()
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Hiba a kép feltöltésekor');
      }

      const result = await response.json();
      
      // Callback hívása a szülő komponensnek
      if (onImageUpload) {
        onImageUpload({
          imageUrl: result.data.imageUrl,
          imageFilename: result.data.filename,
          originalName: result.data.originalName
        });
      }

    } catch (error) {
      console.error('Image upload error:', error);
      setError(error.message);
      setPreviewUrl(currentImage); // Visszaállítjuk az eredeti képet
    } finally {
      setIsUploading(false);
      // Input mező resetelése
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!currentImage) return;

    try {
      setIsUploading(true);
      
      // Ha van filename, töröljük a szerverről
      if (onImageRemove) {
        await onImageRemove();
      }
      
      setPreviewUrl(null);
      
    } catch (error) {
      console.error('Image remove error:', error);
      setError('Hiba a kép törlésekor: ' + error.message);
    } finally {
      setIsUploading(false);
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

  return (
    <div className="image-upload-container">
      <label className="image-upload-label">
        📸 Recept kép (opcionális)
      </label>
      
      <div className="image-upload-area">
        {previewUrl ? (
          <div className="image-preview">
            <img 
              src={previewUrl} 
              alt="Recept előnézet" 
              className="preview-image"
            />
            <div className="image-overlay">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="change-image-button"
                disabled={disabled || isUploading}
              >
                📷 Csere
              </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="remove-image-button"
                disabled={disabled || isUploading}
              >
                🗑️ Törlés
              </button>
            </div>
          </div>
        ) : (
          <div 
            className="upload-placeholder"
            onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="upload-loading">
                <div className="loading-spinner"></div>
                <span>Feltöltés...</span>
              </div>
            ) : (
              <>
                <div className="upload-icon">📷</div>
                <div className="upload-text">
                  <strong>Kattints a kép feltöltéséhez</strong>
                  <br />
                  <small>JPEG, PNG, WebP, GIF • Max 5MB</small>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="file-input"
        disabled={disabled || isUploading}
      />

      {error && (
        <div className="upload-error">
          ⚠️ {error}
        </div>
      )}

      <div className="upload-info">
        <small>
          💡 Tipp: Jó minőségű, jól megvilágított képeket használj a legjobb eredményért
        </small>
      </div>
    </div>
  );
};

export default ImageUpload;
