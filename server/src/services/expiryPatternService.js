const { query, transaction } = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Expiry Pattern Service
 * Kezeli a termékek lejárati mintáinak tanulását és javaslatokat
 */

/**
 * Lejárati javaslat lekérése egy termékhez
 * @param {string} householdId - Háztartás azonosító
 * @param {string} barcode - Termék vonalkód (opcionális)
 * @param {string} productName - Termék név (opcionális)
 * @returns {Object|null} Javaslat objektum vagy null
 */
async function getExpirySuggestion(householdId, barcode = null, productName = null) {
  try {
    if (!householdId) {
      throw new Error('Household ID kötelező');
    }

    if (!barcode && !productName) {
      return null; // Nincs mit keresni
    }

    // Keresés barcode vagy név alapján
    let queryText;
    let queryParams;

    if (barcode) {
      // Elsődleges keresés: barcode alapján
      queryText = `
        SELECT 
          id,
          barcode,
          product_name,
          average_shelf_life_days,
          sample_count,
          last_shelf_life_days,
          last_recorded_at
        FROM product_expiry_patterns
        WHERE household_id = $1 
          AND barcode = $2
          AND sample_count >= 3
        ORDER BY last_recorded_at DESC
        LIMIT 1
      `;
      queryParams = [householdId, barcode];
    } else {
      // Másodlagos keresés: név alapján (fuzzy match)
      queryText = `
        SELECT 
          id,
          barcode,
          product_name,
          average_shelf_life_days,
          sample_count,
          last_shelf_life_days,
          last_recorded_at
        FROM product_expiry_patterns
        WHERE household_id = $1 
          AND product_name ILIKE $2
          AND sample_count >= 3
        ORDER BY sample_count DESC, last_recorded_at DESC
        LIMIT 1
      `;
      queryParams = [householdId, `%${productName}%`];
    }

    const result = await query(queryText, queryParams);

    if (result.rows.length === 0) {
      return null;
    }

    const pattern = result.rows[0];

    // Számítsd ki a javasolt lejárati dátumot
    const suggestedDate = new Date();
    suggestedDate.setDate(suggestedDate.getDate() + pattern.average_shelf_life_days);

    return {
      hasPattern: true,
      averageShelfLifeDays: pattern.average_shelf_life_days,
      sampleCount: pattern.sample_count,
      lastShelfLifeDays: pattern.last_shelf_life_days,
      suggestedExpiryDate: suggestedDate.toISOString().split('T')[0],
      confidence: calculateConfidence(pattern.sample_count),
      message: generateSuggestionMessage(pattern)
    };

  } catch (error) {
    logger.error('Hiba a lejárati javaslat lekérésekor:', error);
    return null;
  }
}

/**
 * Lejárati minta rögzítése vagy frissítése
 * @param {string} householdId - Háztartás azonosító
 * @param {string} barcode - Termék vonalkód (opcionális)
 * @param {string} productName - Termék név (opcionális)
 * @param {number} shelfLifeDays - Eltarthatóság napokban
 */
