import React, { useState, useEffect } from 'react';
import utilitiesService from '../services/utilitiesService';
import './UtilitySettings.css';

const UtilitySettings = ({ 
  currentHousehold, 
  showPricingModal, 
  setShowPricingModal,
  editingUtility,
  setEditingUtility,
  showCalculator,
  setShowCalculator,
  onDataUpdate
}) => {
  // Debug üzenet eltávolítva - infinite loop javítva
  // console.log('🚨 KOMPONENS RENDER - currentHousehold:', currentHousehold?.id, 'Timestamp:', Date.now());
  
  // State változók
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // editingUtility és showCalculator most prop-ként jönnek a parent-től
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
  const [editingRentCosts, setEditingRentCosts] = useState(false);
  const [pricingTiers, setPricingTiers] = useState({});
  const [showPricingEditor, setShowPricingEditor] = useState(null);
  // showPricingModal most prop-ként jön a parent-től
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

  // useEffect-et a függvények deklarálása után helyezzük el

  // Háztartási költségek betöltése
  const loadHouseholdCosts = async () => {
    try {
      console.log('📥 Loading household costs for household:', currentHousehold.id);
      const response = await utilitiesService.getHouseholdCosts(currentHousehold.id);
      console.log('📥 Raw API response:', response);
      
      const data = response?.data || response || {};
      console.log('📥 Extracted data:', data);
      
      const newHouseholdCosts = {
        common_utility_cost: data.common_utility_cost || 0,
        maintenance_cost: data.maintenance_cost || 0,
        other_monthly_costs: data.other_monthly_costs || 0,
        rent_amount: data.rent_amount || 0,
        garage_rent: data.garage_rent || 0,
        insurance_cost: data.insurance_cost || 0
      };
      
      console.log('📥 Setting new household costs:', newHouseholdCosts);
      setHouseholdCosts(newHouseholdCosts);
      
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
      
      // Adatok újratöltése a mentés után
      console.log('🔄 Reloading household costs after household save...');
      await loadHouseholdCosts();
      
      // Parent komponens adatfrissítése
      if (onDataUpdate) {
        onDataUpdate();
      }
      
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

  // Lakbér költségek mentése
  const handleSaveRentCosts = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('💰 Saving rent costs:', householdCosts);
      await utilitiesService.updateHouseholdCosts(currentHousehold.id, householdCosts);
      
      // Adatok újratöltése a mentés után
      console.log('🔄 Reloading household costs after rent save...');
      await loadHouseholdCosts();
      
      // Parent komponens adatfrissítése
      if (onDataUpdate) {
        onDataUpdate();
      }
      
      setEditingRentCosts(false);
      
      // Sikeres mentés jelzése
      setError({ type: 'success', message: 'Lakbér beállítások sikeresen mentve!' });
      setTimeout(() => setError(null), 3000);

    } catch (err) {
      console.error('Error saving rent costs:', err);
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
      current_unit_price: setting.current_unit_price || 0,
      provider_name: setting.provider_name || '',
      is_enabled: setting.is_enabled || false
    });
  };

  // Képlet generálás közműtípus alapján
  const getUtilityFormula = (setting) => {
    const utilityType = setting.utility_type_name?.toLowerCase() || '';
    const baseFee = setting.base_fee || 0;
    const unitPrice = setting.current_unit_price || 0;
    const unit = setting.unit || '';

    // Közműtípus specifikus képletek
    switch (utilityType) {
      case 'villany':
      case 'elektromos áram':
        if (unitPrice > 0) {
          return `${baseFee} + (sávos árazás: 0-210 kWh: 36 Ft/kWh, 210+ kWh: 70 Ft/kWh) + rendszerhasználati díj`;
        }
        return `${baseFee} + (sávos árazás beállítása szükséges)`;

      case 'gáz':
      case 'földgáz':
        if (unitPrice > 0) {
          return `${baseFee} + (sávos árazás: 0-1729 m³: 102 Ft/m³, 1729+ m³: 747 Ft/m³)`;
        }
        return `${baseFee} + (sávos árazás beállítása szükséges)`;

      case 'víz':
      case 'hideg víz':
        if (unitPrice > 0) {
          return `${baseFee} + (${unitPrice} Ft/${unit} × fogyasztás) + szennyvízdíj`;
        }
        return `${baseFee} + (egységár beállítása szükséges)`;

      case 'meleg víz':
      case 'melegvíz':
        if (unitPrice > 0) {
          return `${baseFee} + (${unitPrice} Ft/${unit} × fogyasztás) + fűtési költség`;
        }
        return `${baseFee} + (egységár beállítása szükséges)`;

      case 'távfűtés':
      case 'fűtés':
        if (unitPrice > 0) {
          return `${baseFee} + (${unitPrice} Ft/GJ × fogyasztás) + alapdíj`;
        }
        return `${baseFee} + (GJ alapú számítás beállítása szükséges)`;

      case 'szennyvíz':
        if (unitPrice > 0) {
          return `Hideg víz fogyasztás × ${unitPrice} Ft/${unit} (víz alapú számítás)`;
        }
        return `Víz fogyasztás alapú számítás (beállítás szükséges)`;

      default:
        if (unitPrice > 0) {
          return `${baseFee} + (${unitPrice} Ft/${unit} × fogyasztás)`;
        }
        return `${baseFee} + (egységár beállítása szükséges)`;
    }
  };

  // Modal bezárása
  const handleCloseModal = () => {
    console.log('🚨🚨🚨 handleCloseModal HÍVVA! Stack trace:');
    console.trace();
    console.log('🚨🚨🚨 VALAKI BEZÁRJA A MODALT!');
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
      
      // Token ellenőrzés
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Nincs bejelentkezve! Kérjük jelentkezzen be újra.');
      }
      
      const response = await utilitiesService.getUtilitySettings(currentHousehold.id);
      setSettings(response || []);
    } catch (err) {
      console.error('❌ Error loading settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Komponens inicializálása - a függvények deklarálása után
  useEffect(() => {
    if (currentHousehold?.id) {
      loadSettings();
      loadHouseholdCosts();
    }
  }, [currentHousehold?.id]); // JAVÍTÁS: Csak a currentHousehold.id-t figyeljük

  // Debug useEffect-ek eltávolítva

  if (loading) {
    return <div className="loading">Beállítások betöltése...</div>;
  }

  // Token ellenőrzés
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return (
      <div className="utility-settings">
        <div className="error-message">
          <span>⚠️ Nincs bejelentkezve! Kérjük jelentkezzen be újra.</span>
          <button 
            onClick={() => {
              // Átirányítás a bejelentkezés oldalra
              window.location.href = '/login';
            }}
            style={{marginLeft: '10px', padding: '5px 10px'}}
          >
            Bejelentkezés
          </button>
        </div>
      </div>
    );
  }

  // Token lejárat ellenőrzés
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        return (
          <div className="utility-settings">
            <div className="error-message">
              <span>⚠️ A token lejárt! Kérjük jelentkezzen be újra.</span>
              <button 
                onClick={() => {
                  localStorage.removeItem('accessToken');
                  window.location.href = '/login';
                }}
                style={{marginLeft: '10px', padding: '5px 10px'}}
              >
                Újra bejelentkezés
              </button>
            </div>
          </div>
        );
      }
    } catch (e) {
      console.error('Token validációs hiba:', e);
    }
  }

  return (
    <div className="utility-settings">
      {/* Modal most a parent komponensben van */}
      
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
                placeholder="pl. 3000"
              />
            ) : (
              <span className="cost-display">
                {utilitiesService.formatCost(householdCosts.maintenance_cost)}/hó
              </span>
            )}
            <small>Lift, takarítás, karbantartás</small>
          </div>
          
          <div className="cost-item">
            <label>Egyéb havi költség (Ft/hó)</label>
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
            <small>Egyéb közös költségek</small>
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
            onClick={editingRentCosts ? handleSaveRentCosts : () => {
              console.log('🏠 Starting rent costs editing');
              setEditingRentCosts(true);
            }}
            disabled={loading}
          >
            {editingRentCosts ? '💾 Mentés' : '✏️ Szerkesztés'}
          </button>
        </div>
        
        <div className="cost-item">
          <label>Lakbér (Ft/hó)</label>
          {editingRentCosts ? (
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
          {editingRentCosts ? (
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
          {editingRentCosts ? (
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
                {getUtilityFormula(setting)}
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
                onClick={() => setEditingUtility(setting)}
                title="Sávos árazás szerkesztése"
              >
                ⚙️ Sávok szerkesztése
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

      {/* Modal-ok most a parent komponensben vannak */}

      {/* Összes modal most a parent komponensben van */}
    </div>
  );
};

export default UtilitySettings;
