import React, { useState, useEffect } from 'react';
import './Statistics.css';
import statisticsService from '../services/statisticsService';
import { getWasteStatistics } from '../services/consumptionService';

function Statistics({ currentHousehold }) {
  const now = new Date();
  const [timeRange, setTimeRange] = useState('month');
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    utilities: { total: 0, items: [], byType: {} },
    shopping: { total: 0, items: [] },
    otherExpenses: { total: 0, items: [] },
    rent: { total: 0, items: [] },
    summary: { utilities: 0, shopping: 0, otherExpenses: 0, rent: 0, total: 0 }
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedUtilityMonth, setSelectedUtilityMonth] = useState(null);
  const [showUtilityModal, setShowUtilityModal] = useState(false);
  const [wasteStats, setWasteStats] = useState(null);

  useEffect(() => {
    if (currentHousehold?.id) {
      loadStatistics();
      loadWasteStats();
    }
  }, [currentHousehold, timeRange, selectedYear, selectedMonth]);

  const loadWasteStats = async () => {
    if (!currentHousehold?.id) return;
    
    try {
      const months = timeRange === 'month' ? 1 : timeRange === 'year' ? 12 : 1;
      const stats = await getWasteStatistics(currentHousehold.id, months);
      setWasteStats(stats);
    } catch (error) {
      console.error('Error loading waste stats:', error);
    }
  };

  const loadStatistics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { range: timeRange };
      if (timeRange === 'month') {
        params.year = selectedYear;
        params.month = selectedMonth;
      } else if (timeRange === 'year') {
        params.year = selectedYear;
      }
      const data = await statisticsService.getStatistics(params);
      console.log('Statistics data received:', data);
      
      // Biztonságos adatstruktúra beállítása
      setStats({
        utilities: data?.utilities || { total: 0, items: [], byType: {} },
        shopping: data?.shopping || { total: 0, items: [] },
        otherExpenses: data?.otherExpenses || { total: 0, items: [] },
        rent: data?.rent || { total: 0, items: [] },
        summary: data?.summary || { utilities: 0, shopping: 0, otherExpenses: 0, rent: 0, total: 0 }
      });
    } catch (error) {
      console.error('Hiba a statisztikák betöltésekor:', error);
      setError('Nem sikerült betölteni a statisztikákat');
      // Üres adatok beállítása hiba esetén
      setStats({
        utilities: { total: 0, items: [], byType: {} },
        shopping: { total: 0, items: [] },
        otherExpenses: { total: 0, items: [] },
        rent: { total: 0, items: [] },
        summary: { utilities: 0, shopping: 0, otherExpenses: 0, rent: 0, total: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Bevásárlások csoportosítása dátum szerint
  const groupShoppingByDate = () => {
    const grouped = {};
    if (stats?.shopping?.items) {
      stats.shopping.items.forEach(item => {
        const dateKey = new Date(item.date).toISOString().split('T')[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = {
            date: item.date,
            items: [],
            total: 0
          };
        }
        grouped[dateKey].items.push(item);
        grouped[dateKey].total += item.amount;
      });
    }
    return Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const handleDateClick = (dateGroup) => {
    setSelectedDate(dateGroup);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDate(null);
  };

  // Közművek csoportosítása hónap szerint
  const groupUtilitiesByMonth = () => {
    const grouped = {};
    if (stats?.utilities?.items) {
      stats.utilities.items.forEach(item => {
        const date = new Date(item.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' });
        
        if (!grouped[monthKey]) {
          grouped[monthKey] = {
            monthKey,
            monthName,
            items: [],
            total: 0
          };
        }
        grouped[monthKey].items.push(item);
        grouped[monthKey].total += item.cost;
      });
    }
    return Object.values(grouped).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  };

  const handleUtilityMonthClick = (monthGroup) => {
    setSelectedUtilityMonth(monthGroup);
    setShowUtilityModal(true);
  };

  const closeUtilityModal = () => {
    setShowUtilityModal(false);
    setSelectedUtilityMonth(null);
  };

  if (loading) {
    return (
      <div className="statistics-container">
        <div className="loading">⏳ Betöltés...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="statistics-container">
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={loadStatistics} className="retry-btn">Újrapróbálás</button>
        </div>
      </div>
    );
  }

  const getTimeRangeLabel = () => {
    const monthNames = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június',
                        'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
    switch (timeRange) {
      case 'week': return 'Ez a hét';
      case 'month': return `${selectedYear}. ${monthNames[selectedMonth - 1]}`;
      case 'year': return `${selectedYear}. év`;
      default: return 'Ez a hónap';
    }
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= currentYear - 5; year--) {
      years.push(year);
    }
    return years;
  };

  const generateMonthOptions = () => {
    return [
      { value: 1, label: 'Január' },
      { value: 2, label: 'Február' },
      { value: 3, label: 'Március' },
      { value: 4, label: 'Április' },
      { value: 5, label: 'Május' },
      { value: 6, label: 'Június' },
      { value: 7, label: 'Július' },
      { value: 8, label: 'Augusztus' },
      { value: 9, label: 'Szeptember' },
      { value: 10, label: 'Október' },
      { value: 11, label: 'November' },
      { value: 12, label: 'December' }
    ];
  };

  return (
    <div className="statistics-container">
      <div className="statistics-header">
        <h2>📊 Kiadások Statisztikája</h2>
        <p>Háztartás: {currentHousehold?.name} • {getTimeRangeLabel()}</p>
      </div>

      <div className="time-range-selector">
        <button
          className={`range-btn ${timeRange === 'week' ? 'active' : ''}`}
          onClick={() => setTimeRange('week')}
        >
          Hét
        </button>
        <button
          className={`range-btn ${timeRange === 'month' ? 'active' : ''}`}
          onClick={() => setTimeRange('month')}
        >
          Hónap
        </button>
        <button
          className={`range-btn ${timeRange === 'year' ? 'active' : ''}`}
          onClick={() => setTimeRange('year')}
        >
          Év
        </button>
      </div>

      {timeRange === 'month' && (
        <div className="date-selector">
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="date-select"
          >
            {generateYearOptions().map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="date-select"
          >
            {generateMonthOptions().map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
        </div>
      )}

      {timeRange === 'year' && (
        <div className="date-selector">
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="date-select"
          >
            {generateYearOptions().map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      )}

      <div className="summary-cards">
        <div className="summary-card rent">
          <div className="card-icon">🏠</div>
          <div className="card-content">
            <h3>Lakbér</h3>
            <p className="amount">{formatCurrency(stats?.summary?.rent || 0)}</p>
          </div>
        </div>

        <div className="summary-card utilities">
          <div className="card-icon">🔌</div>
          <div className="card-content">
            <h3>Közművek</h3>
            <p className="amount">{formatCurrency(stats?.summary?.utilities || 0)}</p>
          </div>
        </div>

        <div className="summary-card shopping">
          <div className="card-icon">🛒</div>
          <div className="card-content">
            <h3>Bevásárlás</h3>
            <p className="amount">{formatCurrency(stats?.summary?.shopping || 0)}</p>
          </div>
        </div>

        <div className="summary-card other-expenses">
          <div className="card-icon">💳</div>
          <div className="card-content">
            <h3>Egyéb költségek</h3>
            <p className="amount">{formatCurrency(stats?.summary?.otherExpenses || 0)}</p>
          </div>
        </div>

        <div className="summary-card total">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>Összes kiadás</h3>
            <p className="amount">{formatCurrency(stats?.summary?.total || 0)}</p>
          </div>
        </div>
      </div>

      <div className="details-section">
        <div className="detail-card">
          <h3>🔌 Közművek részletesen</h3>
          <div className="items-list">
            {groupUtilitiesByMonth().length > 0 ? (
              groupUtilitiesByMonth().map((monthGroup, index) => (
                <div 
                  key={index} 
                  className="item-row clickable"
                  onClick={() => handleUtilityMonthClick(monthGroup)}
                >
                  <div className="item-info">
                    <span className="item-name">
                      {monthGroup.monthName}
                    </span>
                    <span className="item-date">
                      {monthGroup.items.length} tétel
                    </span>
                  </div>
                  <span className="item-amount">{formatCurrency(monthGroup.total)}</span>
                </div>
              ))
            ) : (
              <p className="no-data">Nincs közműadat ebben az időszakban</p>
            )}
          </div>
          <div className="total-row">
            <span>Összesen:</span>
            <span className="total-amount">{formatCurrency(stats?.summary?.utilities || 0)}</span>
          </div>
        </div>

        <div className="detail-card">
          <h3>🛒 Bevásárlás részletesen</h3>
          <div className="items-list">
            {groupShoppingByDate().length > 0 ? (
              groupShoppingByDate().map((dateGroup, index) => (
                <div 
                  key={index} 
                  className="item-row clickable"
                  onClick={() => handleDateClick(dateGroup)}
                >
                  <div className="item-info">
                    <span className="item-name">{formatDate(dateGroup.date)}</span>
                    <span className="item-date">
                      {dateGroup.items.length} termék
                    </span>
                  </div>
                  <span className="item-amount">{formatCurrency(dateGroup.total)}</span>
                </div>
              ))
            ) : (
              <p className="no-data">Nincs bevásárlási adat ebben az időszakban</p>
            )}
          </div>
          <div className="total-row">
            <span>Összesen:</span>
            <span className="total-amount">{formatCurrency(stats?.summary?.shopping || 0)}</span>
          </div>
        </div>

        <div className="detail-card">
          <h3>💳 Egyéb költségek részletesen</h3>
          <div className="items-list">
            {stats?.otherExpenses?.items?.length > 0 ? (
              stats.otherExpenses.items.map((item, index) => (
                <div key={index} className="item-row">
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    {item.category && (
                      <span className="item-date">{item.category}</span>
                    )}
                  </div>
                  <span className="item-amount">{formatCurrency(item.amount)}</span>
                </div>
              ))
            ) : (
              <p className="no-data">Nincs egyéb költség ebben az időszakban</p>
            )}
          </div>
          <div className="total-row">
            <span>Összesen:</span>
            <span className="total-amount">{formatCurrency(stats?.summary?.otherExpenses || 0)}</span>
          </div>
        </div>

        <div className="detail-card">
          <h3>🏠 Lakbér részletesen</h3>
          <div className="items-list">
            {stats?.rent?.items?.length > 0 ? (
              stats.rent.items.map((item, index) => (
                <div key={index} className="item-row">
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                  </div>
                  <span className="item-amount">{formatCurrency(item.amount)}</span>
                </div>
              ))
            ) : (
              <p className="no-data">Nincs lakbér költség</p>
            )}
          </div>
          <div className="total-row">
            <span>Összesen:</span>
            <span className="total-amount">{formatCurrency(stats?.summary?.rent || 0)}</span>
          </div>
        </div>
      </div>

      {/* Modal a bevásárlás részletekhez */}
      {showModal && selectedDate && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🛒 Bevásárlás - {formatDate(selectedDate.date)}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              {selectedDate.items.map((item, index) => (
                <div key={index} className="modal-item-row">
                  <div className="modal-item-info">
                    <span className="modal-item-name">{item.name}</span>
                    <span className="modal-item-details">
                      {item.quantity} db × {formatCurrency(item.price)}
                    </span>
                  </div>
                  <span className="modal-item-amount">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <div className="modal-total">
                <span>Összesen:</span>
                <span className="modal-total-amount">{formatCurrency(selectedDate.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal a közművek részletekhez */}
      {showUtilityModal && selectedUtilityMonth && (
        <div className="modal-overlay" onClick={closeUtilityModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔌 Közművek - {selectedUtilityMonth.monthName}</h3>
              <button className="modal-close" onClick={closeUtilityModal}>×</button>
            </div>
            <div className="modal-body">
              {selectedUtilityMonth.items.map((item, index) => (
                <div key={index} className="modal-item-row">
                  <div className="modal-item-info">
                    <span className="modal-item-name">{item.icon} {item.type}</span>
                    <span className="modal-item-details">
                      {formatDate(item.date)} • {item.value} egység
                    </span>
                  </div>
                  <span className="modal-item-amount">{formatCurrency(item.cost)}</span>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <div className="modal-total">
                <span>Összesen:</span>
                <span className="modal-total-amount">{formatCurrency(selectedUtilityMonth.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pazarlás Statisztika */}
      {wasteStats && wasteStats.status === 'success' && (
        <div className="waste-stats-section">
          <h3>🗑️ Pazarlás Statisztika ({timeRange === 'month' ? 'Elmúlt Hónap' : 'Elmúlt Év'})</h3>
          <div className="waste-summary-grid">
            <div className="waste-card waste-total">
              <div className="waste-card-icon">🗑️</div>
              <div className="waste-card-content">
                <div className="waste-card-label">Lejárt/Megromlott</div>
                <div className="waste-card-value">{wasteStats.totalWasted} db</div>
              </div>
            </div>
            <div className="waste-card waste-percentage">
              <div className="waste-card-icon">📊</div>
              <div className="waste-card-content">
                <div className="waste-card-label">Pazarlási Arány</div>
                <div className="waste-card-value">{wasteStats.wastePercentage}%</div>
              </div>
            </div>
            <div className="waste-card waste-consumed">
              <div className="waste-card-icon">✅</div>
              <div className="waste-card-content">
                <div className="waste-card-label">Felhasznált</div>
                <div className="waste-card-value">{wasteStats.totalConsumed} db</div>
              </div>
            </div>
          </div>
          
          {wasteStats.wasteItems && wasteStats.wasteItems.length > 0 && (
            <div className="waste-items-list">
              <h4>Top Lejárt Termékek:</h4>
              <div className="waste-items">
                {wasteStats.wasteItems.slice(0, 5).map((item, index) => (
                  <div key={index} className="waste-item-row">
                    <span className="waste-item-name">
                      {index + 1}. {item.productName}
                    </span>
                    <span className="waste-item-details">
                      {item.count}x ({item.totalQuantity} {item.unit})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {stats?.utilities?.byType && Object.keys(stats.utilities.byType).length > 0 && (
        <div className="utility-types-section">
          <h3>📊 Közművek típusonként</h3>
          <div className="utility-types-grid">
            {Object.entries(stats.utilities.byType).map(([typeId, data]) => (
              <div key={typeId} className="utility-type-card">
                <div className="utility-type-header">
                  <span className="utility-type-icon">{data.icon}</span>
                  <span className="utility-type-name">{data.name}</span>
                </div>
                <div className="utility-type-amount">{formatCurrency(data.total)}</div>
                <div className="utility-type-count">{data.items.length} leolvasás</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Statistics;
