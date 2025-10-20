const axios = require('axios');
const { query } = require('../database/connection');
const logger = require('../utils/logger');

class OpenFoodFactsService {
  constructor() {
    this.baseURL = process.env.OPENFOODFACTS_API_URL || 'https://world.openfoodfacts.org';
    this.userAgent = process.env.OPENFOODFACTS_USER_AGENT || 'HaztartasiApp/1.0';
    
    // Configure axios instance
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json'
      }
    });
    
    // Request interceptor for logging
    this.api.interceptors.request.use(
      (config) => {
        logger.debug('OpenFoodFacts API Request', {
          url: config.url,
          method: config.method,
          params: config.params
        });
        return config;
      },
      (error) => {
        logger.error('OpenFoodFacts API Request Error', error);
        return Promise.reject(error);
      }
    );
    
    // Response interceptor for logging
    this.api.interceptors.response.use(
      (response) => {
        logger.debug('OpenFoodFacts API Response', {
          url: response.config.url,
          status: response.status,
          dataSize: JSON.stringify(response.data).length
        });
        return response;
      },
      (error) => {
        logger.error('OpenFoodFacts API Response Error', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get product by barcode
   */
  async getProductByBarcode(barcode) {
    try {
      const startTime = Date.now();
      
      // First check if we have it cached in our database
      const cachedProduct = await this.getCachedProduct(barcode);
      if (cachedProduct && this.isCacheValid(cachedProduct.last_updated)) {
        logger.debug('Product found in cache', { barcode });
        return this.formatProduct(cachedProduct);
      }
      
      // Fetch from OpenFoodFacts API
      const response = await this.api.get(`/api/v0/product/${barcode}.json`);
      const duration = Date.now() - startTime;
      
      logger.logPerformance('OpenFoodFacts API Call', duration, { barcode });
      
      if (response.data.status === 0) {
        logger.info('Product not found in OpenFoodFacts', { barcode });
        return null;
      }
      
      const product = response.data.product;
      
      // Cache the product in our database
      const cachedProductData = await this.cacheProduct(barcode, product);
      
      return this.formatProduct(cachedProductData);
    } catch (error) {
      logger.error('Error fetching product by barcode', {
        barcode,
        error: error.message
      });
      
      // Try to return cached version even if expired
      const cachedProduct = await this.getCachedProduct(barcode);
      if (cachedProduct) {
        logger.warn('Returning expired cached product due to API error', { barcode });
        return this.formatProduct(cachedProduct);
      }
      
      throw error;
    }
  }

  /**
   * Search products by name
   */
  async searchProducts(searchTerm, page = 1, pageSize = 20) {
    try {
      const startTime = Date.now();
      
      const response = await this.api.get('/cgi/search.pl', {
        params: {
          search_terms: searchTerm,
          search_simple: 1,
          action: 'process',
          json: 1,
          page,
          page_size: Math.min(pageSize, 100) // Limit to 100
        }
      });
      
      const duration = Date.now() - startTime;
      logger.logPerformance('OpenFoodFacts Search', duration, { 
        searchTerm, 
        resultsCount: response.data.products?.length || 0 
      });
      
      if (!response.data.products) {
        return {
          products: [],
          count: 0,
          page,
          pageSize
        };
      }
      
      // Cache found products
      const products = await Promise.all(
        response.data.products.map(async (product) => {
          if (product.code) {
            const cached = await this.cacheProduct(product.code, product);
            return this.formatProduct(cached);
          }
          return this.formatProduct(product);
        })
      );
      
      return {
        products,
        count: response.data.count || products.length,
        page,
        pageSize
      };
    } catch (error) {
      logger.error('Error searching products', {
        searchTerm,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get cached product from database
   */
  async getCachedProduct(barcode) {
    try {
      const result = await query(
        'SELECT * FROM products_master WHERE barcode = $1',
        [barcode]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting cached product', { barcode, error: error.message });
      return null;
    }
  }

  /**
   * Cache product in database
   */
  async cacheProduct(barcode, productData) {
    try {
      const formattedData = this.extractProductData(productData);
      
      const result = await query(`
        INSERT INTO products_master (
          barcode, name, brand, category, subcategory, image_url, thumbnail_url,
          nutrition_data, allergens, ingredients, packaging, labels, countries, stores,
          data_source, data_quality_score, last_updated
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
        )
        ON CONFLICT (barcode) 
        DO UPDATE SET
          name = EXCLUDED.name,
          brand = EXCLUDED.brand,
          category = EXCLUDED.category,
          subcategory = EXCLUDED.subcategory,
          image_url = EXCLUDED.image_url,
          thumbnail_url = EXCLUDED.thumbnail_url,
          nutrition_data = EXCLUDED.nutrition_data,
          allergens = EXCLUDED.allergens,
          ingredients = EXCLUDED.ingredients,
          packaging = EXCLUDED.packaging,
          labels = EXCLUDED.labels,
          countries = EXCLUDED.countries,
          stores = EXCLUDED.stores,
          data_quality_score = EXCLUDED.data_quality_score,
          last_updated = NOW()
        RETURNING *
      `, [
        formattedData.barcode,
        formattedData.name,
        formattedData.brand,
        formattedData.category,
        formattedData.subcategory,
        formattedData.image_url,
        formattedData.thumbnail_url,
        JSON.stringify(formattedData.nutrition_data),
        formattedData.allergens,
        formattedData.ingredients,
        formattedData.packaging,
        formattedData.labels,
        formattedData.countries,
        formattedData.stores,
        'openfoodfacts',
        formattedData.data_quality_score
      ]);
      
      logger.debug('Product cached successfully', { barcode });
      return result.rows[0];
    } catch (error) {
      logger.error('Error caching product', { barcode, error: error.message });
      throw error;
    }
  }

  /**
   * Extract and format product data from OpenFoodFacts response
   */
  extractProductData(product) {
    return {
      barcode: product.code || product._id,
      name: product.product_name || product.product_name_hu || product.product_name_en || 'Ismeretlen termék',
      brand: product.brands || null,
      category: this.extractMainCategory(product.categories),
      subcategory: this.extractSubCategory(product.categories),
      image_url: product.image_url || product.image_front_url || null,
      thumbnail_url: product.image_small_url || product.image_thumb_url || null,
      nutrition_data: this.extractNutritionData(product),
      allergens: this.extractAllergens(product),
      ingredients: product.ingredients_text || product.ingredients_text_hu || null,
      packaging: product.packaging || null,
      labels: this.extractLabels(product),
      countries: this.extractCountries(product),
      stores: this.extractStores(product),
      data_quality_score: this.calculateQualityScore(product)
    };
  }

  /**
   * Extract nutrition data
   */
  extractNutritionData(product) {
    const nutrition = {};
    
    if (product.nutriments) {
      const nutrientMap = {
        'energy-kcal': 'energy',
        'energy-kj': 'energy_kj',
        'fat': 'fat',
        'saturated-fat': 'saturated_fat',
        'carbohydrates': 'carbohydrates',
        'sugars': 'sugars',
        'fiber': 'fiber',
        'proteins': 'protein',
        'salt': 'salt',
        'sodium': 'sodium'
      };
      
      Object.entries(nutrientMap).forEach(([offKey, ourKey]) => {
        if (product.nutriments[offKey + '_100g'] !== undefined) {
          nutrition[ourKey] = parseFloat(product.nutriments[offKey + '_100g']);
        }
      });
    }
    
    return nutrition;
  }

  /**
   * Extract allergens
   */
  extractAllergens(product) {
    const allergens = [];
    
    if (product.allergens_tags) {
      product.allergens_tags.forEach(tag => {
        const allergen = tag.replace('en:', '').replace('-', ' ');
        allergens.push(this.translateAllergen(allergen));
      });
    }
    
    return allergens.length > 0 ? allergens : null;
  }

  /**
   * Extract main category
   */
  extractMainCategory(categories) {
    if (!categories) return null;
    
    const categoryList = categories.split(',').map(c => c.trim());
    return categoryList[0] || null;
  }

  /**
   * Extract subcategory
   */
  extractSubCategory(categories) {
    if (!categories) return null;
    
    const categoryList = categories.split(',').map(c => c.trim());
    return categoryList[1] || null;
  }

  /**
   * Extract labels
   */
  extractLabels(product) {
    const labels = [];
    
    if (product.labels_tags) {
      product.labels_tags.forEach(tag => {
        const label = tag.replace('en:', '').replace('-', ' ');
        labels.push(label);
      });
    }
    
    return labels.length > 0 ? labels : null;
  }

  /**
   * Extract countries
   */
  extractCountries(product) {
    if (product.countries_tags) {
      return product.countries_tags.map(tag => tag.replace('en:', ''));
    }
    return null;
  }

  /**
   * Extract stores
   */
  extractStores(product) {
    if (product.stores) {
      return product.stores.split(',').map(s => s.trim());
    }
    return null;
  }

  /**
   * Calculate data quality score
   */
  calculateQualityScore(product) {
    let score = 0;
    
    if (product.product_name) score += 20;
    if (product.brands) score += 15;
    if (product.categories) score += 15;
    if (product.image_url) score += 10;
    if (product.ingredients_text) score += 15;
    if (product.nutriments && Object.keys(product.nutriments).length > 0) score += 25;
    
    return Math.min(score, 100);
  }

  /**
   * Translate allergen to Hungarian
   */
  translateAllergen(allergen) {
    const translations = {
      'gluten': 'Glutén',
      'milk': 'Tej',
      'eggs': 'Tojás',
      'nuts': 'Dió',
      'peanuts': 'Földimogyoró',
      'sesame': 'Szezám',
      'soy': 'Szója',
      'fish': 'Hal',
      'shellfish': 'Rákfélék'
    };
    
    return translations[allergen.toLowerCase()] || allergen;
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid(lastUpdated, maxAgeHours = 24 * 7) { // 1 week default
    if (!lastUpdated) return false;
    
    const now = new Date();
    const updated = new Date(lastUpdated);
    const diffHours = (now - updated) / (1000 * 60 * 60);
    
    return diffHours < maxAgeHours;
  }

  /**
   * Format product for API response
   */
  formatProduct(product) {
    if (!product) return null;
    
    return {
      id: product.id,
      barcode: product.barcode,
      name: product.name,
      brand: product.brand,
      category: product.category,
      subcategory: product.subcategory,
      image_url: product.image_url,
      thumbnail_url: product.thumbnail_url,
      nutrition_data: typeof product.nutrition_data === 'string' 
        ? JSON.parse(product.nutrition_data) 
        : product.nutrition_data,
      allergens: product.allergens,
      ingredients: product.ingredients,
      packaging: product.packaging,
      labels: product.labels,
      countries: product.countries,
      stores: product.stores,
      data_quality_score: product.data_quality_score,
      last_updated: product.last_updated
    };
  }

  /**
   * Get service statistics
   */
  async getStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_products,
          COUNT(CASE WHEN last_updated > NOW() - INTERVAL '7 days' THEN 1 END) as recent_products,
          AVG(data_quality_score) as avg_quality_score,
          COUNT(CASE WHEN data_quality_score >= 80 THEN 1 END) as high_quality_products
        FROM products_master 
        WHERE data_source = 'openfoodfacts'
      `);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting OpenFoodFacts stats', error);
      return null;
    }
  }
}

module.exports = new OpenFoodFactsService();
