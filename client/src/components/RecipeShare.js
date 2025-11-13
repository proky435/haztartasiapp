import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import './RecipeShare.css';

const RecipeShare = ({ recipe, onClose }) => {
  const [shareData, setShareData] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (recipe) {
      checkShareStatus();
    }
  }, [recipe]);

  const checkShareStatus = async () => {
    try {
      setIsLoading(true);
      
      // Ha már van share_id, akkor már megosztott
      if (recipe.share_id && recipe.is_public) {
        const shareUrl = `${window.location.origin}/shared-recipe/${recipe.share_id}`;
        setShareData({
          shareId: recipe.share_id,
          shareUrl: shareUrl,
          isPublic: true
        });
        generateQRCode(shareUrl);
      }
    } catch (error) {
      console.error('Share status check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCode = async (url) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('QR code generation error:', error);
    }
  };

  const enableSharing = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/shared-recipes/${recipe.id}/share`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'X-Current-Household': getCurrentHouseholdId()
        },
        body: JSON.stringify({ isPublic: true })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Hiba a megosztás engedélyezésekor');
      }

      const result = await response.json();
      setShareData(result.data);
      
      if (result.data.shareUrl) {
        generateQRCode(result.data.shareUrl);
      }

    } catch (error) {
      console.error('Enable sharing error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const disableSharing = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/shared-recipes/${recipe.id}/share`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'X-Current-Household': getCurrentHouseholdId()
        },
        body: JSON.stringify({ isPublic: false })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Hiba a megosztás letiltásakor');
      }

      setShareData(null);
      setQrCodeUrl('');

    } catch (error) {
      console.error('Disable sharing error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy to clipboard error:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `${recipe.title}-qr-code.png`;
      link.href = qrCodeUrl;
      link.click();
    }
  };

  if (!recipe) return null;

  return (
    <div className="recipe-share-overlay" onClick={onClose}>
      <div className="recipe-share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-header">
          <h2>🔗 Recept megosztása</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="share-content">
          <div className="recipe-info">
            <h3>{recipe.title}</h3>
            <p>Készítette: {recipe.created_by_name}</p>
          </div>

          {error && (
            <div className="share-error">
              ⚠️ {error}
            </div>
          )}

          {!shareData ? (
            <div className="share-disabled">
              <div className="share-icon">🔒</div>
              <h4>A recept jelenleg privát</h4>
              <p>Engedélyezd a megosztást, hogy mások is hozzáférhessenek a recepthez egy link vagy QR kód segítségével.</p>
              
              <button 
                onClick={enableSharing}
                disabled={isLoading}
                className="enable-share-button"
              >
                {isLoading ? '⏳ Engedélyezés...' : '🌐 Megosztás engedélyezése'}
              </button>
            </div>
          ) : (
            <div className="share-enabled">
              <div className="share-icon">🌐</div>
              <h4>A recept publikusan elérhető</h4>
              
              <div className="share-methods">
                {/* Link megosztás */}
                <div className="share-method">
                  <label>📎 Megosztási link:</label>
                  <div className="link-container">
                    <input 
                      type="text" 
                      value={shareData.shareUrl} 
                      readOnly 
                      className="share-link-input"
                    />
                    <button 
                      onClick={() => copyToClipboard(shareData.shareUrl)}
                      className="copy-button"
                    >
                      {copied ? '✅' : '📋'}
                    </button>
                  </div>
                </div>

                {/* QR kód */}
                {qrCodeUrl && (
                  <div className="share-method">
                    <label>📱 QR kód:</label>
                    <div className="qr-container">
                      <img src={qrCodeUrl} alt="QR kód" className="qr-code" />
                      <button 
                        onClick={downloadQRCode}
                        className="download-qr-button"
                      >
                        💾 QR kód letöltése
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="share-actions">
                <button 
                  onClick={disableSharing}
                  disabled={isLoading}
                  className="disable-share-button"
                >
                  {isLoading ? '⏳ Letiltás...' : '🔒 Megosztás letiltása'}
                </button>
              </div>
            </div>
          )}

          <div className="share-info">
            <h4>ℹ️ Tudnivalók a megosztásról:</h4>
            <ul>
              <li>A megosztott recept bárki számára elérhető lesz a link vagy QR kód segítségével</li>
              <li>A látogatók nem tudják módosítani a receptet</li>
              <li>Bármikor letilthatod a megosztást</li>
              <li>A megtekintések száma nyomon követhető</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeShare;
