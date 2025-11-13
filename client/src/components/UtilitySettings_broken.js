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
  const [householdCosts, setHouseholdCosts] = useState({
    common_utility_cost: 0,
    maintenance_cost: 0,
    other_monthly_costs: 0,
    rent_amount: 0,
    garage_rent: 0,
    insurance_cost: 0
  });
  const [editingHouseholdCosts, setEditingHouseholdCosts] = useState(false);
  const [pricingTiers, setPricingTiers] = useState({});
  const [showPricingModal, setShowPricingModal] = useState(null);
  const [showPricingEditor, setShowPricingEditor] = useState(null);
  const [editingTiers, setEditingTiers] = useState([]);
  const [newTier, setNewTier] = useState({
    tier_name: '',
    price_per_unit: '',
    limit_value: '',
    system_usage_fee: '',
    conversion_factor: '',
    conversion_unit: ''
  });
  const [formData, setFormData] = useState({
    base_fee: '',
    current_unit_price: '',
    provider_name: '',
    customer_number: '',
    meter_number: '',
    auto_calculate_cost: true,
    is_enabled: true
  });

  // Komponens inicializálása
  useEffect(() => {
    if (currentHousehold?.id) {
      loadSettings();
      loadHouseholdCosts();
    }
  }, [currentHousehold]);

  // Háztartási költségek betöltése
  const loadHouseholdCosts = async () => {
    try {
      const response = await utilitiesService.getHouseholdCosts(currentHousehold.id);
      const data = response?.data || response || {};
      setHouseholdCosts({
        common_utility_cost: data.common_utility_cost || 0,
        maintenance_cost: data.maintenance_cost || 0,
        other_monthly_costs: data.other_monthly_costs || 0,
        rent_amount: data.rent_amount || 0,
        garage_rent: data.garage_rent || 0,
        insurance_cost: data.insurance_cost || 0
      });
    } catch (err) {
      console.error('Error loading household costs:', err);
      // Alapértelmezett értékek beállítása hiba esetén
      setHouseholdCosts({
        common_utility_cost: 0,
        maintenance_cost: 0,
        other_monthly_costs: 0,
        rent_amount: 0,
        garage_rent: 0,
        insurance_cost: 0
      });
    }
  };

  // Háztartási költségek mentése
  const handleSaveHouseholdCosts = async () => {
    try {
      setLoading(true);
      setError(null);

      await utilitiesService.updateHouseholdCosts(currentHousehold.id, householdCosts);
      setEditingHouseholdCosts(false);
      
      // Sikeres mentés jelzése
      setError({ type: 'success', message: 'Háztartási közös költségek sikeresen mentve!' });
      setTimeout(() => setError(null), 3000);

    } catch (err) {
      console.error('Error saving household costs:', err);
      setError({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Közmű szerkesztése
  const handleEditUtility = (setting) => {
    setEditingUtility(setting);
    setFormData({
      base_fee: setting.base_fee || 0,
      unit_price: setting.current_unit_price || 0,
      provider_name: setting.provider_name || '',
      is_enabled: setting.is_enabled || false
    });
  };

  // Modal bezárása
  const handleCloseModal = () => {
    setEditingUtility(null);
    setShowPricingModal(null);
    setShowPricingEditor(null);
    setShowCalculator(null);
    setFormData({});
  };

  // Beállítások mentése
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      await utilitiesService.updateUtilitySettings(
        currentHousehold.id,
        editingUtility.utility_type_id,
        formData
      );

      setError({ type: 'success', message: 'Beállítások sikeresen mentve!' });
      setTimeout(() => setError(null), 3000);
      
      handleCloseModal();
      await loadSettings();
      
    } catch (err) {
      console.error('Error saving settings:', err);
      setError({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Form változás kezelése
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'is_enabled' ? value : (parseFloat(value) || value)
    }));
  };

  // Beállítások betöltése
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await utilitiesService.getUtilitySettings(currentHousehold.id);
      // A backend most success/data formátumban küldi a választ
      const data = response.data || response;
      setSettings(data);
      
    } catch (err) {
      console.error('Error loading utility settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      base_fee: '',
      current_unit_price: '',
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
      {/* Header - mindig megjelenítjük */}
      <div className="settings-header">
        <div className="header-left">
          <h2>⚙️ Közműbeállítások</h2>
          <p>Háztartás: {currentHousehold?.name}</p>
          <p className="subtitle">Árbeállítások és költségszámítás kezelése</p>
        </div>
      </div>

      {/* Hiba megjelenítése */}
      {error && (
        <div className={`error-message ${error.type === 'success' ? 'success-message' : ''}`}>
          <span>
            {error.type === 'success' ? '✅' : '⚠️'} 
            {typeof error === 'string' ? error : error.message}
          </span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Háztartási közös költségek */}
      <div className="household-costs-section">
        <div className="section-header">
          <h3>🏠 Háztartási közös költségek</h3>
          <button 
            className="edit-household-costs-btn"
            onClick={editingHouseholdCosts ? handleSaveHouseholdCosts : () => setEditingHouseholdCosts(true)}
            disabled={loading}
          >
            {editingHouseholdCosts ? '💾 Mentés' : '✏️ Szerkesztés'}
          </button>
        </div>
        
        <div className="household-costs-grid">
          <div className="cost-item">
            <label>Közös közműköltség (Ft/hó)</label>
            {editingHouseholdCosts ? (
              <input 
                type="number"
                step="0.01"
                value={householdCosts.common_utility_cost}
                onChange={(e) => setHouseholdCosts(prev => ({
                  ...prev,
                  common_utility_cost: parseFloat(e.target.value) || 0
                }))}
                placeholder="pl. 5000"
              />
            ) : (
              <span className="cost-display">
                {utilitiesService.formatCost(householdCosts.common_utility_cost)}/hó
              </span>
            )}
            <small>Társasházi közös fogyasztás</small>
          </div>
          
          <div className="cost-item">
            <label>Karbantartási költség (Ft/hó)</label>
            {editingHouseholdCosts ? (
              <input 
                type="number"
                step="0.01"
                value={householdCosts.maintenance_cost}
                onChange={(e) => setHouseholdCosts(prev => ({
                  ...prev,
                  maintenance_cost: parseFloat(e.target.value) || 0
                }))}
                placeholder="pl. 2000"
              />
            ) : (
              <span className="cost-display">
                {utilitiesService.formatCost(householdCosts.maintenance_cost)}/hó
              </span>
            )}
            <small>Lift, takarítás, karbantartás</small>
          </div>
          
          <div className="cost-item">
            <label>Egyéb havi költségek (Ft/hó)</label>
            {editingHouseholdCosts ? (
              <input 
                type="number"
                step="0.01"
                value={householdCosts.other_monthly_costs}
                onChange={(e) => setHouseholdCosts(prev => ({
                  ...prev,
                  other_monthly_costs: parseFloat(e.target.value) || 0
                }))}
                placeholder="pl. 1000"
              />
            ) : (
              <span className="cost-display">
                {utilitiesService.formatCost(householdCosts.other_monthly_costs)}/hó
              </span>
            )}
            <small>Biztosítás, egyéb fix költségek</small>
          </div>
        </div>
        
        <div className="total-household-costs">
          <strong>Összes havi közös költség: {utilitiesService.formatCost(
            householdCosts.common_utility_cost + 
            householdCosts.maintenance_cost + 
            householdCosts.other_monthly_costs
          )}</strong>
        </div>
      </div>

      {/* Lakbér beállítások */}
      <div className="household-costs-section">
        <div className="section-header">
          <h3>🏠 Lakbér beállítások</h3>
          <button 
            className="edit-household-costs-btn"
            onClick={editingHouseholdCosts ? handleSaveHouseholdCosts : () => setEditingHouseholdCosts(true)}
          >
            {editingHouseholdCosts ? '💾 Mentés' : '✏️ Szerkesztés'}
          </button>
        </div>
        
        <div className="cost-item">
          <label>Lakbér (Ft/hó)</label>
          {editingHouseholdCosts ? (
            <input 
              type="number"
              step="0.01"
              value={householdCosts.rent_amount}
              onChange={(e) => setHouseholdCosts(prev => ({
                ...prev,
                rent_amount: parseFloat(e.target.value) || 0
              }))}
              placeholder="pl. 150000"
            />
          ) : (
            <span className="cost-display">
              {utilitiesService.formatCost(householdCosts.rent_amount)}/hó
            </span>
          )}
          <small>Havi lakbér összege</small>
        </div>
        
        <div className="cost-item">
          <label>Garázs bérlet (Ft/hó)</label>
          {editingHouseholdCosts ? (
            <input 
              type="number"
              step="0.01"
              value={householdCosts.garage_rent}
              onChange={(e) => setHouseholdCosts(prev => ({
                ...prev,
                garage_rent: parseFloat(e.target.value) || 0
              }))}
              placeholder="pl. 15000"
            />
          ) : (
            <span className="cost-display">
              {utilitiesService.formatCost(householdCosts.garage_rent)}/hó
            </span>
          )}
          <small>Havi garázs bérleti díj</small>
        </div>
        
        <div className="cost-item">
          <label>Biztosítás (Ft/hó)</label>
          {editingHouseholdCosts ? (
            <input 
              type="number"
              step="0.01"
              value={householdCosts.insurance_cost}
              onChange={(e) => setHouseholdCosts(prev => ({
                ...prev,
                insurance_cost: parseFloat(e.target.value) || 0
              }))}
              placeholder="pl. 8000"
            />
          ) : (
            <span className="cost-display">
              {utilitiesService.formatCost(householdCosts.insurance_cost)}/hó
            </span>
          )}
          <small>Havi biztosítási díj</small>
        </div>
      </div>

      {/* Egyedi közműbeállítások */}
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
              </div>

              {setting.provider_name && (
                <div className="provider-info">
                  <span className="provider-label">Szolgáltató:</span>
                  <span className="provider-name">{setting.provider_name}</span>
                </div>
              )}

              <div className="cost-formula">
                <strong>Képlet:</strong> 
                {setting.base_fee || 0} + ({setting.current_unit_price || 0} × fogyasztás) Ft
              </div>
            </div>

            <div className="setting-actions">
              <button 
                className="pricing-btn"
                onClick={() => setShowPricingModal(setting)}
                title="Sávos árazás beállítása"
              >
                📊 Sávos árazás
              </button>
              <button 
                className="pricing-editor-btn"
                onClick={async () => {
                  try {
                    setLoading(true);
                    const pricingData = await utilitiesService.getPricingTiers(
                      currentHousehold.id, 
                      setting.utility_type_id
                    );
                    setEditingTiers(pricingData.pricing_tiers || []);
                    setShowPricingEditor(setting);
                  } catch (err) {
                    console.error('Error fetching pricing tiers:', err);
                    setError(err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                title="Sávos árazás szerkesztése"
              >
                ⚙️ Sávok szerkesztése
              </button>
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
                  <h4>💰 Számított költség - {calculatorResult.utility_display_name}:</h4>
                  
                  {/* Árazási mód jelzése */}
                  {calculatorResult.calculation.pricing_mode === 'simple' && (
                    <div className="pricing-mode-info">
                      ⚠️ <strong>Egyszerű árazás:</strong> Nincsenek beállított sávok, alapdíj + egységár számítás használva.
                    </div>
                  )}
                  
                  {/* Konverziós információ (gáznál) */}
                  {calculatorResult.calculation.conversion_info && (
                    <div className="conversion-info">
                      <strong>Konverzió:</strong> {calculatorResult.calculation.conversion_info.original_consumption} {calculatorResult.calculation.conversion_info.original_unit} = {calculatorResult.calculation.conversion_info.converted_consumption} {calculatorResult.calculation.conversion_info.converted_unit} (faktor: {calculatorResult.calculation.conversion_info.conversion_factor})
                    </div>
                  )}

                  <div className="cost-breakdown">
                    {/* Alapdíj */}
                    <div className="cost-item">
                      <span>Alapdíj:</span>
                      <span>{utilitiesService.formatCost(calculatorResult.calculation.base_fee || 0)}</span>
                    </div>

                    {/* Sávos költségek */}
                    {calculatorResult.calculation.breakdown && calculatorResult.calculation.breakdown.map((tier, index) => (
                      <div key={index} className="cost-item tier-cost">
                        <span>{tier.tier_name} ({tier.consumption} {tier.unit}):</span>
                        <span>{utilitiesService.formatCost(tier.tier_cost)}</span>
                        {tier.system_fee > 0 && (
                          <div className="system-fee">
                            <span>+ Rendszerhasználati díj:</span>
                            <span>{utilitiesService.formatCost(tier.system_fee)}</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Fogyasztási költség összesen */}
                    <div className="cost-item">
                      <span>Fogyasztási költség:</span>
                      <span>{utilitiesService.formatCost(calculatorResult.calculation.consumption_cost || 0)}</span>
                    </div>

                    {/* Rendszerhasználati díj összesen */}
                    {calculatorResult.calculation.system_usage_fee > 0 && (
                      <div className="cost-item">
                        <span>Rendszerhasználati díj összesen:</span>
                        <span>{utilitiesService.formatCost(calculatorResult.calculation.system_usage_fee)}</span>
                      </div>
                    )}

                    {/* Végösszeg */}
                    <div className="cost-total">
                      <span><strong>Összesen:</strong></span>
                      <span><strong>{utilitiesService.formatCost(calculatorResult.total_cost)}</strong></span>
                    </div>
                  </div>

                  <div className="cost-formula">
                    <strong>Képlet:</strong> {calculatorResult.calculation.formula_description}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sávos árazás modal */}
      {showPricingModal && (
        <div className="modal-overlay">
          <div className="modal-content pricing-modal">
            <div className="modal-header">
              <h3>
                📊 {showPricingModal.icon} {showPricingModal.display_name} - Sávos árazás
              </h3>
              <button className="close-btn" onClick={() => setShowPricingModal(null)}>✕</button>
            </div>
            
            <div className="pricing-content">
              <div className="pricing-info">
                <p><strong>Magyar rezsicsökkentett árazás:</strong></p>
                <p>A villany és gáz esetében sávos árazás érvényes. Az első sáv kedvezményes, a második piaci áron.</p>
              </div>

              <div className="pricing-example">
                <h4>Példa - {showPricingModal.display_name}:</h4>
                {showPricingModal.utility_name === 'electricity' && (
                  <div className="tier-example">
                    <div className="tier">
                      <strong>1. sáv (Rezsicsökkentett):</strong> 0-210.25 kWh → 36 Ft/kWh
                    </div>
                    <div className="tier">
                      <strong>2. sáv (Piaci ár):</strong> 210.25+ kWh → 70 Ft/kWh
                    </div>
                    <div className="tier">
                      <strong>Rendszerhasználati díj:</strong> 8.5 Ft/kWh
                    </div>
                  </div>
                )}
                {showPricingModal.utility_name === 'gas' && (
                  <div className="tier-example">
                    <div className="tier">
                      <strong>1. sáv (Rezsicsökkentett):</strong> 0-5303 MJ → 2.8 Ft/MJ
                    </div>
                    <div className="tier">
                      <strong>2. sáv (Piaci ár):</strong> 5303+ MJ → 22 Ft/MJ
                    </div>
                    <div className="tier">
                      <strong>Konverzió:</strong> 1 m³ = 34.5 MJ
                    </div>
                    <div className="tier">
                      <strong>Rendszerhasználati díj:</strong> 5.2 Ft/MJ
                    </div>
                  </div>
                )}
                {showPricingModal.utility_name === 'water_cold' && (
                  <div className="tier-example">
                    <div className="tier">
                      <strong>Vízfogyasztás:</strong> 350 Ft/m³
                    </div>
                    <div className="tier">
                      <strong>Csatornahasználat:</strong> 280 Ft/m³
                    </div>
                  </div>
                )}
                {showPricingModal.utility_name === 'water_hot' && (
                  <div className="tier-example">
                    <div className="tier">
                      <strong>1. sáv (Rezsicsökkentett):</strong> 0-210.25 kWh → 36 Ft/kWh
                    </div>
                    <div className="tier">
                      <strong>2. sáv (Piaci ár):</strong> 210.25+ kWh → 70 Ft/kWh
                    </div>
                    <div className="tier">
                      <strong>Rendszerhasználati díj:</strong> 8.5 Ft/kWh
                    </div>
                  </div>
                )}
                {showPricingModal.utility_name === 'heating' && (
                  <div className="tier-example">
                    <div className="tier">
                      <strong>Hőenergia:</strong> 4500 Ft/GJ
                    </div>
                  </div>
                )}
              </div>

              <div className="pricing-actions">
                <button 
                  className="reset-defaults-btn"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await utilitiesService.resetDefaultPricingTiers(
                        currentHousehold.id, 
                        showPricingModal.utility_type_id
                      );
                      setShowPricingModal(null);
                      // Frissítjük a beállításokat
                      await loadSettings();
                    } catch (err) {
                      console.error('Error resetting pricing tiers:', err);
                      setError(err.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  🔄 Alapértelmezett sávok visszaállítása
                </button>
                <button 
                  className="advanced-pricing-btn"
                  onClick={async () => {
                    try {
                      const pricingData = await utilitiesService.getPricingTiers(
                        currentHousehold.id, 
                        showPricingModal.utility_type_id
                      );
                      setEditingTiers(pricingData.pricing_tiers || []);
                      setShowPricingEditor(showPricingModal);
                      setShowPricingModal(null);
                    } catch (err) {
                      console.error('Error fetching pricing tiers:', err);
                      setError(err.message);
                    }
                  }}
                >
                  ⚙️ Részletes beállítások
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sávos árazás szerkesztő modal */}
      {showPricingEditor && (
        <div className="modal-overlay">
          <div className="modal-content pricing-editor-modal">
            <div className="modal-header">
              <h3>
                ⚙️ {showPricingEditor.icon} {showPricingEditor.display_name} - Sávos árazás szerkesztése
              </h3>
              <button className="close-btn" onClick={() => {
                setShowPricingEditor(null);
                setEditingTiers([]);
                setNewTier({
                  tier_name: '',
                  price_per_unit: '',
                  limit_value: '',
                  system_usage_fee: '',
                  conversion_factor: '',
                  conversion_unit: ''
                });
              }}>✕</button>
            </div>
            
            <div className="pricing-editor-content">
              {/* Meglévő sávok */}
              <div className="existing-tiers">
                <h4>📊 Meglévő árazási sávok:</h4>
                {editingTiers.length === 0 ? (
                  <p className="no-tiers">Nincsenek beállított árazási sávok.</p>
                ) : (
                  <div className="tiers-list">
                    {editingTiers.map((tier, index) => (
                      <div key={tier.id || index} className="tier-editor-card">
                        <div className="tier-header">
                          <span className="tier-number">{tier.tier_number}. sáv</span>
                          <button 
                            className="delete-tier-btn"
                            onClick={async () => {
                              try {
                                setLoading(true);
                                await utilitiesService.deletePricingTier(
                                  currentHousehold.id,
                                  showPricingEditor.utility_type_id,
                                  tier.tier_number
                                );
                                // Frissítjük a sávokat
                                const pricingData = await utilitiesService.getPricingTiers(
                                  currentHousehold.id, 
                                  showPricingEditor.utility_type_id
                                );
                                setEditingTiers(pricingData.pricing_tiers || []);
                              } catch (err) {
                                setError(err.message);
                              } finally {
                                setLoading(false);
                              }
                            }}
                            title="Sáv törlése"
                          >
                            🗑️
                          </button>
                        </div>
                        
                        <div className="tier-fields">
                          <div className="field-group">
                            <label>Sáv neve:</label>
                            <input
                              type="text"
                              value={tier.tier_name}
                              onChange={(e) => {
                                const newTiers = [...editingTiers];
                                newTiers[index].tier_name = e.target.value;
                                setEditingTiers(newTiers);
                              }}
                              placeholder="pl. Rezsicsökkentett"
                            />
                          </div>
                          
                          <div className="field-group">
                            <label>Egységár (Ft):</label>
                            <input
                              type="number"
                              step="0.01"
                              value={tier.price_per_unit}
                              onChange={(e) => {
                                const newTiers = [...editingTiers];
                                newTiers[index].price_per_unit = e.target.value;
                                setEditingTiers(newTiers);
                              }}
                              placeholder="pl. 36.0"
                            />
                          </div>
                          
                          <div className="field-group">
                            <label>Sávhatár:</label>
                            <input
                              type="number"
                              step="0.01"
                              value={tier.limit_value || ''}
                              onChange={(e) => {
                                const newTiers = [...editingTiers];
                                newTiers[index].limit_value = e.target.value;
                                setEditingTiers(newTiers);
                              }}
                              placeholder="pl. 210.25 (üres = nincs limit)"
                            />
                          </div>
                          
                          {(showPricingEditor.utility_name === 'electricity' || 
                            showPricingEditor.utility_name === 'gas' || 
                            showPricingEditor.utility_name === 'water_hot') && (
                            <div className="field-group">
                              <label>Rendszerhasználati díj (Ft):</label>
                              <input
                                type="number"
                                step="0.01"
                                value={tier.system_usage_fee || ''}
                                onChange={(e) => {
                                  const newTiers = [...editingTiers];
                                  newTiers[index].system_usage_fee = e.target.value;
                                  setEditingTiers(newTiers);
                                }}
                                placeholder="pl. 8.5"
                              />
                            </div>
                          )}
                          
                          {showPricingEditor.utility_name === 'gas' && (
                            <>
                              <div className="field-group">
                                <label>Konverziós faktor:</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={tier.conversion_factor || ''}
                                  onChange={(e) => {
                                    const newTiers = [...editingTiers];
                                    newTiers[index].conversion_factor = e.target.value;
                                    setEditingTiers(newTiers);
                                  }}
                                  placeholder="pl. 34.5"
                                />
                              </div>
                              <div className="field-group">
                                <label>Konverziós egység:</label>
                                <input
                                  type="text"
                                  value={tier.conversion_unit || ''}
                                  onChange={(e) => {
                                    const newTiers = [...editingTiers];
                                    newTiers[index].conversion_unit = e.target.value;
                                    setEditingTiers(newTiers);
                                  }}
                                  placeholder="pl. MJ/m3"
                                />
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div className="tier-actions">
                          <button 
                            className="save-tier-btn"
                            onClick={async () => {
                              try {
                                setLoading(true);
                                await utilitiesService.savePricingTier(
                                  currentHousehold.id,
                                  showPricingEditor.utility_type_id,
                                  {
                                    tier_number: tier.tier_number,
                                    tier_name: tier.tier_name,
                                    price_per_unit: parseFloat(tier.price_per_unit),
                                    limit_value: tier.limit_value ? parseFloat(tier.limit_value) : null,
                                    system_usage_fee: tier.system_usage_fee ? parseFloat(tier.system_usage_fee) : null,
                                    conversion_factor: tier.conversion_factor ? parseFloat(tier.conversion_factor) : null,
                                    conversion_unit: tier.conversion_unit || null
                                  }
                                );
                                // Sikeres mentés jelzése
                                console.log('Sáv sikeresen mentve');
                              } catch (err) {
                                setError(err.message);
                              } finally {
                                setLoading(false);
                              }
                            }}
                            disabled={loading}
                          >
                            💾 Mentés
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Új sáv hozzáadása */}
              <div className="add-new-tier">
                <h4>➕ Új sáv hozzáadása:</h4>
                <div className="new-tier-form">
                  <div className="field-group">
                    <label>Sáv neve:</label>
                    <input
                      type="text"
                      value={newTier.tier_name}
                      onChange={(e) => setNewTier({...newTier, tier_name: e.target.value})}
                      placeholder="pl. Új sáv"
                    />
                  </div>
                  
                  <div className="field-group">
                    <label>Egységár (Ft):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newTier.price_per_unit}
                      onChange={(e) => setNewTier({...newTier, price_per_unit: e.target.value})}
                      placeholder="pl. 50.0"
                    />
                  </div>
                  
                  <div className="field-group">
                    <label>Sávhatár:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newTier.limit_value}
                      onChange={(e) => setNewTier({...newTier, limit_value: e.target.value})}
                      placeholder="pl. 300 (üres = nincs limit)"
                    />
                  </div>
                  
                  {(showPricingEditor.utility_name === 'electricity' || 
                    showPricingEditor.utility_name === 'gas' || 
                    showPricingEditor.utility_name === 'water_hot') && (
                    <div className="field-group">
                      <label>Rendszerhasználati díj (Ft):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newTier.system_usage_fee}
                        onChange={(e) => setNewTier({...newTier, system_usage_fee: e.target.value})}
                        placeholder="pl. 8.5"
                      />
                    </div>
                  )}
                  
                  <div className="new-tier-actions">
                    <button 
                      className="add-tier-btn"
                      onClick={async () => {
                        try {
                          if (!newTier.tier_name || !newTier.price_per_unit) {
                            setError('A sáv neve és az egységár megadása kötelező');
                            return;
                          }
                          
                          setLoading(true);
                          const nextTierNumber = Math.max(...editingTiers.map(t => t.tier_number), 0) + 1;
                          
                          await utilitiesService.savePricingTier(
                            currentHousehold.id,
                            showPricingEditor.utility_type_id,
                            {
                              tier_number: nextTierNumber,
                              tier_name: newTier.tier_name,
                              price_per_unit: parseFloat(newTier.price_per_unit),
                              limit_value: newTier.limit_value ? parseFloat(newTier.limit_value) : null,
                              system_usage_fee: newTier.system_usage_fee ? parseFloat(newTier.system_usage_fee) : null,
                              conversion_factor: newTier.conversion_factor ? parseFloat(newTier.conversion_factor) : null,
                              conversion_unit: newTier.conversion_unit || null
                            }
                          );
                          
                          // Frissítjük a sávokat
                          const pricingData = await utilitiesService.getPricingTiers(
                            currentHousehold.id, 
                            showPricingEditor.utility_type_id
                          );
                          setEditingTiers(pricingData.pricing_tiers || []);
                          
                          // Űrlap törlése
                          setNewTier({
                            tier_name: '',
                            price_per_unit: '',
                            limit_value: '',
                            system_usage_fee: '',
                            conversion_factor: '',
                            conversion_unit: ''
                          });
                        } catch (err) {
                          setError(err.message);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading || !newTier.tier_name || !newTier.price_per_unit}
                    >
                      ➕ Sáv hozzáadása
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="pricing-editor-actions">
                <button 
                  className="close-editor-btn"
                  onClick={() => {
                    setShowPricingEditor(null);
                    setEditingTiers([]);
                    // Frissítjük a beállításokat
                    loadSettings();
                  }}
                >
                  ✅ Kész
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilitySettings;
