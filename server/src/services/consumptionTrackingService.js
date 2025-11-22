const { query } = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Consumption Tracking Service
 * Fogyasztási statisztikák és előrejelzések
 */

/**
 * Ellenőrzi, hogy a tracking engedélyezve van-e a háztartásban
 */
async function isTrackingEnabled(householdId) {
  try {
    const result = await query(`
      SELECT 
        consumption_tracking_enabled,
        shopping_pattern_analysis_enabled,
        auto_suggestions_enabled,
        consumption_tracking_settings
      FROM household_settings
      WHERE household_id = $1
    `, [householdId]);

    if (result.rows.length === 0) {
      // Ha nincs beállítás, alapértelmezett: enabled
      return {
        consumptionTracking: true,
        shoppingPattern: true,
        autoSuggestions: true,
        settings: {
          min_data_points: 5,
          history_months: 6,
          confidence_threshold: 'medium'
        }
      };
    }

    const settings = result.rows[0];
    return {
      consumptionTracking: settings.consumption_tracking_enabled,
      shoppingPattern: settings.shopping_pattern_analysis_enabled,
      autoSuggestions: settings.auto_suggestions_enabled,
      settings: settings.consumption_tracking_settings || {
        min_data_points: 5,
        history_months: 6,
        confidence_threshold: 'medium'
      }
    };
  } catch (error) {
    logger.error('Error checking tracking settings:', error);
    return {
      consumptionTracking: true,
      shoppingPattern: true,
      autoSuggestions: true,
      settings: { min_data_points: 5, history_months: 6 }
    };
  }
}

/**
 * Inventory alapú fogyasztási statisztika
 * Használja az inventory_changes táblát
 */
async function getInventoryConsumptionStats(householdId, productMasterId, customName = null) {
  try {
    const trackingSettings = await isTrackingEnabled(householdId);
    
    if (!trackingSettings.consumptionTracking) {
      return { 
        status: 'disabled',
        message: 'Consumption tracking kikapcsolva a beállításokban' 
      };
    }

    const { min_data_points, history_months } = trackingSettings.settings;

    // Lekérjük a fogyasztási változásokat
    const result = await query(`
      SELECT 
        ic.created_at,
        ic.old_quantity,
        ic.new_quantity,
        ic.quantity_change,
        hi.unit,
        EXTRACT(EPOCH FROM (
          ic.created_at - LAG(ic.created_at) OVER (
            PARTITION BY hi.product_master_id, hi.custom_name 
            ORDER BY ic.created_at
          )
        )) / 86400 as days_since_last_change
      FROM inventory_changes ic
      JOIN household_inventory hi ON ic.household_inventory_id = hi.id
      WHERE 
        hi.household_id = $1
        AND (
          ($2::UUID IS NOT NULL AND hi.product_master_id = $2)
          OR ($3::VARCHAR IS NOT NULL AND hi.custom_name = $3)
        )
        AND ic.change_type IN ('consume', 'update')
        AND ic.quantity_change < 0
        AND ic.created_at >= NOW() - INTERVAL '${history_months} months'
      ORDER BY ic.created_at DESC
      LIMIT 50
    `, [householdId, productMasterId, customName]);

    const changes = result.rows;

    if (changes.length < min_data_points) {
      return { 
        status: 'insufficient_data',
        message: `Legalább ${min_data_points} fogyasztási adat szükséges`,
        currentCount: changes.length,
        requiredCount: min_data_points
      };
    }

    // Átlag számítás: hány nap alatt fogy el 1 egység
    const validChanges = changes.filter(c => c.days_since_last_change > 0 && c.days_since_last_change < 365);
    
    if (validChanges.length === 0) {
      return {
        status: 'insufficient_data',
        message: 'Nincs elég érvényes adat az átlag számításához'
      };
    }

    const avgDaysPerUnit = validChanges.reduce((sum, change) => {
      const unitsConsumed = Math.abs(change.quantity_change);
      const daysPerUnit = change.days_since_last_change / unitsConsumed;
      return sum + daysPerUnit;
    }, 0) / validChanges.length;

    // Konfidencia szint
    let confidence = 'low';
    if (validChanges.length >= 10) confidence = 'high';
    else if (validChanges.length >= 5) confidence = 'medium';

    return {
      status: 'success',
      avgDaysPerUnit: Math.round(avgDaysPerUnit * 10) / 10,
      unit: changes[0].unit,
      dataPoints: validChanges.length,
      confidence,
      lastChange: changes[0].created_at,
      method: 'inventory_tracking'
    };

  } catch (error) {
    logger.error('Error calculating inventory consumption stats:', error);
    throw error;
  }
}

