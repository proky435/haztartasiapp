import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import inventoryService from '../services/inventoryService';
import shoppingListService from '../services/shoppingListService';
import statisticsService from '../services/statisticsService';
import { getWasteStatistics } from '../services/consumptionService';

function Dashboard({ currentHousehold, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    inventory: {
      total: 0,
      expiringSoon: 0,
      lowStock: 0,
      expired: 0
    },
    shopping: {
      total: 0,
      pending: 0
    },
    expenses: {
      monthly: 0,
      utilities: 0,
      shopping: 0,
      other: 0
    },
    waste: {
      itemsThisMonth: 0,
      valueThisMonth: 0,
      trend: 0
    }
  });

  useEffect(() => {
    if (currentHousehold?.id) {
      loadDashboardData();
    }
  }, [currentHousehold]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Párhuzamos adatlekérések
      const [inventoryData, shoppingData, statsData, wasteData] = await Promise.all([
        loadInventoryStats(),
        loadShoppingStats(),
        loadExpenseStats(),
        loadWasteStats()
      ]);

      setDashboardData({
        inventory: inventoryData,
        shopping: shoppingData,
        expenses: statsData,
        waste: wasteData
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryStats = async () => {
    try {
      const inventory = await inventoryService.getCurrentHouseholdInventory();
      const items = inventory.items || [];
      
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      
      let expiringSoon = 0;
      let expired = 0;
      let lowStock = 0;

      items.forEach(item => {
        const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
        
        if (expiryDate) {
          if (expiryDate < now) {
            expired++;
          } else if (expiryDate <= threeDaysFromNow) {
            expiringSoon++;
          }
        }

        if (item.quantity <= (item.minQuantity || 1)) {
          lowStock++;
        }
      });

      return {
        total: items.length,
        expiringSoon,
        lowStock,
        expired
      };
    } catch (error) {
      console.error('Error loading inventory stats:', error);
      return { total: 0, expiringSoon: 0, lowStock: 0, expired: 0 };
    }
  };

  const loadShoppingStats = async () => {
    try {
      const items = await shoppingListService.getDefaultListItems();
      const pending = items.filter(item => !item.purchased).length;
      
      return {
        total: items.length,
        pending
      };
    } catch (error) {
      console.error('Error loading shopping stats:', error);
      return { total: 0, pending: 0 };
    }
  };

  const loadExpenseStats = async () => {
    try {
      const now = new Date();
      const stats = await statisticsService.getStatistics({
        range: 'month',
        year: now.getFullYear(),
        month: now.getMonth() + 1
      });

      return {
        monthly: stats.summary?.total || 0,
        utilities: stats.summary?.utilities || 0,
        shopping: stats.summary?.shopping || 0,
        other: stats.summary?.otherExpenses || 0
      };
    } catch (error) {
      console.error('Error loading expense stats:', error);
      return { monthly: 0, utilities: 0, shopping: 0, other: 0 };
    }
  };

  const loadWasteStats = async () => {
    try {
      const stats = await getWasteStatistics(currentHousehold.id, 1);
      
      return {
        itemsThisMonth: stats.totalItems || 0,
        valueThisMonth: stats.totalValue || 0,
        trend: stats.trend || 0
      };
    } catch (error) {
      console.error('Error loading waste stats:', error);
      return { itemsThisMonth: 0, valueThisMonth: 0, trend: 0 };
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Dashboard betöltése...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>🏠 Háztartási Áttekintő</h2>
        <p className="dashboard-subtitle">
          {currentHousehold?.name || 'Háztartás'} - {new Date().toLocaleDateString('hu-HU', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      <div className="dashboard-grid">
        {/* Készlet Widget */}
        <div className="dashboard-card inventory-card" onClick={() => onNavigate('inventory')}>
          <div className="card-header">
            <span className="card-icon">📦</span>
            <h3>Készlet</h3>
          </div>
          <div className="card-content">
            <div className="stat-main">
              <span className="stat-value">{dashboardData.inventory.total}</span>
              <span className="stat-label">termék</span>
            </div>
            <div className="stat-details">
              {dashboardData.inventory.expired > 0 && (
                <div className="stat-item danger">
                  <span className="stat-icon">❌</span>
                  <span>{dashboardData.inventory.expired} lejárt</span>
                </div>
              )}
              {dashboardData.inventory.expiringSoon > 0 && (
                <div className="stat-item warning">
                  <span className="stat-icon">⚠️</span>
                  <span>{dashboardData.inventory.expiringSoon} hamarosan lejár</span>
                </div>
              )}
              {dashboardData.inventory.lowStock > 0 && (
                <div className="stat-item info">
                  <span className="stat-icon">🔴</span>
                  <span>{dashboardData.inventory.lowStock} alacsony készlet</span>
                </div>
              )}
              {dashboardData.inventory.expired === 0 && 
               dashboardData.inventory.expiringSoon === 0 && 
               dashboardData.inventory.lowStock === 0 && (
                <div className="stat-item success">
                  <span className="stat-icon">✅</span>
                  <span>Minden rendben</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bevásárlólista Widget */}
        <div className="dashboard-card shopping-card" onClick={() => onNavigate('shopping')}>
          <div className="card-header">
            <span className="card-icon">🛒</span>
            <h3>Bevásárlólista</h3>
          </div>
          <div className="card-content">
            <div className="stat-main">
              <span className="stat-value">{dashboardData.shopping.pending}</span>
              <span className="stat-label">termék vár</span>
            </div>
            {dashboardData.shopping.pending > 0 ? (
              <div className="stat-details">
                <div className="stat-item info">
                  <span className="stat-icon">📝</span>
                  <span>Bevásárlás szükséges</span>
                </div>
              </div>
            ) : (
              <div className="stat-details">
                <div className="stat-item success">
                  <span className="stat-icon">✅</span>
                  <span>Lista üres</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Havi Költségek Widget */}
        <div className="dashboard-card expenses-card" onClick={() => onNavigate('statistics')}>
          <div className="card-header">
            <span className="card-icon">💰</span>
            <h3>Havi Költségek</h3>
          </div>
          <div className="card-content">
            <div className="stat-main">
              <span className="stat-value">{formatCurrency(dashboardData.expenses.monthly)}</span>
              <span className="stat-label">összesen</span>
            </div>
            <div className="stat-details">
              <div className="stat-breakdown">
                <div className="breakdown-item">
                  <span className="breakdown-label">⚡ Közművek</span>
                  <span className="breakdown-value">{formatCurrency(dashboardData.expenses.utilities)}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">🛒 Bevásárlás</span>
                  <span className="breakdown-value">{formatCurrency(dashboardData.expenses.shopping)}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">🎯 Egyéb</span>
                  <span className="breakdown-value">{formatCurrency(dashboardData.expenses.other)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pazarlás Tracker Widget */}
        <div className="dashboard-card waste-card" onClick={() => onNavigate('statistics')}>
          <div className="card-header">
            <span className="card-icon">🗑️</span>
            <h3>Pazarlás</h3>
          </div>
          <div className="card-content">
            <div className="stat-main">
              <span className="stat-value">{dashboardData.waste.itemsThisMonth}</span>
              <span className="stat-label">termék kidobva</span>
            </div>
            <div className="stat-details">
              <div className="stat-item">
                <span className="stat-icon">💸</span>
                <span>Érték: {formatCurrency(dashboardData.waste.valueThisMonth)}</span>
              </div>
              {dashboardData.waste.trend !== 0 && (
                <div className={`stat-item ${dashboardData.waste.trend < 0 ? 'success' : 'warning'}`}>
                  <span className="stat-icon">{dashboardData.waste.trend < 0 ? '📉' : '📈'}</span>
                  <span>
                    {Math.abs(dashboardData.waste.trend)}% 
                    {dashboardData.waste.trend < 0 ? ' csökkenés' : ' növekedés'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tippek és Javaslatok */}
      {(dashboardData.inventory.expiringSoon > 0 || dashboardData.inventory.lowStock > 0) && (
        <div className="dashboard-tips">
          <h3>💡 Javaslatok</h3>
          <div className="tips-list">
            {dashboardData.inventory.expiringSoon > 0 && (
              <div className="tip-item warning">
                <span className="tip-icon">⚠️</span>
                <div className="tip-content">
                  <strong>Hamarosan lejáró termékek!</strong>
                  <p>{dashboardData.inventory.expiringSoon} termék 3 napon belül lejár. Használd fel őket mielőbb!</p>
                </div>
              </div>
            )}
            {dashboardData.inventory.lowStock > 0 && (
              <div className="tip-item info">
                <span className="tip-icon">🔴</span>
                <div className="tip-content">
                  <strong>Alacsony készlet!</strong>
                  <p>{dashboardData.inventory.lowStock} termék készlete alacsony. Érdemes utánpótolni.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
