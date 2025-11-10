import React, { useState, useEffect } from 'react';
import './Utilities.css';
import utilitiesService from '../services/utilitiesService';
import LoadingSpinner from './LoadingSpinner';
import ConfirmationModal from './ConfirmationModal';

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
    if (currentHousehold) {
      loadData();
    }
  }, [currentHousehold, selectedUtilityType, dateRange]);

  // Adatok betöltése
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Közműtípusok betöltése
      const types = await utilitiesService.getUtilityTypes();
      setUtilityTypes(types);

      // Fogyasztási adatok betöltése
      const filters = {};
      
      if (selectedUtilityType !== 'all') {
        filters.utility_type_id = selectedUtilityType;
      }

      // Dátum szűrő
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '1month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case '1year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 3);
      }

      filters.start_date = startDate.toISOString().split('T')[0];
      filters.end_date = endDate.toISOString().split('T')[0];

      const data = await utilitiesService.getUtilities(currentHousehold.id, filters);
      setReadings(data.readings || []);
      setStatistics(data.statistics || []);

    } catch (err) {
      console.error('Error loading utilities data:', err);
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
        <div className="header-right">
          <button 
            className="add-reading-btn"
            onClick={() => setShowAddModal(true)}
          >
            + Új Mérés
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
                    {utilitiesService.formatConsumption(stat.total_consumption, stat.unit)}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Összes költség:</span>
                  <span className="stat-value">
                    {utilitiesService.formatCost(stat.total_cost)}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Átlagos havi:</span>
                  <span className="stat-value">
                    {utilitiesService.formatConsumption(stat.avg_consumption, stat.unit)}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Utolsó mérés:</span>
                  <span className="stat-value">
                    {stat.last_reading_date ? utilitiesService.formatDate(stat.last_reading_date) : 'Nincs adat'}
                  </span>
                </div>
              </div>
            </div>
          ))}
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
                <label>Egységár (Ft)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => handleFormChange('unit_price', e.target.value)}
                  placeholder="pl. 580.50"
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
      {deleteConfirm && (
        <ConfirmationModal
          title="Mérés törlése"
          message={`Biztosan törölni szeretnéd a ${utilitiesService.formatDate(deleteConfirm.reading_date)} dátumú mérést?`}
          onConfirm={() => handleDeleteReading(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

export default Utilities;