/**
 * Shopping pattern alapú statisztika
 * Használja a shopping_list_item_history táblát
 */
async function getShoppingPatternStats(householdId, productMasterId, customName = null) {
  try {
    const trackingSettings = await isTrackingEnabled(householdId);
    
    if (!trackingSettings.shoppingPattern) {
      return { 
        status: 'disabled',
        message: 'Shopping pattern analysis kikapcsolva' 
      };
    }

    const result = await query(`
      SELECT 
        added_to_list_date,
        completed_date,
        quantity,
        unit,
        EXTRACT(DOW FROM added_to_list_date) as day_of_week,
        EXTRACT(EPOCH FROM (
          added_to_list_date - LAG(added_to_list_date) OVER (ORDER BY added_to_list_date)
        )) / 86400 as days_since_last_purchase
      FROM shopping_list_item_history
      WHERE 
        household_id = $1
        AND (
          ($2::UUID IS NOT NULL AND product_master_id = $2)
          OR ($3::VARCHAR IS NOT NULL AND custom_name = $3)
        )
        AND added_to_list_date >= NOW() - INTERVAL '3 months'
      ORDER BY added_to_list_date DESC
      LIMIT 30
    `, [householdId, productMasterId, customName]);

    const history = result.rows;

    if (history.length < 3) {
      return { 
        status: 'insufficient_data',
        message: 'Legalább 3 vásárlási adat szükséges',
        currentCount: history.length
      };
    }

    // Leggyakoribb nap elemzése
    const dayFrequency = {};
    const dayNames = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
    
    history.forEach(h => {
      const day = parseInt(h.day_of_week);
      dayFrequency[day] = (dayFrequency[day] || 0) + 1;
    });

    const mostFrequentDayEntry = Object.entries(dayFrequency)
      .sort((a, b) => b[1] - a[1])[0];
    
    const mostFrequentDay = parseInt(mostFrequentDayEntry[0]);
    const dayFrequencyCount = mostFrequentDayEntry[1];

    // Átlagos vásárlási gyakoriság
    const validPurchases = history.filter(h => h.days_since_last_purchase > 0 && h.days_since_last_purchase < 90);
    
    const avgDaysBetweenPurchases = validPurchases.length > 0
      ? validPurchases.reduce((sum, h) => sum + h.days_since_last_purchase, 0) / validPurchases.length
      : null;

    // Konfidencia
    let confidence = 'low';
    if (dayFrequencyCount >= 4) confidence = 'high';
    else if (dayFrequencyCount >= 3) confidence = 'medium';

    return {
      status: 'success',
      mostFrequentDay,
      mostFrequentDayName: dayNames[mostFrequentDay],
      dayFrequency: dayFrequencyCount,
      avgDaysBetweenPurchases: avgDaysBetweenPurchases ? Math.round(avgDaysBetweenPurchases * 10) / 10 : null,
      totalPurchases: history.length,
      confidence,
      method: 'shopping_pattern'
    };

  } catch (error) {
    logger.error('Error calculating shopping pattern stats:', error);
    throw error;
  }
}

/**
 * Kombinált statisztika és előrejelzés
 * Mindkét módszert használja és keresztellenőrzi
 */
