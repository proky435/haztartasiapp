// Utilities komponens - javított verzió
// Csak az első 665 sor megtartása

import React, { useState, useEffect } from 'react';
import utilitiesService from '../services/utilitiesService';
import UtilitySettings from './UtilitySettings';
import LoadingSpinner from './LoadingSpinner';
import './Utilities.css';

const Utilities = ({ currentHousehold }) => {
  // State változók
  const [utilityTypes, setUtilityTypes] = useState([]);
  const [utilitySettings, setUtilitySettings] = useState([]);
  const [utilitySettingsLoaded, setUtilitySettingsLoaded] = useState(false);
  const [utilityReadings, setUtilityReadings] = useState([]);
  const [readings, setReadings] = useState([]);
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReading, setEditingReading] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedUtilityType, setSelectedUtilityType] = useState('all');
  const [dateRange, setDateRange] = useState('3months');
  const [showSettings, setShowSettings] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  
  // Debug log for showSettings state changes
  useEffect(() => {
    console.log('🔧 showSettings state changed:', showSettings);
  }, [showSettings]);
  const [showPricingModal, setShowPricingModal] = useState(null);
  const [editingUtility, setEditingUtility] = useState(null);
  const [showCalculator, setShowCalculator] = useState(null);
  const [calculatorConsumption, setCalculatorConsumption] = useState('');
  const [calculatorResult, setCalculatorResult] = useState(null);
  const [calculatorLoading, setCalculatorLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    base_fee: '',
    current_unit_price: '',
    provider_name: '',
    is_enabled: true
  });
  const [editLoading, setEditLoading] = useState(false);
  const [pricingTiers, setPricingTiers] = useState([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [tierFormData, setTierFormData] = useState({
    tier_number: 1,
    tier_name: '',
    limit_value: '',
    limit_unit: '',
    price_per_unit: '',
    conversion_factor: '',
    system_usage_fee: ''
  });
  const [householdCosts, setHouseholdCosts] = useState({
    common_utility_cost: 0,
    maintenance_cost: 0,
    other_monthly_costs: 0,
    rent_amount: 0,
    garage_rent: 0,
    insurance_cost: 0
  });

  // Form adatok
  const [formData, setFormData] = useState({
    utility_type_id: '',
    reading_date: new Date().toISOString().split('T')[0],
    meter_reading: '',
    unit_price: '',
    estimated: false,
    notes: '',
    invoice_number: ''
  });

  // Adatok betöltése amikor a háztartás változik
  useEffect(() => {
    if (currentHousehold?.id) {
      loadData();
    }
  }, [currentHousehold]);

  // Újrarenderelés kikényszerítése amikor utility settings betöltődik
  useEffect(() => {
    // Force re-render when utility settings are loaded
    if (utilitySettingsLoaded && statistics.length > 0) {
      console.log('🔄 Force re-render: utility settings loaded and statistics available');
      // Force component re-render
      setLoading(false);
    }
  }, [utilitySettingsLoaded, statistics]);

  // Backup force re-render after utility settings loaded
  useEffect(() => {
    if (utilitySettingsLoaded) {
      // Small delay to ensure all state updates are processed
      const timer = setTimeout(() => {
        console.log('🔄 Backup force re-render after utility settings loaded');
        setLoading(prev => !prev); // Toggle to force re-render
        setTimeout(() => setLoading(false), 100);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [utilitySettingsLoaded]);

  // Szűrők változására reagáló useEffect
  useEffect(() => {
    if (currentHousehold?.id && utilitySettingsLoaded) {
      console.log('🔍 Filter changed, reloading data:', { selectedUtilityType, dateRange });
      loadUtilityReadings();
      loadStatistics();
    }
  }, [selectedUtilityType, dateRange, utilitySettingsLoaded]);

  // Költségszámítás
  const calculateUtilityCost = async () => {
    if (!calculatorConsumption || !showCalculator || !currentHousehold?.id) {
      return;
    }

    setCalculatorLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://192.168.0.19:3001/api/v1'}/utility-calculator/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          household_id: currentHousehold.id,
          utility_type_id: showCalculator.utility_type_id,
          consumption: parseFloat(calculatorConsumption),
          consumption_unit: showCalculator.unit
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('🔍 Calculator result:', result);
      console.log('🔍 Total cost:', result.total_cost);
      console.log('🔍 Base fee:', result.base_fee);
      console.log('🔍 Consumption cost:', result.consumption_cost);
      console.log('🔍 Calculation object:', result.calculation);
      
      // Ha a base_fee nincs a root szinten, próbáljuk a calculation objektumból
      if (result.base_fee === undefined && result.calculation) {
        result.base_fee = result.calculation.base_fee;
        result.consumption_cost = result.calculation.consumption_cost;
        console.log('🔧 Fixed base_fee from calculation:', result.base_fee);
      }
      
      setCalculatorResult(result);
    } catch (error) {
      console.error('Error calculating utility cost:', error);
      setError('Hiba a költségszámítás során: ' + error.message);
    } finally {
      setCalculatorLoading(false);
    }
  };

  // Kalkulátor modal bezárása
  const closeCalculator = () => {
    setShowCalculator(null);
    setCalculatorConsumption('');
    setCalculatorResult(null);
  };

  // Szerkesztés modal megnyitása
  const openEditModal = (utility) => {
    setEditingUtility(utility);
    setEditFormData({
      base_fee: utility.base_fee || 0,
      current_unit_price: utility.current_unit_price || 0,
      provider_name: utility.provider_name || '',
      common_cost: utility.common_cost || 0,
      meter_number: utility.meter_number || '',
      customer_number: utility.customer_number || '',
      billing_cycle_day: utility.billing_cycle_day || 1,
      target_monthly_consumption: utility.target_monthly_consumption || '',
      alert_threshold_percent: utility.alert_threshold_percent || 120,
      notes: utility.notes || '',
      is_enabled: utility.is_enabled || false
    });
  };

  // Szerkesztés modal bezárása
  const closeEditModal = () => {
    setEditingUtility(null);
    setEditFormData({
      base_fee: '',
      current_unit_price: '',
      provider_name: '',
      common_cost: '',
      meter_number: '',
      customer_number: '',
      billing_cycle_day: 1,
      target_monthly_consumption: '',
      alert_threshold_percent: 120,
      notes: '',
      is_enabled: false
    });
  };

  // Form mező változtatás
  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Teljes költség számítás (alapdíj + fogyasztási költség)
  const calculateTotalCost = (reading) => {
    if (!reading.cost || !reading.consumption) return reading.cost || 0;
    
    // console.log('🔍 calculateTotalCost debug:');
    // console.log('  - Reading:', reading);
    // console.log('  - UtilitySettings:', utilitySettings);
    
    // Keressük meg a utility beállításokat a utility_type alapján
    const utilityType = utilityTypes.find(type => 
      type.name === reading.utility_type ||
      type.display_name === reading.display_name
    );
    
    const utilitySetting = utilitySettings.find(setting => 
      setting.utility_type_id === utilityType?.id
    );
    
    // console.log('  - Found utility type:', utilityType);
    // console.log('  - Found utility setting:', utilitySetting);
    
    if (!utilitySetting || !utilitySetting.base_fee) {
      // console.log('  - No base fee found, returning original cost:', reading.cost);
      return parseFloat(reading.cost) || 0; // Ha nincs alapdíj beállítva, csak a fogyasztási költség
    }
    
    const baseFee = parseFloat(utilitySetting.base_fee) || 0;
    const consumptionCost = parseFloat(reading.cost) || 0;
    const totalCost = baseFee + consumptionCost;
    
    // console.log('  - Base fee:', baseFee);
    // console.log('  - Consumption cost:', consumptionCost);
    // console.log('  - Total cost:', totalCost);
    
    return totalCost;
  };

  // Statisztika teljes költség számítás (alapdíj + fogyasztási költség)
  const calculateStatTotalCost = (stat) => {
    if (!stat.total_cost) return 0;
    
    console.log('🔍 calculateStatTotalCost debug:');
    console.log('  - Stat:', stat);
    console.log('  - UtilitySettings:', utilitySettings);
    
    // Keressük meg a utility beállításokat
    const utilityType = utilityTypes.find(type => 
      type.name === stat.utility_type ||
      type.display_name === stat.display_name
    );
    
    const utilitySetting = utilitySettings.find(setting => 
      setting.utility_type_id === utilityType?.id
    );
    
    console.log('  - Found utility type:', utilityType);
    console.log('  - Found utility setting:', utilitySetting);
    
    if (!utilitySetting || !utilitySetting.base_fee) {
      console.log('  - No base fee found, returning original cost:', stat.total_cost);
      return parseFloat(stat.total_cost) || 0; // Ha nincs alapdíj beállítva, csak a fogyasztási költség
    }
    
    const baseFee = parseFloat(utilitySetting.base_fee) || 0;
    const consumptionCost = parseFloat(stat.total_cost) || 0;
    
    // EGYSZERŰ SZÁMÍTÁS: Csak egy alapdíj + fogyasztási költség
    // (Nem szorozzuk a reading_count-tal, mert az összesített költség)
    const totalCost = baseFee + consumptionCost;
    
    console.log('  - Base fee:', baseFee);
    console.log('  - Consumption cost:', consumptionCost);
    console.log('  - Reading count:', stat.reading_count);
    console.log('  - Total cost:', totalCost);
    
    return totalCost;
  };

  // Utility beállítások mentése
  const saveUtilitySettings = async () => {
    if (!editingUtility || !currentHousehold?.id) return;

    setEditLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://192.168.0.19:3001/api/v1'}/utility-settings/${currentHousehold.id}/${editingUtility.utility_type_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          base_fee: parseFloat(editFormData.base_fee) || 0,
          current_unit_price: parseFloat(editFormData.current_unit_price) || 0,
          provider_name: editFormData.provider_name || null,
          common_cost: parseFloat(editFormData.common_cost) || 0,
          meter_number: editFormData.meter_number || null,
          customer_number: editFormData.customer_number || null,
          billing_cycle_day: parseInt(editFormData.billing_cycle_day) || 1,
          target_monthly_consumption: editFormData.target_monthly_consumption ? parseFloat(editFormData.target_monthly_consumption) : null,
          alert_threshold_percent: parseInt(editFormData.alert_threshold_percent) || 120,
          notes: editFormData.notes || null,
          is_enabled: editFormData.is_enabled
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Beállítások újratöltése
      if (showSettings) {
        // Ha a settings modal nyitva van, akkor frissítjük a UtilitySettings komponenst
        window.location.reload(); // Egyszerű megoldás
      }

      closeEditModal();
      setError('Beállítások sikeresen mentve!');
      
      // 3 másodperc után eltűnik a siker üzenet
      setTimeout(() => setError(null), 3000);

    } catch (error) {
      console.error('Error saving utility settings:', error);
      setError('Hiba a mentés során: ' + error.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Sávos árazás modal megnyitása
  const openPricingModal = async (utility) => {
    setShowPricingModal(utility);
    await loadPricingTiers(utility.utility_type_id);
  };

  // Sávos árazás modal bezárása
  const closePricingModal = () => {
    setShowPricingModal(null);
    setPricingTiers([]);
    setEditingTier(null);
    resetTierForm();
  };

  // Sávok betöltése
  const loadPricingTiers = async (utilityTypeId) => {
    if (!currentHousehold?.id || !utilityTypeId) return;

    setPricingLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://192.168.0.19:3001/api/v1'}/utility-pricing/${currentHousehold.id}/${utilityTypeId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setPricingTiers(result.pricing_tiers || []);
    } catch (error) {
      console.error('Error loading pricing tiers:', error);
      setError('Hiba a sávok betöltése során: ' + error.message);
    } finally {
      setPricingLoading(false);
    }
  };

  // Tier form reset
  const resetTierForm = () => {
    setTierFormData({
      tier_number: (pricingTiers.length || 0) + 1,
      tier_name: '',
      limit_value: '',
      limit_unit: showPricingModal?.unit || '',
      price_per_unit: '',
      conversion_factor: '',
      system_usage_fee: ''
    });
  };

  // Tier form változtatás
  const handleTierFormChange = (field, value) => {
    setTierFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Új sáv hozzáadása
  const addNewTier = () => {
    setEditingTier('new');
    resetTierForm();
  };

  // Sáv szerkesztése
  const editTier = (tier) => {
    setEditingTier(tier.tier_number);
    setTierFormData({
      tier_number: tier.tier_number,
      tier_name: tier.tier_name || '',
      limit_value: tier.limit_value || '',
      limit_unit: tier.limit_unit || '',
      price_per_unit: tier.price_per_unit || '',
      conversion_factor: tier.conversion_factor || '',
      system_usage_fee: tier.system_usage_fee || ''
    });
  };

  // Sáv mentése
  const saveTier = async () => {
    if (!showPricingModal || !currentHousehold?.id) return;

    setPricingLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://192.168.0.19:3001/api/v1'}/utility-pricing/${currentHousehold.id}/${showPricingModal.utility_type_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          tier_number: parseInt(tierFormData.tier_number),
          tier_name: tierFormData.tier_name,
          limit_value: parseFloat(tierFormData.limit_value) || null,
          limit_unit: tierFormData.limit_unit,
          price_per_unit: parseFloat(tierFormData.price_per_unit),
          conversion_factor: parseFloat(tierFormData.conversion_factor) || null,
          system_usage_fee: parseFloat(tierFormData.system_usage_fee) || 0
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Sávok újratöltése
      await loadPricingTiers(showPricingModal.utility_type_id);
      setEditingTier(null);
      resetTierForm();
      
    } catch (error) {
      console.error('Error saving tier:', error);
      setError('Hiba a sáv mentése során: ' + error.message);
    } finally {
      setPricingLoading(false);
    }
  };

  // Sáv törlése
  const deleteTier = async (tierNumber) => {
    if (!showPricingModal || !currentHousehold?.id) return;
    
    if (!window.confirm('Biztosan törölni szeretnéd ezt a sávot?')) return;

    setPricingLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://192.168.0.19:3001/api/v1'}/utility-pricing/${currentHousehold.id}/${showPricingModal.utility_type_id}/${tierNumber}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Sávok újratöltése
      await loadPricingTiers(showPricingModal.utility_type_id);
      
    } catch (error) {
      console.error('Error deleting tier:', error);
      setError('Hiba a sáv törlése során: ' + error.message);
    } finally {
      setPricingLoading(false);
    }
  };

  // Alapértelmezett sávok visszaállítása
  const resetToDefaults = async () => {
    if (!showPricingModal || !currentHousehold?.id) return;
    
    if (!window.confirm('Biztosan visszaállítod az alapértelmezett magyar rezsicsökkentett sávokat?')) return;

    setPricingLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://192.168.0.19:3001/api/v1'}/utility-pricing/${currentHousehold.id}/${showPricingModal.utility_type_id}/reset-defaults`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Sávok újratöltése
      await loadPricingTiers(showPricingModal.utility_type_id);
      
    } catch (error) {
      console.error('Error resetting to defaults:', error);
      setError('Hiba az alapértelmezett sávok visszaállítása során: ' + error.message);
    } finally {
      setPricingLoading(false);
    }
  };

  // Összes adat betöltése - SEQUENTIAL (sorrend fontos!)
  const loadData = async () => {
    if (!currentHousehold?.id) return;
    
    try {
      // Először a utility types és settings (ezek kellenek a számításokhoz)
      await Promise.all([
        loadUtilityTypes(),
        loadUtilitySettings()
      ]);
      
      // Aztán a többi adat (ezek használják a utility settings-et)
      await Promise.all([
        loadUtilityReadings(),
        loadHouseholdCosts(),
        loadStatistics()
      ]);
      
      console.log('🎉 All data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading data:', error);
    }
  };

  // Utility readings betöltése
  const loadUtilityReadings = async () => {
    try {
      const response = await utilitiesService.getUtilityReadings(currentHousehold.id, {
        utility_type: selectedUtilityType !== 'all' ? selectedUtilityType : undefined,
        date_range: dateRange
      });
      const readingsData = response?.data?.readings || response?.readings || [];
      setReadings(readingsData); // A táblázat ezt használja
      setUtilityReadings(readingsData); // Backup state
    } catch (err) {
      console.error('Error loading utility readings:', err);
    }
  };

  // Household costs betöltése
  const loadHouseholdCosts = async () => {
    try {
      const response = await utilitiesService.getHouseholdCosts(currentHousehold.id);
      setHouseholdCosts(response?.data || response || {});
    } catch (err) {
      console.error('Error loading household costs:', err);
    }
  };

  // Adatok betöltése
  const loadUtilityTypes = async () => {
    try {
      setError(null);
      const response = await utilitiesService.getUtilityTypes();
      setUtilityTypes(response.data || response);
    } catch (err) {
      console.error('Error loading utility types:', err);
      setError('Hiba a közműtípusok betöltése során: ' + err.message);
    }
  };

  // Utility settings betöltése
  const loadUtilitySettings = async () => {
    if (!currentHousehold?.id) return;
    
    try {
      setUtilitySettingsLoaded(false);
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://192.168.0.19:3001/api/v1'}/utility-settings/${currentHousehold.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        const settings = result.data || result.utility_settings || [];
        setUtilitySettings(settings);
        setUtilitySettingsLoaded(true);
        console.log('🔍 Loaded utility settings:', settings);
        console.log('✅ Utility settings loaded flag set to true');
      } else {
        console.log('❌ Failed to load utility settings:', response.status);
        setUtilitySettings([]);
        setUtilitySettingsLoaded(true);
      }
    } catch (error) {
      console.error('Error loading utility settings:', error);
      setUtilitySettings([]);
      setUtilitySettingsLoaded(true);
    }
  };

  const loadReadings = async () => {
    try {
      const response = await utilitiesService.getUtilityReadings(currentHousehold.id, {
        utility_type: selectedUtilityType !== 'all' ? selectedUtilityType : undefined,
        date_range: dateRange
      });
      setReadings(response?.data?.readings || response?.readings || []);
    } catch (err) {
      console.error('Error loading readings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await utilitiesService.getUtilityStatistics(currentHousehold.id, {
        utility_type: selectedUtilityType !== 'all' ? selectedUtilityType : undefined,
        date_range: dateRange
      });
      const statsData = response?.data?.statistics || response?.statistics || response?.data || response || [];
      setStatistics(statsData);
      console.log('📊 Loaded statistics:', statsData);
    } catch (err) {
      console.error('Error loading statistics:', err);
      // Fallback: try to get statistics from readings
      try {
        const response = await utilitiesService.getUtilityReadings(currentHousehold.id, {
          utility_type: selectedUtilityType !== 'all' ? selectedUtilityType : undefined,
          date_range: dateRange
        });
        const statsData = response?.data?.statistics || response?.statistics || [];
        setStatistics(statsData);
        console.log('📊 Loaded statistics from readings:', statsData);
      } catch (fallbackErr) {
        console.error('Error loading statistics fallback:', fallbackErr);
        setStatistics([]);
      }
    }
  };

  // Form kezelés
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Utility type változtatás - egységár automatikus betöltése
  const handleUtilityTypeChange = async (utilityTypeId) => {
    setFormData(prev => ({
      ...prev,
      utility_type_id: utilityTypeId,
      unit_price: '' // Reset unit price
    }));

    if (utilityTypeId && currentHousehold?.id) {
      try {
        // Betöltjük a utility beállításokat
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://192.168.0.19:3001/api/v1'}/utility-settings/${currentHousehold.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('🔍 Utility settings response:', result);
          
          // A válasz result.data-ban van, nem result.utility_settings-ben
          const utilitySettings = result.data || result.utility_settings || [];
          const utilitySetting = utilitySettings.find(setting => 
            setting.utility_type_id === utilityTypeId
          );

          console.log('🔍 Found utility setting:', utilitySetting);

          if (utilitySetting && utilitySetting.current_unit_price) {
            console.log('✅ Setting unit price:', utilitySetting.current_unit_price);
            setFormData(prev => ({
              ...prev,
              unit_price: parseFloat(utilitySetting.current_unit_price)
            }));
          } else {
            console.log('❌ No unit price found for utility type:', utilityTypeId);
          }
        } else {
          console.log('❌ Failed to load utility settings:', response.status);
        }
      } catch (error) {
        console.error('Error loading utility settings:', error);
      }
    }
  };

  // Új mérés hozzáadása
  const handleAddReading = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const readingData = {
        ...formData,
        household_id: currentHousehold.id,
        meter_reading: parseFloat(formData.meter_reading),
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null
      };

      await utilitiesService.addUtilityReading(readingData);
      
      setShowAddModal(false);
      resetForm();
      console.log('🔄 Reloading data after adding reading...');
      await loadData();
      console.log('✅ Data reloaded after adding reading');
      
    } catch (err) {
      console.error('Error adding reading:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mérés szerkesztése
  const handleEditReading = (reading) => {
    setEditingReading(reading);
    setFormData({
      utility_type_id: reading.utility_type_id,
      reading_date: reading.reading_date.split('T')[0],
      meter_reading: reading.meter_reading,
      unit_price: reading.unit_price || '',
      estimated: reading.estimated,
      notes: reading.notes || '',
      invoice_number: reading.invoice_number || ''
    });
    setShowAddModal(true);
  };

  // Mérés frissítése
  const handleUpdateReading = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const readingData = {
        ...formData,
        meter_reading: parseFloat(formData.meter_reading),
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null
      };

      await utilitiesService.updateUtilityReading(editingReading.id, readingData);
      
      setShowAddModal(false);
      setEditingReading(null);
      resetForm();
      console.log('🔄 Reloading data after updating reading...');
      await loadData();
      console.log('✅ Data reloaded after updating reading');
      
    } catch (err) {
      console.error('Error updating reading:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mérés törlése
  const handleDeleteReading = async (readingId) => {
    try {
      setLoading(true);
      await utilitiesService.deleteUtilityReading(readingId);
      setDeleteConfirm(null);
      console.log('🔄 Reloading data after deleting reading...');
      await loadData();
      console.log('✅ Data reloaded after deleting reading');
    } catch (err) {
      console.error('Error deleting reading:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Form visszaállítása
  const resetForm = () => {
    setFormData({
      utility_type_id: '',
      reading_date: new Date().toISOString().split('T')[0],
      meter_reading: '',
      unit_price: '',
      estimated: false,
      notes: '',
      invoice_number: ''
    });
  };

  // Modal bezárása
  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingReading(null);
    resetForm();
  };

  if (loading && readings.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="utilities-container">
      {/* Header */}
      <div className="utilities-header">
        <div className="header-left">
          <h2>🔌 Közműfogyasztás</h2>
          <p>Háztartás: {currentHousehold?.name}</p>
        </div>
        <div className="utilities-actions">
          <button 
            className="add-reading-btn"
            onClick={() => setShowAddModal(true)}
          >
            ➕ Új mérés
          </button>
          <button 
            className="settings-btn"
            onClick={() => {
              console.log('⚙️ Opening utility settings modal');
              setShowSettings(true);
            }}
          >
            ⚙️ Beállítások
          </button>
          <button 
            className="settings-btn"
            onClick={() => {
              console.log('📊 Opening statistics modal');
              setShowStatistics(true);
            }}
          >
            📊 Statisztikák
          </button>
        </div>
      </div>

      {/* Szűrők */}
      <div className="utilities-filters">
        <div className="filter-group">
          <label>Közmű típus:</label>
          <select 
            value={selectedUtilityType} 
            onChange={(e) => setSelectedUtilityType(e.target.value)}
          >
            <option value="all">Összes</option>
            {utilityTypes.map(type => (
              <option key={type.id} value={type.name}>
                {type.display_name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Időszak:</label>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="1month">Utolsó 1 hónap</option>
            <option value="3months">Utolsó 3 hónap</option>
            <option value="6months">Utolsó 6 hónap</option>
            <option value="1year">Utolsó 1 év</option>
          </select>
        </div>
      </div>

      {/* Hiba megjelenítése */}
      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Áttekintés */}
      <div className="utilities-stats">
        <h3>📊 Áttekintés</h3>
        <div className="stats-info">
          <p>💡 <strong>Sávos árazás:</strong> A villany és gáz esetében rezsicsökkentett árazás érvényes az első sávban.</p>
        </div>
        <div className="stats-grid">
          {statistics.map(stat => (
            <div key={stat.utility_type} className="stat-card">
              <div className="stat-header">
                <span className="stat-icon">{stat.icon}</span>
                <span className="stat-name">{stat.display_name}</span>
              </div>
              <div className="stat-values">
                <div className="stat-item">
                  <span className="stat-label">Összes fogyasztás:</span>
                  <span className="stat-value">
                    {stat.total_consumption ? 
                      utilitiesService.formatConsumption(stat.total_consumption, stat.unit) : 
                      `0 ${stat.unit}`
                    }
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Összes költség:</span>
                  <span className="stat-value">
                    {!utilitySettingsLoaded ? (
                      '⏳ Betöltés...'
                    ) : stat.total_cost && utilitySettings.length > 0 ? (
                      utilitiesService.formatCost(Math.round(calculateStatTotalCost(stat)))
                    ) : stat.total_cost ? (
                      utilitiesService.formatCost(stat.total_cost)
                    ) : (
                      '0 Ft'
                    )}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Átlagos havi:</span>
                  <span className="stat-value">
                    {stat.avg_consumption ? 
                      utilitiesService.formatConsumption(stat.avg_consumption, stat.unit) : 
                      `0 ${stat.unit}`
                    }
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Utolsó mérés:</span>
                  <span className="stat-value">Nincs adat</span>
                </div>
              </div>
              <div className="stat-actions">
                <button 
                  className="add-reading-btn"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      utility_type_id: stat.utility_type_id
                    }));
                    setShowAddModal(true);
                  }}
                >
                  ✅ Új mérés
                </button>
              </div>
            </div>
          ))}
          
          {/* Lakbér kártya */}
          <div className="stat-card rent-card">
            <div className="stat-header">
              <span className="stat-icon">🏠</span>
              <span className="stat-name">Lakbér</span>
            </div>
            <div className="stat-values">
              <div className="stat-item">
                <span className="stat-label">Lakbér:</span>
                <span className="stat-value">
                  {utilitiesService.formatCost(parseFloat(householdCosts.rent_amount) || 0)}/hó
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Garázs bérlet:</span>
                <span className="stat-value">
                  {utilitiesService.formatCost(parseFloat(householdCosts.garage_rent) || 0)}/hó
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Biztosítás:</span>
                <span className="stat-value">
                  {utilitiesService.formatCost(parseFloat(householdCosts.insurance_cost) || 0)}/hó
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Összes lakbér:</span>
                <span className="stat-value total-cost">
                  {(() => {
                    const rentAmount = parseFloat(householdCosts.rent_amount) || 0;
                    const garageRent = parseFloat(householdCosts.garage_rent) || 0;
                    const insuranceCost = parseFloat(householdCosts.insurance_cost) || 0;
                    const total = rentAmount + garageRent + insuranceCost;
                    
                    console.log('🏠 Lakbér összesítés:', {
                      rent_amount: householdCosts.rent_amount,
                      garage_rent: householdCosts.garage_rent,
                      insurance_cost: householdCosts.insurance_cost,
                      rentAmount,
                      garageRent,
                      insuranceCost,
                      total
                    });
                    
                    return utilitiesService.formatCost(total);
                  })()}/hó
                </span>
              </div>
            </div>
            <div className="stat-actions">
              <button 
                className="settings-btn"
                onClick={() => {
                  console.log('⚙️ Opening lakbér settings modal');
                  setShowSettings(true);
                }}
              >
                ⚙️ Beállítások
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Háztartási közös költségek */}
      <div className="household-costs-section">
        <h3>🏠 Háztartási közös költségek</h3>
        <div className="household-costs-card">
          <div className="cost-item">
            <span className="cost-label">Közös közmű költségek:</span>
            <span className="cost-value">{utilitiesService.formatCost(householdCosts.common_utility_cost)}</span>
          </div>
          <div className="cost-item">
            <span className="cost-label">Karbantartási költségek:</span>
            <span className="cost-value">{utilitiesService.formatCost(householdCosts.maintenance_cost)}</span>
          </div>
          <div className="cost-item">
            <span className="cost-label">Egyéb havi költségek:</span>
            <span className="cost-value">{utilitiesService.formatCost(householdCosts.other_monthly_costs)}</span>
          </div>
          <div className="cost-item total">
            <span className="cost-label">Összesen:</span>
            <span className="cost-value">
              {utilitiesService.formatCost(
                householdCosts.common_utility_cost + 
                householdCosts.maintenance_cost + 
                householdCosts.other_monthly_costs
              )}
            </span>
          </div>
          <button 
            className="edit-btn"
            onClick={() => {
              console.log('🔧 Opening household costs settings modal');
              setShowSettings(true);
            }}
          >
            ✏️ Szerkesztés
          </button>
        </div>
      </div>

      {/* Mérések listája */}
      <div className="utilities-readings">
        <h3>📋 Mérések</h3>
        {readings.length === 0 ? (
          <div className="no-readings">
            <p>Még nincsenek rögzített mérések.</p>
            <button onClick={() => setShowAddModal(true)}>
              Első mérés rögzítése
            </button>
          </div>
        ) : (
          <div className="readings-table">
            <table>
              <thead>
                <tr>
                  <th>Dátum</th>
                  <th>Közmű</th>
                  <th>Mérőóra állás</th>
                  <th>Fogyasztás</th>
                  <th>Költség</th>
                  <th>Megjegyzés</th>
                  <th>Műveletek</th>
                </tr>
              </thead>
              <tbody>
                {readings.map(reading => (
                  <tr key={reading.id} className={reading.estimated ? 'estimated' : ''}>
                    <td>
                      {utilitiesService.formatDate(reading.reading_date)}
                      {reading.estimated && <span className="estimated-badge">Becsült</span>}
                    </td>
                    <td>
                      <span className="utility-type">
                        {reading.display_name}
                      </span>
                    </td>
                    <td>
                      <span className="meter-reading">
                        {utilitiesService.formatConsumption(reading.meter_reading, reading.unit)}
                      </span>
                    </td>
                    <td>
                      <span className="consumption">
                        {reading.consumption ? 
                          utilitiesService.formatConsumption(reading.consumption, reading.unit) : 
                          '-'
                        }
                      </span>
                    </td>
                    <td>
                      <span className="cost">
                        {!utilitySettingsLoaded ? (
                          '⏳'
                        ) : reading.cost && utilitySettings.length > 0 ? (
                          utilitiesService.formatCost(Math.round(calculateTotalCost(reading)))
                        ) : reading.cost ? (
                          utilitiesService.formatCost(reading.cost)
                        ) : (
                          '-'
                        )}
                      </span>
                    </td>
                    <td>
                      <span className="notes">
                        {reading.notes || '-'}
                        {reading.invoice_number && (
                          <small className="invoice">Számla: {reading.invoice_number}</small>
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="reading-actions">
                        <button 
                          className="edit-reading-btn"
                          onClick={() => handleEditReading(reading)}
                          title="Szerkesztés"
                        >
                          ✏️
                        </button>
                        <button 
                          className="delete-reading-btn"
                          onClick={() => setDeleteConfirm(reading)}
                          title="Törlés"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Új mérés modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingReading ? '✏️ Mérés szerkesztése' : '➕ Új mérés hozzáadása'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>✕</button>
            </div>
            
            <form onSubmit={editingReading ? handleUpdateReading : handleAddReading}>
              <div className="form-group">
                <label>Közmű típus *</label>
                <select 
                  value={formData.utility_type_id} 
                  onChange={(e) => handleUtilityTypeChange(e.target.value)}
                  required
                >
                  <option value="">Válassz közműtípust</option>
                  {utilityTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Mérés dátuma *</label>
                <input 
                  type="date" 
                  value={formData.reading_date}
                  onChange={(e) => handleFormChange('reading_date', e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Mérőóra állás *</label>
                <input 
                  type="number" 
                  step="0.001"
                  value={formData.meter_reading}
                  onChange={(e) => handleFormChange('meter_reading', e.target.value)}
                  placeholder="pl. 1234.5"
                  required 
                />
              </div>

              <div className="form-group">
                <label>
                  Egységár (Ft)
                  <span className="optional-label">opcionális</span>
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => handleFormChange('unit_price', e.target.value)}
                  placeholder="pl. 150.5"
                />
                {formData.utility_type_id && (() => {
                  const utilityType = utilityTypes.find(type => type.id === formData.utility_type_id);
                  const utilitySetting = utilitySettings.find(setting => setting.utility_type_id === formData.utility_type_id);
                  if (utilitySetting && utilityType) {
                    return (
                      <div className="pricing-info">
                        <small>
                          💡 <strong>Alapdíj:</strong> {utilitySetting.base_fee} Ft/hó | 
                          <strong> Beállított egységár:</strong> {utilitySetting.current_unit_price} Ft/{utilityType.unit}
                        </small>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="form-group">
                <label>
                  <input 
                    type="checkbox"
                    checked={formData.estimated}
                    onChange={(e) => handleFormChange('estimated', e.target.checked)}
                  />
                  Becsült érték
                </label>
              </div>

              <div className="form-group">
                <label>Megjegyzés</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  placeholder="Opcionális megjegyzés..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Számla szám</label>
                <input 
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => handleFormChange('invoice_number', e.target.value)}
                  placeholder="pl. SZ-2024-001"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCloseModal}>
                  Mégse
                </button>
                <button type="submit" disabled={loading}>
                  {loading ? 'Mentés...' : (editingReading ? 'Frissítés' : 'Hozzáadás')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Törlés megerősítés modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content delete-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Mérés törlése</h3>
              <button className="close-btn" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            
            <div className="modal-body">
              <p>Biztosan törölni szeretnéd ezt a mérést?</p>
              <div className="delete-details">
                <strong>{deleteConfirm.display_name}</strong><br/>
                {utilitiesService.formatDate(deleteConfirm.reading_date)}<br/>
                {utilitiesService.formatConsumption(deleteConfirm.meter_reading, deleteConfirm.unit)}
              </div>
            </div>
            
            <div className="form-actions">
              <button onClick={() => setDeleteConfirm(null)}>
                Mégse
              </button>
              <button 
                className="delete-btn" 
                onClick={() => handleDeleteReading(deleteConfirm.id)}
                disabled={loading}
              >
                {loading ? 'Törlés...' : 'Törlés'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Beállítások modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => {
          console.log('🔧 Closing settings modal');
          setShowSettings(false);
        }}>
          <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚙️ Közműbeállítások</h3>
              <button className="close-btn" onClick={() => {
                console.log('🔧 Closing settings modal via X button');
                setShowSettings(false);
              }}>✕</button>
            </div>
            <div className="modal-body">
              <UtilitySettings 
                currentHousehold={currentHousehold} 
                showPricingModal={showPricingModal}
                setShowPricingModal={openPricingModal}
                editingUtility={editingUtility}
                setEditingUtility={openEditModal}
                showCalculator={showCalculator}
                setShowCalculator={setShowCalculator}
                onDataUpdate={() => {
                  console.log('🔄 Parent data update triggered from UtilitySettings');
                  loadHouseholdCosts();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sávos árazás modal */}
      {showPricingModal && (
        <div className="modal-overlay" onClick={closePricingModal}>
          <div className="modal-content pricing-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 {showPricingModal.display_name} - Sávos árazás</h3>
              <button className="close-btn" onClick={closePricingModal}>✕</button>
            </div>
            
            <div className="pricing-content">
              {pricingLoading ? (
                <div className="loading">⏳ Betöltés...</div>
              ) : (
                <>
                  {/* Meglévő sávok */}
                  <div className="existing-tiers">
                    <h4>📋 Meglévő sávok:</h4>
                    {pricingTiers.length === 0 ? (
                      <div className="no-tiers">
                        <p>Még nincsenek sávok beállítva.</p>
                        <p>Használd az "Alapértelmezett sávok" gombot a magyar rezsicsökkentett sávok betöltéséhez.</p>
                      </div>
                    ) : (
                      <div className="tiers-list">
                        {pricingTiers.map(tier => (
                          <div key={tier.tier_number} className="tier-item">
                            <div className="tier-info">
                              <span className="tier-number">#{tier.tier_number}</span>
                              <span className="tier-name">{tier.tier_name || `${tier.tier_number}. sáv`}</span>
                              <span className="tier-limit">
                                {tier.limit_value ? `${tier.limit_value} ${tier.limit_unit}` : 'Korlátlan'}
                              </span>
                              <span className="tier-price">{tier.price_per_unit} Ft/{tier.limit_unit}</span>
                            </div>
                            <div className="tier-actions">
                              <button 
                                className="edit-tier-btn" 
                                onClick={() => editTier(tier)}
                                title="Szerkesztés"
                              >
                                ✏️
                              </button>
                              <button 
                                className="delete-tier-btn" 
                                onClick={() => deleteTier(tier.tier_number)}
                                title="Törlés"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sáv szerkesztő form */}
                  {editingTier && (
                    <div className="tier-editor">
                      <h4>{editingTier === 'new' ? '➕ Új sáv hozzáadása' : `✏️ ${editingTier}. sáv szerkesztése`}</h4>
                      <form onSubmit={(e) => { e.preventDefault(); saveTier(); }}>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Sáv száma</label>
                            <input
                              type="number"
                              min="1"
                              value={tierFormData.tier_number}
                              onChange={(e) => handleTierFormChange('tier_number', e.target.value)}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Sáv neve</label>
                            <input
                              type="text"
                              value={tierFormData.tier_name}
                              onChange={(e) => handleTierFormChange('tier_name', e.target.value)}
                              placeholder="pl. Rezsicsökkentett"
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label>Sávhatár ({showPricingModal.unit})</label>
                            <input
                              type="number"
                              step="0.01"
                              value={tierFormData.limit_value}
                              onChange={(e) => handleTierFormChange('limit_value', e.target.value)}
                              placeholder="pl. 210 (üres = korlátlan)"
                            />
                          </div>
                          <div className="form-group">
                            <label>Egységár (Ft/{showPricingModal.unit})</label>
                            <input
                              type="number"
                              step="0.01"
                              value={tierFormData.price_per_unit}
                              onChange={(e) => handleTierFormChange('price_per_unit', e.target.value)}
                              placeholder="pl. 36.0"
                              required
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label>Rendszerhasználati díj (Ft/{showPricingModal.unit})</label>
                            <input
                              type="number"
                              step="0.01"
                              value={tierFormData.system_usage_fee}
                              onChange={(e) => handleTierFormChange('system_usage_fee', e.target.value)}
                              placeholder="pl. 13.0"
                            />
                          </div>
                          <div className="form-group">
                            <label>Átváltási tényező</label>
                            <input
                              type="number"
                              step="0.01"
                              value={tierFormData.conversion_factor}
                              onChange={(e) => handleTierFormChange('conversion_factor', e.target.value)}
                              placeholder="pl. 1.0"
                            />
                          </div>
                        </div>

                        <div className="form-actions">
                          <button type="submit" className="save-btn" disabled={pricingLoading}>
                            {pricingLoading ? '⏳ Mentés...' : '💾 Mentés'}
                          </button>
                          <button 
                            type="button" 
                            className="cancel-btn" 
                            onClick={() => setEditingTier(null)}
                          >
                            ❌ Mégse
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Akció gombok */}
                  <div className="pricing-actions">
                    <button 
                      className="add-tier-btn" 
                      onClick={addNewTier}
                      disabled={pricingLoading || editingTier}
                    >
                      ➕ Új sáv
                    </button>
                    <button 
                      className="reset-defaults-btn" 
                      onClick={resetToDefaults}
                      disabled={pricingLoading || editingTier}
                    >
                      🔄 Alapértelmezett sávok
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Szerkesztés modal */}
      {editingUtility && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ {editingUtility.display_name} - Szerkesztés</h3>
              <button className="close-btn" onClick={closeEditModal}>✕</button>
            </div>
            
            <div className="edit-content">
              <form onSubmit={(e) => { e.preventDefault(); saveUtilitySettings(); }}>
                <div className="form-group">
                  <label>Alapdíj (Ft/hó)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.base_fee}
                    onChange={(e) => handleEditFormChange('base_fee', e.target.value)}
                    placeholder="pl. 1500"
                  />
                </div>
                
                <div className="form-group">
                  <label>Egységár (Ft/{editingUtility.unit})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.current_unit_price}
                    onChange={(e) => handleEditFormChange('current_unit_price', e.target.value)}
                    placeholder="pl. 45.5"
                  />
                </div>
                
                <div className="form-group">
                  <label>Szolgáltató neve</label>
                  <input
                    type="text"
                    value={editFormData.provider_name}
                    onChange={(e) => handleEditFormChange('provider_name', e.target.value)}
                    placeholder="pl. E.ON"
                  />
                </div>

                <div className="form-group">
                  <label>Közös költség (Ft/hó)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.common_cost}
                    onChange={(e) => handleEditFormChange('common_cost', e.target.value)}
                    placeholder="pl. 2500"
                  />
                </div>

                <div className="form-group">
                  <label>Mérőszám</label>
                  <input
                    type="text"
                    value={editFormData.meter_number}
                    onChange={(e) => handleEditFormChange('meter_number', e.target.value)}
                    placeholder="pl. 12345678"
                  />
                </div>

                <div className="form-group">
                  <label>Ügyfélszám</label>
                  <input
                    type="text"
                    value={editFormData.customer_number}
                    onChange={(e) => handleEditFormChange('customer_number', e.target.value)}
                    placeholder="pl. 987654321"
                  />
                </div>

                <div className="form-group">
                  <label>Számlázási ciklus (nap)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editFormData.billing_cycle_day}
                    onChange={(e) => handleEditFormChange('billing_cycle_day', e.target.value)}
                    placeholder="pl. 15"
                  />
                </div>

                <div className="form-group">
                  <label>Havi célfogyasztás ({editingUtility.unit})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.target_monthly_consumption}
                    onChange={(e) => handleEditFormChange('target_monthly_consumption', e.target.value)}
                    placeholder="pl. 150"
                  />
                </div>

                <div className="form-group">
                  <label>Riasztási küszöb (%)</label>
                  <input
                    type="number"
                    min="100"
                    max="200"
                    value={editFormData.alert_threshold_percent}
                    onChange={(e) => handleEditFormChange('alert_threshold_percent', e.target.value)}
                    placeholder="pl. 120"
                  />
                </div>

                <div className="form-group">
                  <label>Megjegyzések</label>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => handleEditFormChange('notes', e.target.value)}
                    placeholder="További információk..."
                    rows="3"
                  />
                </div>
                
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={editFormData.is_enabled}
                      onChange={(e) => handleEditFormChange('is_enabled', e.target.checked)}
                    />
                    Aktív
                  </label>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="save-btn"
                    disabled={editLoading}
                  >
                    {editLoading ? '⏳ Mentés...' : '💾 Mentés'}
                  </button>
                  <button type="button" className="cancel-btn" onClick={closeEditModal}>❌ Mégse</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Kalkulátor modal */}
      {showCalculator && (
        <div className="modal-overlay" onClick={closeCalculator}>
          <div className="modal-content calculator-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🧮 {showCalculator.display_name} - Költségkalkulátor</h3>
              <button className="close-btn" onClick={closeCalculator}>✕</button>
            </div>
            
            <div className="calculator-content">
              <div className="current-pricing">
                <h4>Jelenlegi árazás:</h4>
                <div className="pricing-item">
                  <span>Alapdíj:</span>
                  <span>{showCalculator.base_fee || 0} Ft/hó</span>
                </div>
                <div className="pricing-item">
                  <span>Egységár:</span>
                  <span>{showCalculator.current_unit_price || 0} Ft/{showCalculator.unit}</span>
                </div>
              </div>
              
              <div className="consumption-input">
                <label>Fogyasztás ({showCalculator.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  value={calculatorConsumption}
                  onChange={(e) => setCalculatorConsumption(e.target.value)}
                  placeholder={`pl. 150 ${showCalculator.unit}`}
                />
                <button 
                  className="calculate-btn"
                  onClick={calculateUtilityCost}
                  disabled={calculatorLoading || !calculatorConsumption}
                >
                  {calculatorLoading ? '⏳ Számítás...' : '💰 Számítás'}
                </button>
              </div>
              
              {calculatorResult && (
                <div className="calculation-result">
                  <h4>Számított költség:</h4>
                  <div className="result-breakdown">
                    <div>Alapdíj: {calculatorResult.calculation.base_fee || 0} Ft</div>
                    <div>Fogyasztási díj: {calculatorResult.calculation.consumption_cost || 0} Ft</div>
                    {calculatorResult.calculation.system_usage_fee > 0 && (
                      <div>Rendszerhasználati díj: {calculatorResult.calculation.system_usage_fee} Ft</div>
                    )}
                    <div className="total-cost">
                      <strong>Összesen: {calculatorResult.total_cost} Ft</strong>
                    </div>
                    {calculatorResult.calculation.formula_description && (
                      <div className="formula">
                        <small>{calculatorResult.calculation.formula_description}</small>
                      </div>
                    )}
                  </div>
                  
                  {calculatorResult.calculation.breakdown && calculatorResult.calculation.breakdown.length > 0 && (
                    <div className="tier-breakdown">
                      <h5>Sávos bontás:</h5>
                      {calculatorResult.calculation.breakdown.map((tier, index) => (
                        <div key={index} className="tier-item">
                          <span>{tier.tier_name}: {tier.consumption} {tier.unit} × {tier.price_per_unit} Ft = {tier.tier_cost} Ft</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statisztikák modal */}
      {showStatistics && (
        <div className="modal-overlay" onClick={() => {
          console.log('📊 Closing statistics modal');
          setShowStatistics(false);
        }}>
          <div className="modal-content statistics-modal wide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 Költség Statisztikák</h3>
              <button className="close-btn" onClick={() => {
                console.log('📊 Closing statistics modal via X button');
                setShowStatistics(false);
              }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="statistics-content">
                <h4>💰 Kiadások Összesítése</h4>
                
                {/* Szűrők a modalban */}
                <div className="statistics-filters">
                  <div className="filter-group">
                    <label>Közmű típus:</label>
                    <select 
                      value={selectedUtilityType} 
                      onChange={(e) => setSelectedUtilityType(e.target.value)}
                    >
                      <option value="all">Összes</option>
                      {utilityTypes.map(type => (
                        <option key={type.id} value={type.name}>
                          {type.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="filter-group">
                    <label>Időszak:</label>
                    <select 
                      value={dateRange} 
                      onChange={(e) => setDateRange(e.target.value)}
                    >
                      <option value="1month">Utolsó 1 hónap</option>
                      <option value="3months">Utolsó 3 hónap</option>
                      <option value="6months">Utolsó 6 hónap</option>
                      <option value="1year">Utolsó 1 év</option>
                    </select>
                  </div>
                </div>

                {/* Statisztikák megjelenítése */}
                <div className="statistics-grid">
                  {statistics.length === 0 ? (
                    <div className="no-statistics">
                      <p>📊 Nincs elérhető statisztika a kiválasztott időszakra</p>
                    </div>
                  ) : (
                    statistics.map((stat, index) => (
                      <div key={index} className="statistic-card">
                        <div className="stat-header">
                          <span className="stat-icon">
                            {stat.utility_type === 'electricity' ? '⚡' : 
                             stat.utility_type === 'gas' ? '🔥' : 
                             stat.utility_type === 'water' ? '💧' : '🏠'}
                          </span>
                          <span className="stat-name">{stat.display_name}</span>
                        </div>
                        <div className="stat-values">
                          <div className="stat-item">
                            <span className="stat-label">Mérések száma:</span>
                            <span className="stat-value">{stat.reading_count} db</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Összes fogyasztás:</span>
                            <span className="stat-value">{stat.total_consumption} {stat.unit}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Összes költség:</span>
                            <span className="stat-value cost-highlight">
                              {!utilitySettingsLoaded ? (
                                '⏳ Betöltés...'
                              ) : stat.total_cost && utilitySettings.length > 0 ? (
                                utilitiesService.formatCost(Math.round(calculateStatTotalCost(stat)))
                              ) : stat.total_cost ? (
                                utilitiesService.formatCost(stat.total_cost)
                              ) : (
                                '0 Ft'
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Összesített költségek */}
                {statistics.length > 0 && (
                  <div className="total-costs-section">
                    <h4>📋 Összesített Költségek</h4>
                    <div className="total-cost-card">
                      <div className="cost-item">
                        <span className="cost-label">Közműköltségek összesen:</span>
                        <span className="cost-value">
                          {utilitiesService.formatCost(
                            statistics.reduce((total, stat) => {
                              return total + (utilitySettings.length > 0 ? 
                                Math.round(calculateStatTotalCost(stat)) : 
                                (parseFloat(stat.total_cost) || 0)
                              );
                            }, 0)
                          )}
                        </span>
                      </div>
                      <div className="cost-item">
                        <span className="cost-label">Háztartási közös költségek:</span>
                        <span className="cost-value">
                          {utilitiesService.formatCost(
                            (parseFloat(householdCosts.common_utility_cost) || 0) + 
                            (parseFloat(householdCosts.maintenance_cost) || 0) + 
                            (parseFloat(householdCosts.other_monthly_costs) || 0)
                          )}
                        </span>
                      </div>
                      <div className="cost-item">
                        <span className="cost-label">Lakbér összesen:</span>
                        <span className="cost-value">
                          {utilitiesService.formatCost(
                            (parseFloat(householdCosts.rent_amount) || 0) + 
                            (parseFloat(householdCosts.garage_rent) || 0) + 
                            (parseFloat(householdCosts.insurance_cost) || 0)
                          )}
                        </span>
                      </div>
                      <div className="cost-item total-cost">
                        <span className="cost-label">🏆 ÖSSZES KIADÁS:</span>
                        <span className="cost-value">
                          {utilitiesService.formatCost(
                            // Közműköltségek
                            statistics.reduce((total, stat) => {
                              return total + (utilitySettings.length > 0 ? 
                                Math.round(calculateStatTotalCost(stat)) : 
                                (parseFloat(stat.total_cost) || 0)
                              );
                            }, 0) +
                            // Háztartási költségek
                            (parseFloat(householdCosts.common_utility_cost) || 0) + 
                            (parseFloat(householdCosts.maintenance_cost) || 0) + 
                            (parseFloat(householdCosts.other_monthly_costs) || 0) +
                            // Lakbér költségek
                            (parseFloat(householdCosts.rent_amount) || 0) + 
                            (parseFloat(householdCosts.garage_rent) || 0) + 
                            (parseFloat(householdCosts.insurance_cost) || 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Utilities;
