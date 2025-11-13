/**
 * Univerzális közműköltség számító szolgáltatás
 * 
 * Képes kiszámítani a magyarországi háztartási közművek (villany, gáz, víz, távfűtés) 
 * várható költségét sávos árazással, paraméterezett díjstruktúrával.
 */

const { query } = require('../database/connection');
const logger = require('../utils/logger');

class UtilityCostCalculator {
  
  /**
   * Univerzális költségszámítás
   * @param {string} householdId - Háztartás ID
   * @param {string} utilityTypeId - Közműtípus ID
   * @param {number} consumption - Fogyasztás mennyisége
   * @param {string} consumptionUnit - Fogyasztás mértékegysége (kWh, m3, GJ)
   * @returns {Promise<Object>} Részletes költségszámítás
   */
  async calculateUtilityCost(householdId, utilityTypeId, consumption, consumptionUnit = null) {
    try {
      // Közműtípus és alapbeállítások lekérése
      const utilityInfo = await this.getUtilityInfo(householdId, utilityTypeId);
      if (!utilityInfo) {
        throw new Error('Közműtípus nem található vagy nincs beállítva');
      }

      // Árazási sávok lekérése
      const pricingTiers = await this.getPricingTiers(householdId, utilityTypeId);
      
      let calculation;
      
      // Ha nincsenek sávok VAGY ha az egységár be van állítva, egyszerű számítás
      const hasUnitPrice = utilityInfo.current_unit_price && parseFloat(utilityInfo.current_unit_price) > 0;
      const hasValidTiers = pricingTiers && pricingTiers.length > 0 && pricingTiers.some(tier => tier.price_per_unit > 0);
      
      console.log('🔍 Calculation decision:');
      console.log('  - Has unit price:', hasUnitPrice, '(', utilityInfo.current_unit_price, ')');
      console.log('  - Has valid tiers:', hasValidTiers);
      console.log('  - Pricing tiers count:', pricingTiers ? pricingTiers.length : 0);
      
      if (!hasValidTiers || hasUnitPrice) {
        console.log('  → Using SIMPLE calculation');
        calculation = await this.calculateSimpleCost(consumption, utilityInfo);
      } else {
        console.log('  → Using TIERED calculation');
        // Közműtípus alapú sávos számítás
        switch (utilityInfo.utility_name) {
          case 'electricity':
            calculation = await this.calculateElectricityCost(consumption, pricingTiers, utilityInfo);
            break;
          case 'gas':
            calculation = await this.calculateGasCost(consumption, pricingTiers, utilityInfo);
            break;
          case 'water_cold':
            calculation = await this.calculateWaterCost(consumption, pricingTiers, utilityInfo);
            break;
          case 'water_hot':
            calculation = await this.calculateElectricityCost(consumption, pricingTiers, utilityInfo);
            break;
          case 'heating':
            calculation = await this.calculateHeatingCost(consumption, pricingTiers, utilityInfo);
            break;
          default:
            throw new Error(`Nem támogatott közműtípus: ${utilityInfo.utility_name}`);
        }
      }

      // Eredmény összeállítása
      return {
        success: true,
        utility_type: utilityInfo.utility_name,
        utility_display_name: utilityInfo.display_name,
        consumption: consumption,
        consumption_unit: consumptionUnit || utilityInfo.unit,
        calculation: calculation,
        total_cost: calculation.total_cost,
        breakdown: calculation.breakdown,
        formula_description: calculation.formula_description,
        calculated_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error in calculateUtilityCost:', error);
      throw error;
    }
  }

  /**
   * Villany költségszámítás (sávos árazással)
   */
  async calculateElectricityCost(consumptionKwh, pricingTiers, utilityInfo) {
    const breakdown = [];
    let totalConsumptionCost = 0;
    let totalSystemFee = 0;
    let remainingConsumption = consumptionKwh;

    // Sávok szerinti számítás
    for (const tier of pricingTiers.sort((a, b) => a.tier_number - b.tier_number)) {
      if (remainingConsumption <= 0) break;

      const tierLimit = tier.limit_value || Infinity;
      const tierConsumption = Math.min(remainingConsumption, tierLimit);
      const tierCost = tierConsumption * tier.price_per_unit;
      const tierSystemFee = tierConsumption * (tier.system_usage_fee || 0);

      breakdown.push({
        tier_number: tier.tier_number,
        tier_name: tier.tier_name,
        consumption: tierConsumption,
        unit: 'kWh',
        price_per_unit: tier.price_per_unit,
        tier_cost: tierCost,
        system_fee: tierSystemFee,
        limit: tier.limit_value
      });

      totalConsumptionCost += tierCost;
      totalSystemFee += tierSystemFee;
      remainingConsumption -= tierConsumption;
    }

    const baseFee = parseFloat(utilityInfo.base_fee) || 0;
    const totalCost = totalConsumptionCost + totalSystemFee + baseFee;

    return {
      total_cost: Math.round(totalCost * 100) / 100,
      base_fee: baseFee,
      consumption_cost: Math.round(totalConsumptionCost * 100) / 100,
      system_usage_fee: Math.round(totalSystemFee * 100) / 100,
      breakdown: breakdown,
      formula_description: `Alapdíj (${baseFee} Ft) + Sávos fogyasztási díj + Rendszerhasználati díj`
    };
  }

  /**
   * Gáz költségszámítás (m³ -> MJ konverzióval, sávos árazással)
   */
  async calculateGasCost(consumptionM3, pricingTiers, utilityInfo) {
    const breakdown = [];
    let totalConsumptionCost = 0;
    let totalSystemFee = 0;

    // Konverzió m³ -> MJ
    const conversionFactor = pricingTiers[0]?.conversion_factor || 34.5;
    const consumptionMj = consumptionM3 * conversionFactor;
    let remainingConsumption = consumptionMj;

    // Sávok szerinti számítás MJ-ban
    for (const tier of pricingTiers.sort((a, b) => a.tier_number - b.tier_number)) {
      if (remainingConsumption <= 0) break;

      const tierLimit = tier.limit_value || Infinity;
      const tierConsumption = Math.min(remainingConsumption, tierLimit);
      const tierCost = tierConsumption * tier.price_per_unit;
      const tierSystemFee = tierConsumption * (tier.system_usage_fee || 0);

      breakdown.push({
        tier_number: tier.tier_number,
        tier_name: tier.tier_name,
        consumption: tierConsumption,
        unit: 'MJ',
        price_per_unit: tier.price_per_unit,
        tier_cost: tierCost,
        system_fee: tierSystemFee,
        limit: tier.limit_value
      });

      totalConsumptionCost += tierCost;
      totalSystemFee += tierSystemFee;
      remainingConsumption -= tierConsumption;
    }

    const baseFee = parseFloat(utilityInfo.base_fee) || 0;
    const totalCost = totalConsumptionCost + totalSystemFee + baseFee;

    return {
      total_cost: Math.round(totalCost * 100) / 100,
      base_fee: baseFee,
      consumption_cost: Math.round(totalConsumptionCost * 100) / 100,
      system_usage_fee: Math.round(totalSystemFee * 100) / 100,
      conversion_info: {
        original_consumption: consumptionM3,
        original_unit: 'm³',
        converted_consumption: Math.round(consumptionMj * 100) / 100,
        converted_unit: 'MJ',
        conversion_factor: conversionFactor
      },
      breakdown: breakdown,
      formula_description: `Alapdíj (${baseFee} Ft) + Sávos fogyasztási díj (${consumptionM3} m³ = ${Math.round(consumptionMj * 100) / 100} MJ) + Rendszerhasználati díj`
    };
  }

  /**
   * Víz költségszámítás (víz + csatorna)
   */
  async calculateWaterCost(consumptionM3, pricingTiers, utilityInfo) {
    const breakdown = [];
    let totalCost = 0;

    // Víz és csatorna díjak külön kezelése
    for (const tier of pricingTiers.sort((a, b) => a.tier_number - b.tier_number)) {
      const tierCost = consumptionM3 * parseFloat(tier.price_per_unit);
      
      breakdown.push({
        tier_number: tier.tier_number,
        tier_name: tier.tier_name,
        consumption: consumptionM3,
        unit: 'm³',
        price_per_unit: parseFloat(tier.price_per_unit),
        tier_cost: tierCost
      });

      totalCost += tierCost;
    }

    const baseFee = parseFloat(utilityInfo.base_fee) || 0;
    const finalTotalCost = totalCost + baseFee;

    return {
      total_cost: Math.round(finalTotalCost * 100) / 100,
      base_fee: baseFee,
      consumption_cost: Math.round(totalCost * 100) / 100,
      breakdown: breakdown,
      formula_description: `Alapdíj (${baseFee} Ft) + Vízfogyasztás + Csatornahasználat`
    };
  }

  /**
   * Távfűtés költségszámítás
   */
  async calculateHeatingCost(consumptionGj, pricingTiers, utilityInfo) {
    const breakdown = [];
    let totalCost = 0;

    // Egyszerű lineáris árazás
    for (const tier of pricingTiers) {
      const tierCost = consumptionGj * tier.price_per_unit;
      
      breakdown.push({
        tier_number: tier.tier_number,
        tier_name: tier.tier_name,
        consumption: consumptionGj,
        unit: 'GJ',
        price_per_unit: tier.price_per_unit,
        tier_cost: tierCost
      });

      totalCost += tierCost;
    }

    const baseFee = parseFloat(utilityInfo.base_fee) || 0;
    const finalTotalCost = totalCost + baseFee;

    return {
      total_cost: Math.round(finalTotalCost * 100) / 100,
      base_fee: baseFee,
      consumption_cost: Math.round(totalCost * 100) / 100,
      breakdown: breakdown,
      formula_description: `Alapdíj (${baseFee} Ft) + Hőenergia díj (${consumptionGj} GJ)`
    };
  }

  /**
   * Közműtípus információk lekérése
   */
  async getUtilityInfo(householdId, utilityTypeId) {
    const result = await query(`
      SELECT 
        ut.name as utility_name,
        ut.display_name,
        ut.unit,
        ut.icon,
        hus.base_fee,
        hus.current_unit_price,
        hus.is_enabled
      FROM utility_types ut
      LEFT JOIN household_utility_settings hus ON ut.id = hus.utility_type_id AND hus.household_id = $1
      WHERE ut.id = $2
    `, [householdId, utilityTypeId]);

    return result.rows[0] || null;
  }

  /**
   * Árazási sávok lekérése
   */
  async getPricingTiers(householdId, utilityTypeId) {
    const result = await query(`
      SELECT 
        tier_number,
        tier_name,
        limit_value,
        limit_unit,
        price_per_unit,
        conversion_factor,
        conversion_unit,
        system_usage_fee
      FROM utility_pricing_tiers
      WHERE household_id = $1 
        AND utility_type_id = $2 
        AND is_active = true
        AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
        AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
      ORDER BY tier_number
    `, [householdId, utilityTypeId]);

    return result.rows;
  }

  /**
   * Egyszerű költségszámítás (fallback, ha nincsenek sávok)
   */
  async calculateSimpleCost(consumption, utilityInfo) {
    const baseFee = parseFloat(utilityInfo.base_fee) || 0;
    const unitPrice = parseFloat(utilityInfo.current_unit_price) || 0;
    
    console.log('🔍 Simple calculation debug:');
    console.log('  - Base fee:', baseFee);
    console.log('  - Unit price:', unitPrice);
    console.log('  - Consumption:', consumption);
    
    const consumptionCost = consumption * unitPrice;
    const totalCost = baseFee + consumptionCost;
    
    console.log('  - Consumption cost:', consumptionCost);
    console.log('  - Total cost:', totalCost);

    return {
      total_cost: Math.round(totalCost * 100) / 100,
      base_fee: baseFee,
      consumption_cost: Math.round(consumptionCost * 100) / 100,
      breakdown: [{
        tier_number: 1,
        tier_name: 'Egyszerű árazás',
        consumption: consumption,
        unit: utilityInfo.unit,
        price_per_unit: unitPrice,
        tier_cost: consumptionCost
      }],
      formula_description: `Egyszerű árazás: ${baseFee} + (${consumption} ${utilityInfo.unit} × ${unitPrice} Ft) = ${Math.round(totalCost * 100) / 100} Ft`,
      pricing_mode: 'simple'
    };
  }

  /**
   * Két óraállás közötti költség számítása
   */
  async calculateCostBetweenReadings(householdId, utilityTypeId, previousReading, currentReading) {
    const consumption = currentReading - previousReading;
    
    if (consumption < 0) {
      throw new Error('A jelenlegi óraállás nem lehet kisebb az előzőnél');
    }

    return await this.calculateUtilityCost(householdId, utilityTypeId, consumption);
  }
}

module.exports = new UtilityCostCalculator();