async function getCombinedConsumptionStats(householdId, productMasterId, customName = null) {
  try {
    const [inventoryStats, shoppingStats] = await Promise.all([
      getInventoryConsumptionStats(householdId, productMasterId, customName),
      getShoppingPatternStats(householdId, productMasterId, customName)
    ]);

    // Ha mindkettő sikeres, kombinált eredmény
    if (inventoryStats.status === 'success' && shoppingStats.status === 'success') {
      return {
        status: 'success',
        type: 'combined',
        inventory: {
          avgDaysPerUnit: inventoryStats.avgDaysPerUnit,
          dataPoints: inventoryStats.dataPoints,
          confidence: inventoryStats.confidence
        },
        shopping: {
          avgDaysBetweenPurchases: shoppingStats.avgDaysBetweenPurchases,
          mostFrequentDay: shoppingStats.mostFrequentDayName,
          dayFrequency: shoppingStats.dayFrequency,
          confidence: shoppingStats.confidence
        },
        overallConfidence: 
          inventoryStats.confidence === 'high' && shoppingStats.confidence === 'high' 
            ? 'high' 
            : 'medium',
        unit: inventoryStats.unit
      };
    }

    // Ha csak egyik sikeres
    if (inventoryStats.status === 'success') {
      return { ...inventoryStats, type: 'inventory_only' };
    }
    
    if (shoppingStats.status === 'success') {
      return { ...shoppingStats, type: 'shopping_only' };
    }

    // Ha egyik sem sikeres
    return {
      status: 'insufficient_data',
      message: 'Nincs elég adat egyik módszerhez sem',
      inventory: inventoryStats,
      shopping: shoppingStats
    };

  } catch (error) {
    logger.error('Error calculating combined consumption stats:', error);
    throw error;
  }
}

/**
 * Előrejelzés: mikor fog elfogyni a jelenlegi készlet
 */
async function predictStockDepletion(householdId, inventoryItemId) {
  try {
    // Lekérjük a jelenlegi készlet adatokat
    const inventoryResult = await query(`
      SELECT 
        hi.id,
        hi.product_master_id,
        hi.custom_name,
        hi.quantity,
        hi.unit,
        hi.last_quantity_change
      FROM household_inventory hi
      WHERE hi.id = $1 AND hi.household_id = $2
    `, [inventoryItemId, householdId]);

    if (inventoryResult.rows.length === 0) {
      return { status: 'not_found', message: 'Készlet tétel nem található' };
    }

    const item = inventoryResult.rows[0];

    if (item.quantity <= 0) {
      return { 
        status: 'already_empty', 
        message: 'A készlet már üres',
        currentQuantity: 0
      };
    }

    // Fogyasztási statisztika lekérése
    const stats = await getCombinedConsumptionStats(
      householdId, 
      item.product_master_id, 
      item.custom_name
    );

    if (stats.status !== 'success') {
      return {
        status: 'insufficient_data',
        message: 'Nincs elég adat az előrejelzéshez',
        currentQuantity: parseFloat(item.quantity),
        unit: item.unit
      };
    }

    // Számítás: inventory alapú
    let daysUntilEmpty = null;
    let method = null;

    if (stats.type === 'combined' || stats.type === 'inventory_only') {
      const avgDaysPerUnit = stats.inventory?.avgDaysPerUnit || stats.avgDaysPerUnit;
      daysUntilEmpty = item.quantity * avgDaysPerUnit;
      method = 'inventory';
    } else if (stats.type === 'shopping_only') {
      // Shopping pattern alapján becsülünk
      daysUntilEmpty = stats.avgDaysBetweenPurchases;
      method = 'shopping_pattern';
    }

    if (!daysUntilEmpty) {
      return {
        status: 'calculation_error',
        message: 'Nem sikerült kiszámítani az előrejelzést'
      };
    }

    const predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + Math.floor(daysUntilEmpty));

    return {
      status: 'success',
      currentQuantity: parseFloat(item.quantity),
      unit: item.unit,
      daysUntilEmpty: Math.round(daysUntilEmpty * 10) / 10,
      predictedEmptyDate: predictedDate.toISOString(),
      confidence: stats.overallConfidence || stats.confidence,
      method,
      stats
    };

  } catch (error) {
    logger.error('Error predicting stock depletion:', error);
    throw error;
  }
}

/**
 * Automatikus javaslatok generálása
 * Low stock predictions alapján
 */
