const express = require('express');
const router = express.Router();
const { query: dbQuery } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const { param } = require('express-validator');

// Statisztikák lekérése
router.get('/:householdId', [
  authenticateToken,
  param('householdId').isUUID().withMessage('Érvénytelen háztartás azonosító')
], async (req, res) => {
  try {
    const { range = 'month', year: queryYear, month: queryMonth } = req.query;
    const { householdId } = req.params;

    if (!householdId) {
      return res.status(400).json({ error: 'Nincs kiválasztott háztartás' });
    }

    // Időtartam meghatározása
    const now = new Date();
    let startDateStr, endDateStr;
    
    // Paraméterekből vagy aktuális dátumból
    const year = queryYear ? parseInt(queryYear) : now.getFullYear();
    const month = queryMonth ? String(queryMonth).padStart(2, '0') : String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${day}`;
    
    switch (range) {
      case 'week':
        // Az aktuális hét hétfőjétől
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - daysToMonday);
        const mondayYear = monday.getFullYear();
        const mondayMonth = String(monday.getMonth() + 1).padStart(2, '0');
        const mondayDay = String(monday.getDate()).padStart(2, '0');
        startDateStr = `${mondayYear}-${mondayMonth}-${mondayDay}`;
        endDateStr = todayStr;
        break;
      case 'month':
        // Kiválasztott hónap 1. napjától az utolsó napjáig
        const selectedMonth = parseInt(month);
        const selectedYear = year;
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        startDateStr = `${selectedYear}-${month}-01`;
        endDateStr = `${selectedYear}-${month}-${String(lastDay).padStart(2, '0')}`;
        break;
      case 'year':
        // Kiválasztott év január 1-től december 31-ig
        startDateStr = `${year}-01-01`;
        endDateStr = `${year}-12-31`;
        break;
      default:
        const defaultMonth = parseInt(month);
        const defaultYear = year;
        const defaultLastDay = new Date(defaultYear, defaultMonth, 0).getDate();
        startDateStr = `${defaultYear}-${month}-01`;
        endDateStr = `${defaultYear}-${month}-${String(defaultLastDay).padStart(2, '0')}`;
    }

    console.log('Statistics date range:', { range, year, month, startDateStr, endDateStr });

    // Közművek statisztikák - household_utilities táblából
    const utilitiesQuery = `
      SELECT 
        utility_type_id,
        meter_reading as reading_value,
        cost,
        reading_date,
        created_at
      FROM household_utilities
      WHERE household_id = $1
        AND DATE(reading_date) >= $2
        AND DATE(reading_date) <= $3
      ORDER BY reading_date DESC
    `;
    
    const utilitiesResult = await dbQuery(utilitiesQuery, [householdId, startDateStr, endDateStr]);
    const utilitiesData = utilitiesResult.rows || [];
    
    console.log('Utilities query result count:', utilitiesData.length);
    console.log('Utilities data sample:', utilitiesData.map(u => ({ 
      date: u.reading_date, 
      cost: u.cost 
    })));

    // Közműtípusok lekérése
    const utilityTypesQuery = `
      SELECT id, display_name as name, icon
      FROM utility_types
    `;
    const utilityTypesResult = await dbQuery(utilityTypesQuery, []);
    const utilityTypes = utilityTypesResult.rows || [];
    
    const utilityTypesMap = {};
    utilityTypes.forEach(type => {
      utilityTypesMap[type.id] = type;
    });

    // Közművek összesítése típusonként
    const utilitiesByType = {};
    let utilitiesTotal = 0;

    utilitiesData.forEach(item => {
      const cost = parseFloat(item.cost) || 0;
      utilitiesTotal += cost;

      const typeId = item.utility_type_id;
      if (!utilitiesByType[typeId]) {
        utilitiesByType[typeId] = {
          name: utilityTypesMap[typeId]?.name || 'Ismeretlen',
          icon: utilityTypesMap[typeId]?.icon || '🔌',
          total: 0,
          items: []
        };
      }

      utilitiesByType[typeId].total += cost;
      utilitiesByType[typeId].items.push({
        value: item.reading_value,
        cost: cost,
        date: item.reading_date
      });
    });

    // Bevásárlás statisztikák - household_inventory táblából (price * quantity)
    const shoppingQuery = `
      SELECT 
        COALESCE(hi.custom_name, pm.name) as name,
        hi.price,
        hi.quantity,
        COALESCE(hi.purchase_date, hi.created_at) as purchase_date
      FROM household_inventory hi
      LEFT JOIN products_master pm ON hi.product_master_id = pm.id
      WHERE hi.household_id = $1
        AND hi.price IS NOT NULL 
        AND hi.price > 0
        AND DATE(COALESCE(hi.purchase_date, hi.created_at)) >= $2
        AND DATE(COALESCE(hi.purchase_date, hi.created_at)) <= $3
      ORDER BY COALESCE(hi.purchase_date, hi.created_at) DESC
    `;
    
    const shoppingResult = await dbQuery(shoppingQuery, [householdId, startDateStr, endDateStr]);
    const shoppingData = shoppingResult.rows || [];

    console.log('Shopping query params:', { householdId, startDateStr, endDateStr });
    console.log('Shopping raw data count:', shoppingData.length);
    console.log('Shopping raw data sample:', shoppingData.slice(0, 3));

    const shoppingItems = shoppingData.map(item => ({
      name: item.name,
      price: parseFloat(item.price) || 0,
      quantity: parseInt(item.quantity) || 1,
      amount: (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1),
      date: item.purchase_date
    }));

    const shoppingTotal = shoppingItems.reduce((sum, item) => sum + item.amount, 0);
    console.log('Shopping total:', shoppingTotal, 'Items count:', shoppingItems.length);

    // Egyéb költségek lekérése
    const otherExpensesQuery = `
      SELECT 
        id,
        name,
        amount,
        category
      FROM household_other_expenses
      WHERE household_id = $1 AND is_active = TRUE
      ORDER BY name ASC
    `;
    
    const otherExpensesResult = await dbQuery(otherExpensesQuery, [householdId]);
    const otherExpensesData = otherExpensesResult.rows || [];
    
    const otherExpensesItems = otherExpensesData.map(item => ({
      name: item.name,
      amount: parseFloat(item.amount) || 0,
      category: item.category
    }));
    
    const otherExpensesTotal = otherExpensesItems.reduce((sum, item) => sum + item.amount, 0);
    console.log('Other expenses total:', otherExpensesTotal, 'Items count:', otherExpensesItems.length);

    // Lakbér és kapcsolódó költségek lekérése
    const rentCostsQuery = `
      SELECT 
        rent_amount,
        garage_rent,
        insurance_cost,
        common_utility_cost,
        maintenance_cost,
        other_monthly_costs
      FROM household_costs
      WHERE household_id = $1
    `;
    
    const rentCostsResult = await dbQuery(rentCostsQuery, [householdId]);
    const rentCostsData = rentCostsResult.rows[0] || { 
      rent_amount: 0, 
      garage_rent: 0, 
      insurance_cost: 0,
      common_utility_cost: 0,
      maintenance_cost: 0,
      other_monthly_costs: 0
    };
    
    const rentItems = [];
    if (parseFloat(rentCostsData.rent_amount) > 0) {
      rentItems.push({ name: 'Lakbér', amount: parseFloat(rentCostsData.rent_amount) });
    }
    if (parseFloat(rentCostsData.garage_rent) > 0) {
      rentItems.push({ name: 'Garázs bérlet', amount: parseFloat(rentCostsData.garage_rent) });
    }
    if (parseFloat(rentCostsData.insurance_cost) > 0) {
      rentItems.push({ name: 'Biztosítás', amount: parseFloat(rentCostsData.insurance_cost) });
    }
    
    // Közös költségek összesen
    const commonCostsTotal = parseFloat(rentCostsData.common_utility_cost) + 
                            parseFloat(rentCostsData.maintenance_cost) + 
                            parseFloat(rentCostsData.other_monthly_costs);
    
    if (commonCostsTotal > 0) {
      rentItems.push({ name: 'Közös költség összesen', amount: commonCostsTotal });
    }
    
    const rentTotal = rentItems.reduce((sum, item) => sum + item.amount, 0);
    console.log('Rent costs total:', rentTotal, 'Items count:', rentItems.length);

    // Válasz összeállítása
    const stats = {
      utilities: {
        total: utilitiesTotal,
        byType: utilitiesByType,
        items: utilitiesData.map(item => ({
          type: utilityTypesMap[item.utility_type_id]?.name || 'Ismeretlen',
          icon: utilityTypesMap[item.utility_type_id]?.icon || '🔌',
          value: item.reading_value,
          cost: parseFloat(item.cost) || 0,
          date: item.reading_date
        }))
      },
      shopping: {
        total: shoppingTotal,
        items: shoppingItems
      },
      otherExpenses: {
        total: otherExpensesTotal,
        items: otherExpensesItems
      },
      rent: {
        total: rentTotal,
        items: rentItems
      },
      summary: {
        utilities: utilitiesTotal,
        shopping: shoppingTotal,
        otherExpenses: otherExpensesTotal,
        rent: rentTotal,
        total: utilitiesTotal + shoppingTotal + otherExpensesTotal + rentTotal
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Hiba a statisztikák lekérésekor' });
  }
});

module.exports = router;
