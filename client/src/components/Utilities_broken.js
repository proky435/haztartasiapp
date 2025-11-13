import React, { useState, useEffect } from 'react';
import './Utilities.css';
import utilitiesService from '../services/utilitiesService';
import LoadingSpinner from './LoadingSpinner';
import ConfirmationModal from './ConfirmationModal';
import UtilitySettings from './UtilitySettings';

const Utilities = ({ currentHousehold }) => {
  // State kezelés
  const [utilityTypes, setUtilityTypes] = useState([]);
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

  // Komponens inicializálása
  useEffect(() => {
    if (currentHousehold?.id) {
      loadData();
    }
  }, [currentHousehold, selectedUtilityType, dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Adatok betöltése
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [utilitiesResponse, readingsResponse, costsResponse] = await Promise.all([
        utilitiesService.getUtilityTypes(),
        utilitiesService.getUtilityReadings(currentHousehold.id, {
          utility_type: selectedUtilityType !== 'all' ? selectedUtilityType : undefined,
          date_range: dateRange
        }),
        utilitiesService.getHouseholdCosts(currentHousehold.id).catch(() => ({ 
          data: { common_utility_cost: 0, maintenance_cost: 0, other_monthly_costs: 0 } 
        }))
      ]);

      setUtilityTypes(utilitiesResponse.data || utilitiesResponse);
      setReadings(readingsResponse?.data?.readings || readingsResponse?.readings || []);
      setStatistics(readingsResponse?.data?.statistics || readingsResponse?.statistics || []);
      
      const costsData = costsResponse?.data || costsResponse || {};
      setHouseholdCosts({
        common_utility_cost: costsData.common_utility_cost || 0,
        maintenance_cost: costsData.maintenance_cost || 0,
        other_monthly_costs: costsData.other_monthly_costs || 0
      });


    } catch (err) {
      console.error('Error loading utilities data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Form kezelés
  const handleFormChange = async (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Ha közműtípust változtatunk, automatikusan betöltjük az egységárat
    if (field === 'utility_type_id' && value) {
      try {
        const settings = await utilitiesService.getUtilitySettings(currentHousehold.id);
        const selectedUtility = settings.find(s => s.utility_type_id === value);
        if (selectedUtility && selectedUtility.current_unit_price) {
          setFormData(prev => ({
            ...prev,
            [field]: value,
            unit_price: selectedUtility.current_unit_price
          }));
        }
      } catch (error) {
        console.error('Error loading unit price:', error);
      }
    }
  };

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
      await loadData();
      
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
      utility_type_id: reading.utility_type_id || reading.utility_type,
      reading_date: reading.reading_date,
      meter_reading: reading.meter_reading.toString(),
      unit_price: reading.unit_price?.toString() || '',
      estimated: reading.estimated || false,
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
      await loadData();
      
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
      await loadData();
    } catch (err) {
      console.error('Error deleting reading:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
            onClick={() => setShowSettings(true)}
          >
            ⚙️ Beállítások
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
              <option key={type.id} value={type.id}>
                {type.icon} {type.display_name}
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
            <option value="1month">Utolsó hónap</option>
            <option value="3months">Utolsó 3 hónap</option>
            <option value="6months">Utolsó 6 hónap</option>
            <option value="1year">Utolsó év</option>
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

      {/* Statisztikák */}
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
                    {stat.total_cost ? 
                      utilitiesService.formatCost(stat.total_cost) : 
                      '0 Ft'
                    }
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
                <button className="add-reading-btn">
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
                  {utilitiesService.formatCost(householdCosts.rent_amount || 0)}/hó
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Garázs bérlet:</span>
                <span className="stat-value">
                  {utilitiesService.formatCost(householdCosts.garage_rent || 0)}/hó
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Biztosítás:</span>
                <span className="stat-value">
                  {utilitiesService.formatCost(householdCosts.insurance_cost || 0)}/hó
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Összes lakbér:</span>
                <span className="stat-value total-cost">
                  {utilitiesService.formatCost(
                    (householdCosts.rent_amount || 0) + 
                    (householdCosts.garage_rent || 0) + 
                    (householdCosts.insurance_cost || 0)
                  )}/hó
                </span>
              </div>
            </div>
            <div className="stat-actions">
              <button 
                className="settings-btn"
                onClick={() => setShowSettings(true)}
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
            onClick={() => setShowSettings(true)}
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
                        {reading.cost ? utilitiesService.formatCost(reading.cost) : '-'}
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
                  onChange={(e) => handleFormChange('utility_type_id', e.target.value)}
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
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content settings-modal">
            <div className="modal-header">
              <h3>⚙️ Közműbeállítások</h3>
              <button className="close-btn" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="modal-body">
              <UtilitySettings currentHousehold={currentHousehold} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Utilities;
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
            onClick={() => setShowSettings(true)}
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
                        {reading.icon} {reading.utility_display_name}
                      </span>
                    </td>
                    <td>
                      {parseFloat(reading.meter_reading || 0).toFixed(3)} {reading.unit}
                    </td>
                    <td>
                      {reading.consumption ? 
                        utilitiesService.formatConsumption(reading.consumption, reading.unit) : 
                        '-'
                      }
                    </td>
                    <td>
                      {reading.cost ? 
                        utilitiesService.formatCost(reading.cost) : 
                        '-'
                      }
                    </td>
                    <td>
                      {reading.notes && (
                        <span className="notes-preview" title={reading.notes}>
                          {reading.notes.substring(0, 30)}
                          {reading.notes.length > 30 && '...'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="reading-actions">
                        <button 
                          className="edit-btn"
                          onClick={() => handleEditReading(reading)}
                          title="Szerkesztés"
                        >
                          ✏️
                        </button>
                        <button 
                          className="delete-btn"
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

      {/* Új mérés / Szerkesztés modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingReading ? 'Mérés szerkesztése' : 'Új mérés rögzítése'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>✕</button>
            </div>
            
            <form onSubmit={editingReading ? handleUpdateReading : handleAddReading}>
              <div className="form-group">
                <label>Közmű típus *</label>
                <select 
                  value={formData.utility_type_id}
                  onChange={(e) => handleFormChange('utility_type_id', e.target.value)}
                  required
                  disabled={editingReading} // Szerkesztésnél nem változtatható
                >
                  <option value="">Válassz közműtípust</option>
                  {utilityTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.display_name} ({type.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Leolvasás dátuma *</label>
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
                  placeholder="pl. 1234.567"
                  required
                />
              </div>

              <div className="form-group">
                <label>Egységár (Ft) <span className="optional-label">(automatikusan kitöltve)</span></label>
                <input 
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => handleFormChange('unit_price', e.target.value)}
                  placeholder="Automatikusan betöltődik a beállításokból"
                />
              </div>

              <div className="form-group">
                <label>Számla szám</label>
                <input 
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => handleFormChange('invoice_number', e.target.value)}
                  placeholder="pl. SZ-2024-001234"
                />
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

              <div className="modal-actions">
                <button type="button" onClick={handleCloseModal}>
                  Mégse
                </button>
                <button type="submit" className="primary">
                  {editingReading ? 'Módosítás' : 'Rögzítés'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Törlés megerősítése */}
      <ConfirmationModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => handleDeleteReading(deleteConfirm?.id)}
        title="Mérés törlése"
        message={deleteConfirm ? `Biztosan törölni szeretnéd a ${utilitiesService.formatDate(deleteConfirm.reading_date)} dátumú mérést?` : ''}
        type="danger"
      />

      {/* Beállítások modal */}
      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-content settings-modal">
            <div className="modal-header">
              <h3>⚙️ Közműbeállítások</h3>
              <button className="close-btn" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="modal-body">
              <UtilitySettings currentHousehold={currentHousehold} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Utilities;