async function generateAutoSuggestions(householdId) {
  try {
    const trackingSettings = await isTrackingEnabled(householdId);
    
    if (!trackingSettings.autoSuggestions) {
      return { 
        status: 'disabled',
        message: 'Auto suggestions kikapcsolva',
        suggestions: []
      };
    }

    // Lekérjük az összes készlet tételt
    const inventoryResult = await query(`
      SELECT 
        hi.id,
        hi.product_master_id,
        hi.custom_name,
        hi.quantity,
        hi.unit,
        pm.name as product_name,
        pm.brand
      FROM household_inventory hi
      LEFT JOIN products_master pm ON hi.product_master_id = pm.id
      WHERE hi.household_id = $1 AND hi.quantity > 0
    `, [householdId]);

    const suggestions = [];

    // Minden termékre előrejelzés
    for (const item of inventoryResult.rows) {
      const prediction = await predictStockDepletion(householdId, item.id);
      
      // 7 napon belül elfogyó termékek javaslata
      if (prediction.status === 'success' && prediction.daysUntilEmpty <= 7) {
        suggestions.push({
          productMasterId: item.product_master_id,
          productName: item.product_name || item.custom_name,
          brand: item.brand,
          reason: 'low_stock_prediction',
          daysUntilEmpty: prediction.daysUntilEmpty,
          predictedDate: prediction.predictedEmptyDate,
          confidence: prediction.confidence,
          currentQuantity: prediction.currentQuantity,
          unit: prediction.unit,
          suggestedQuantity: 1,
          message: `${prediction.daysUntilEmpty < 1 ? 'Ma' : Math.floor(prediction.daysUntilEmpty) + ' nap múlva'} elfogyhat`
        });
      }
    }

    return {
      status: 'success',
      suggestions,
      count: suggestions.length
    };

  } catch (error) {
    logger.error('Error generating auto suggestions:', error);
    throw error;
  }
}

/**
 * Pazarlás statisztika
 * Lejárt/megromlott termékek tracking
 */
async function getWasteStatistics(householdId, periodMonths = 1) {
  try {
    const result = await query(`
      SELECT 
        ic.change_type,
        COUNT(*) as count,
        SUM(ABS(ic.quantity_change)) as total_quantity,
        hi.unit,
        pm.name as product_name,
        hi.custom_name
      FROM inventory_changes ic
      JOIN household_inventory hi ON ic.household_inventory_id = hi.id
      LEFT JOIN products_master pm ON hi.product_master_id = pm.id
      WHERE 
        hi.household_id = $1
        AND ic.change_type IN ('expire', 'remove')
        AND ic.created_at >= NOW() - INTERVAL '${periodMonths} months'
      GROUP BY ic.change_type, hi.unit, pm.name, hi.custom_name
      ORDER BY count DESC
    `, [householdId]);

    const totalUsed = await query(`
      SELECT COUNT(*) as count
      FROM inventory_changes ic
      JOIN household_inventory hi ON ic.household_inventory_id = hi.id
      WHERE 
        hi.household_id = $1
        AND ic.change_type = 'consume'
        AND ic.created_at >= NOW() - INTERVAL '${periodMonths} months'
    `, [householdId]);

    const wasteItems = result.rows;
    const totalWasted = wasteItems.reduce((sum, item) => sum + parseInt(item.count), 0);
    const totalConsumed = parseInt(totalUsed.rows[0]?.count || 0);
    const wastePercentage = totalConsumed > 0 
      ? Math.round((totalWasted / (totalWasted + totalConsumed)) * 100 * 10) / 10
      : 0;

    return {
      status: 'success',
      periodMonths,
      totalWasted,
      totalConsumed,
      wastePercentage,
      wasteItems: wasteItems.map(item => ({
        productName: item.product_name || item.custom_name,
        changeType: item.change_type,
        count: parseInt(item.count),
        totalQuantity: parseFloat(item.total_quantity),
        unit: item.unit
      }))
    };

  } catch (error) {
    logger.error('Error calculating waste statistics:', error);
    throw error;
  }
}

module.exports = {
  isTrackingEnabled,
  getInventoryConsumptionStats,
  getShoppingPatternStats,
  getCombinedConsumptionStats,
  predictStockDepletion,
  generateAutoSuggestions,
  getWasteStatistics
};
