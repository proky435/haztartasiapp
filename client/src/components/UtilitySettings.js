import React, { useState, useEffect } from 'react';
import './UtilitySettings.css';
import utilitiesService from '../services/utilitiesService';
import LoadingSpinner from './LoadingSpinner';

const UtilitySettings = ({ currentHousehold }) => {
  // State kezelés
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUtility, setEditingUtility] = useState(null);
  const [showCalculator, setShowCalculator] = useState(null);
  const [calculatorConsumption, setCalculatorConsumption] = useState('');
  const [calculatorResult, setCalculatorResult] = useState(null);

  // Form adatok
  const [formData, setFormData] = useState({
    base_fee: '',
    current_unit_price: '',
    common_cost: '',
    provider_name: '',
    customer_number: '',
    meter_number: '',
    auto_calculate_cost: true,
    is_enabled: true
  });

  // Komponens inicializálása
  useEffect(() => {
    if (currentHousehold) {
      loadSettings();
    }
  }, [currentHousehold]);

  // Beállítások betöltése
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await utilitiesService.getUtilitySettings(currentHousehold.id);
      setSettings(data);
      
    } catch (err) {
      console.error('Error loading utility settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Form kezelés
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      base_fee: '',
      current_unit_price: '',
      common_cost: '',
      provider_name: '',
      customer_number: '',
      meter_number: '',
      auto_calculate_cost: true,
      is_enabled: true
    });
  };

  // Szerkesztés indítása
  const handleEditUtility = (setting) => {
    setEditingUtility(setting);
    setFormData({
      base_fee: setting.base_fee?.toString() || '',
      current_unit_price: setting.current_unit_price?.toString() || '',
      common_cost: setting.common_cost?.toString() || '',
      provider_name: setting.provider_name || '',
      customer_number: setting.customer_number || '',
      meter_number: setting.meter_number || '',
      auto_calculate_cost: setting.auto_calculate_cost ?? true,
      is_enabled: setting.is_enabled ?? true
    });
  };

  // Beállítások mentése
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const settingsData = {
        utility_type_id: editingUtility.utility_type_id,
        base_fee: formData.base_fee ? parseFloat(formData.base_fee) : 0,
        current_unit_price: formData.current_unit_price ? parseFloat(formData.current_unit_price) : null,
        common_cost: formData.common_cost ? parseFloat(formData.common_cost) : 0,
        provider_name: formData.provider_name || null,
        customer_number: formData.customer_number || null,
        meter_number: formData.meter_number || null,
        auto_calculate_cost: formData.auto_calculate_cost,
        is_enabled: formData.is_enabled
      };

      if (editingUtility.id) {
        // Frissítés
        await utilitiesService.updateUtilitySettings(
          currentHousehold.id, 
          editingUtility.utility_type_id, 
          settingsData
        );
      } else {
        // Új létrehozása
        await utilitiesService.saveUtilitySettings(currentHousehold.id, settingsData);
      }
      
      setEditingUtility(null);
      resetForm();
      await loadSettings();
      
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Kalkulátor használata
  const handleCalculate = async (utilityTypeId) => {
    if (!calculatorConsumption || calculatorConsumption <= 0) {
      setError('Kérjük, adjon meg egy érvényes fogyasztási értéket');
      return;
    }

    try {
      const result = await utilitiesService.calculateUtilityCost(
        currentHousehold.id,
        utilityTypeId,
        parseFloat(calculatorConsumption)
      );
      setCalculatorResult(result);
    } catch (err) {
      console.error('Error calculating cost:', err);
      setError(err.message);
    }
  };

  // Modal bezárása
  const handleCloseModal = () => {
    setEditingUtility(null);
    setShowCalculator(null);
    setCalculatorResult(null);
    setCalculatorConsumption('');
    resetForm();
  };

  if (loading && settings.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="utility-settings-container">
      {/* Header */}
      <div className="settings-header">
        <div className="header-left">
          <h2>⚙️ Közműbeállítások</h2>
          <p>Háztartás: {currentHousehold?.name}</p>
          <p className="subtitle">Árbeállítások és költségszámítás kezelése</p>
        </div>
      </div>

      {/* Hiba megjelenítése */}
      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Beállítások listája */}
      <div className="settings-grid">
        {settings.map(setting => (
          <div key={setting.utility_type_id} className={`setting-card ${!setting.is_enabled ? 'disabled' : ''}`}>
            <div className="setting-header">
              <div className="utility-info">
                <span className="utility-icon" style={{color: setting.color}}>
                  {setting.icon}
                </span>
                <div>
                  <h3>{setting.display_name}</h3>
                  <span className="utility-unit">Mértékegység: {setting.unit}</span>
                </div>
              </div>
              <div className="setting-status">
                {setting.is_enabled ? (
                  <span className="status-enabled">✅ Aktív</span>
                ) : (
                  <span className="status-disabled">❌ Letiltva</span>
                )}
              </div>
            </div>

            <div className="setting-details">
              <div className="price-info">
                <div className="price-item">
                  <span className="price-label">Alapdíj:</span>
                  <span className="price-value">
                    {utilitiesService.formatCost(setting.base_fee || 0)}/hó
                  </span>
                </div>
                <div className="price-item">
                  <span className="price-label">Egységár:</span>
                  <span className="price-value">
                    {setting.current_unit_price ? 
                      `${setting.current_unit_price} Ft/${setting.unit}` : 
                      'Nincs beállítva'
                    }
                  </span>
                </div>
                <div className="price-item">
                  <span className="price-label">Közös költség:</span>
                  <span className="price-value">
                    {utilitiesService.formatCost(setting.common_cost || 0)}/hó
                  </span>
                </div>
              </div>

              {setting.provider_name && (
                <div className="provider-info">
                  <span className="provider-label">Szolgáltató:</span>
                  <span className="provider-name">{setting.provider_name}</span>
                </div>
              )}

              <div className="cost-formula">
                <strong>Képlet:</strong> 
                {setting.base_fee || 0} + ({setting.current_unit_price || 0} × fogyasztás) + {setting.common_cost || 0} Ft
              </div>
            </div>

            <div className="setting-actions">
              <button 
                className="edit-btn"
                onClick={() => handleEditUtility(setting)}
              >
                ✏️ Szerkesztés
              </button>
              <button 
                className="calculator-btn"
                onClick={() => setShowCalculator(setting)}
              >
                🧮 Kalkulátor
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Szerkesztés modal */}
      {editingUtility && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                {editingUtility.icon} {editingUtility.display_name} - Beállítások
              </h3>
              <button className="close-btn" onClick={handleCloseModal}>✕</button>
            </div>
            
            <form onSubmit={handleSaveSettings}>
              <div className="form-sections">
                {/* Árbeállítások */}
                <div className="form-section">
                  <h4>💰 Árbeállítások</h4>
                  
                  <div className="form-group">
                    <label>Alapdíj (Ft/hó)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={formData.base_fee}
                      onChange={(e) => handleFormChange('base_fee', e.target.value)}
                      placeholder="pl. 2500"
                    />
                    <small>Havi fix költség, függetlenül a fogyasztástól</small>
                  </div>

                  <div className="form-group">
                    <label>Egységár (Ft/{editingUtility.unit})</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={formData.current_unit_price}
                      onChange={(e) => handleFormChange('current_unit_price', e.target.value)}
                      placeholder="pl. 70"
                    />
                    <small>Ár egy egység fogyasztásért</small>
                  </div>

                  <div className="form-group">
                    <label>Közös költség (Ft/hó)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={formData.common_cost}
                      onChange={(e) => handleFormChange('common_cost', e.target.value)}
                      placeholder="pl. 800"
                    />
                    <small>Társasházi közös fogyasztás, karbantartás</small>
                  </div>
                </div>

                {/* Szolgáltató adatok */}
                <div className="form-section">
                  <h4>🏢 Szolgáltató adatok</h4>
                  
                  <div className="form-group">
                    <label>Szolgáltató neve</label>
                    <input 
                      type="text"
                      value={formData.provider_name}
                      onChange={(e) => handleFormChange('provider_name', e.target.value)}
                      placeholder="pl. E.ON Energiaszolgáltató"
                    />
                  </div>

                  <div className="form-group">
                    <label>Ügyfélszám</label>
                    <input 
                      type="text"
                      value={formData.customer_number}
                      onChange={(e) => handleFormChange('customer_number', e.target.value)}
                      placeholder="pl. 1234567890"
                    />
                  </div>

                  <div className="form-group">
                    <label>Mérőóra száma</label>
                    <input 
                      type="text"
                      value={formData.meter_number}
                      onChange={(e) => handleFormChange('meter_number', e.target.value)}
                      placeholder="pl. M123456"
                    />
                  </div>
                </div>

                {/* Egyéb beállítások */}
                <div className="form-section">
                  <h4>🔧 Egyéb beállítások</h4>
                  
                  <div className="form-group checkbox-group">
                    <label>
                      <input 
                        type="checkbox"
                        checked={formData.auto_calculate_cost}
                        onChange={(e) => handleFormChange('auto_calculate_cost', e.target.checked)}
                      />
                      Automatikus költségszámítás
                    </label>
                    <small>Ha be van kapcsolva, a rendszer automatikusan számítja a költségeket</small>
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input 
                        type="checkbox"
                        checked={formData.is_enabled}
                        onChange={(e) => handleFormChange('is_enabled', e.target.checked)}
                      />
                      Közmű engedélyezve
                    </label>
                    <small>Letiltott közművek nem jelennek meg a fogyasztás rögzítésénél</small>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={handleCloseModal}>
                  Mégse
                </button>
                <button type="submit" className="primary">
                  Mentés
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kalkulátor modal */}
      {showCalculator && (
        <div className="modal-overlay">
          <div className="modal-content calculator-modal">
            <div className="modal-header">
              <h3>
                🧮 {showCalculator.icon} {showCalculator.display_name} - Költségkalkulátor
              </h3>
              <button className="close-btn" onClick={handleCloseModal}>✕</button>
            </div>
            
            <div className="calculator-content">
              <div className="calculator-input">
                <label>Fogyasztás ({showCalculator.unit})</label>
                <input 
                  type="number"
                  step="0.001"
                  value={calculatorConsumption}
                  onChange={(e) => setCalculatorConsumption(e.target.value)}
                  placeholder={`pl. 100 ${showCalculator.unit}`}
                />
                <button 
                  className="calculate-btn"
                  onClick={() => handleCalculate(showCalculator.utility_type_id)}
                  disabled={!calculatorConsumption}
                >
                  Számítás
                </button>
              </div>

              {calculatorResult && (
                <div className="calculator-result">
                  <h4>💰 Számított költség:</h4>
                  <div className="cost-breakdown">
                    <div className="cost-item">
                      <span>Alapdíj:</span>
                      <span>{utilitiesService.formatCost(calculatorResult.calculation.base_fee)}</span>
                    </div>
                    <div className="cost-item">
                      <span>Fogyasztás ({calculatorResult.consumption} {calculatorResult.unit}):</span>
                      <span>{utilitiesService.formatCost(calculatorResult.calculation.consumption_cost)}</span>
                    </div>
                    <div className="cost-item">
                      <span>Közös költség:</span>
                      <span>{utilitiesService.formatCost(calculatorResult.calculation.common_cost)}</span>
                    </div>
                    <div className="cost-total">
                      <span><strong>Összesen:</strong></span>
                      <span><strong>{utilitiesService.formatCost(calculatorResult.calculation.total_cost)}</strong></span>
                    </div>
                  </div>
                  <div className="cost-formula">
                    <strong>Képlet:</strong> {calculatorResult.formula}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilitySettings;
