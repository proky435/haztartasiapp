const { query } = require('../database/connection');
const logger = require('../utils/logger');

class ProductPriceService {
  /**
   * Ár mentése vagy frissítése egy termékhez
   */
  async savePrice(userId, barcode, productName, price) {
    try {
      if (!price || price <= 0) {
        return null;
      }

      const result = await query(`
        INSERT INTO product_prices (user_id, barcode, product_name, price)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, barcode) 
        DO UPDATE SET 
          price = $4,
          product_name = $3,
          last_updated = NOW()
        RETURNING *
      `, [userId, barcode, productName, price]);

      return result.rows[0];
    } catch (error) {
      logger.error('Error saving product price:', error);
      throw error;
    }
  }

  /**
   * Ár lekérése egy termékhez
   */
  async getPrice(userId, barcode) {
    try {
      const result = await query(`
        SELECT * FROM product_prices
        WHERE user_id = $1 AND barcode = $2
        ORDER BY last_updated DESC
        LIMIT 1
      `, [userId, barcode]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting product price:', error);
      return null;
    }
  }

  /**
   * Termék legutóbbi ára
   */
  async getLatestPrice(userId, barcode) {
    try {
      const priceData = await this.getPrice(userId, barcode);
      return priceData ? parseFloat(priceData.price) : null;
    } catch (error) {
      logger.error('Error getting latest price:', error);
      return null;
    }
  }

  /**
   * Ár törlése
   */
  async deletePrice(userId, barcode) {
    try {
      await query(`
        DELETE FROM product_prices
        WHERE user_id = $1 AND barcode = $2
      `, [userId, barcode]);

      return true;
    } catch (error) {
      logger.error('Error deleting product price:', error);
      return false;
    }
  }

  /**
   * Felhasználó összes árának lekérése
   */
  async getUserPrices(userId, limit = 100) {
    try {
      const result = await query(`
        SELECT * FROM product_prices
        WHERE user_id = $1
        ORDER BY last_updated DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting user prices:', error);
      return [];
    }
  }
}

module.exports = new ProductPriceService();