async function recordExpiryPattern(householdId, barcode, productName, shelfLifeDays) {
  try {
    if (!householdId || shelfLifeDays === null || shelfLifeDays === undefined) {
      return; // Nincs mit rögzíteni
    }

    if (!barcode && !productName) {
      return; // Nincs termék azonosító
    }

    // Ellenőrizzük, hogy van-e már minta
    let existingPattern;
    
    if (barcode) {
      const result = await query(`
        SELECT * FROM product_expiry_patterns
        WHERE household_id = $1 AND barcode = $2
      `, [householdId, barcode]);
      existingPattern = result.rows[0];
    } else {
      const result = await query(`
        SELECT * FROM product_expiry_patterns
        WHERE household_id = $1 AND product_name = $2
      `, [householdId, productName]);
      existingPattern = result.rows[0];
    }

    if (existingPattern) {
      // Frissítés: számoljuk újra az átlagot
      const newSampleCount = existingPattern.sample_count + 1;
      const newAverage = Math.round(
        (existingPattern.average_shelf_life_days * existingPattern.sample_count + shelfLifeDays) / newSampleCount
      );

      await query(`
        UPDATE product_expiry_patterns
        SET 
          average_shelf_life_days = $1,
          sample_count = $2,
          last_shelf_life_days = $3,
          last_recorded_at = NOW()
        WHERE id = $4
      `, [newAverage, newSampleCount, shelfLifeDays, existingPattern.id]);

      logger.info(`Lejárati minta frissítve: ${productName || barcode}, új átlag: ${newAverage} nap (${newSampleCount} minta)`);
    } else {
      // Új minta létrehozása
      await query(`
        INSERT INTO product_expiry_patterns (
          household_id,
          barcode,
          product_name,
          average_shelf_life_days,
          sample_count,
          last_shelf_life_days
        ) VALUES ($1, $2, $3, $4, 1, $4)
      `, [householdId, barcode, productName, shelfLifeDays]);

      logger.info(`Új lejárati minta létrehozva: ${productName || barcode}, ${shelfLifeDays} nap`);
    }

  } catch (error) {
    logger.error('Hiba a lejárati minta rögzítésekor:', error);
    // Ne dobjunk hibát, csak logoljuk - ez nem kritikus funkció
  }
}

/**
 * Bizalmi szint számítása a minták száma alapján
 * @param {number} sampleCount - Minták száma
 * @returns {string} Bizalmi szint (low, medium, high)
 */
function calculateConfidence(sampleCount) {
  if (sampleCount >= 10) return 'high';
  if (sampleCount >= 5) return 'medium';
  return 'low';
}

/**
 * Javaslat üzenet generálása
 * @param {Object} pattern - Lejárati minta objektum
 * @returns {string} Emberi nyelvű üzenet
 */
function generateSuggestionMessage(pattern) {
  const days = pattern.average_shelf_life_days;
  const count = pattern.sample_count;
  
  if (days === 0) {
    return `Általában azonnal elfogyasztod (${count}x)`;
  } else if (days === 1) {
    return `Általában 1 napig eláll (${count}x)`;
  } else if (days < 7) {
    return `Általában ${days} napig eláll (${count}x)`;
  } else if (days < 30) {
    const weeks = Math.round(days / 7);
    return `Általában ${weeks} hétig eláll (${count}x)`;
  } else if (days < 365) {
    const months = Math.round(days / 30);
    return `Általában ${months} hónapig eláll (${count}x)`;
  } else {
    const years = Math.round(days / 365);
    return `Általában ${years} évig eláll (${count}x)`;
  }
}

/**
 * Háztartás összes lejárati mintájának lekérése
 * @param {string} householdId - Háztartás azonosító
 * @returns {Array} Lejárati minták tömbje
 */
async function getAllPatternsForHousehold(householdId) {
  try {
    const result = await query(`
      SELECT 
        id,
        barcode,
        product_name,
        average_shelf_life_days,
        sample_count,
        last_shelf_life_days,
        last_recorded_at
      FROM product_expiry_patterns
      WHERE household_id = $1
      ORDER BY sample_count DESC, last_recorded_at DESC
    `, [householdId]);

    return result.rows;
  } catch (error) {
    logger.error('Hiba a lejárati minták lekérésekor:', error);
    return [];
  }
}

/**
 * Lejárati minta törlése
 * @param {string} patternId - Minta azonosító
 * @param {string} householdId - Háztartás azonosító (biztonsági ellenőrzés)
 */
async function deletePattern(patternId, householdId) {
  try {
    await query(`
      DELETE FROM product_expiry_patterns
      WHERE id = $1 AND household_id = $2
    `, [patternId, householdId]);

    logger.info(`Lejárati minta törölve: ${patternId}`);
  } catch (error) {
    logger.error('Hiba a lejárati minta törlésekor:', error);
    throw error;
  }
}

module.exports = {
  getExpirySuggestion,
  recordExpiryPattern,
  getAllPatternsForHousehold,
  deletePattern,
  calculateConfidence,
  generateSuggestionMessage
};
