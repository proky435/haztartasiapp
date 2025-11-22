import apiService from './api';

class ProductsService {
  // Termék keresés vonalkód alapján
  async getProductByBarcode(barcode) {
    try {
      const response = await apiService.get(`/products/barcode/${barcode}`);
      return response.product;
    } catch (error) {
      console.error('Get product by barcode error:', error);
      
      if (error.status === 404) {
        return null; // Termék nem található
      }
      
      throw error;
    }
  }

  // Termék átnevezése
  async renameProduct(barcode, customName) {
    try {
      const response = await apiService.post(`/products/barcode/${barcode}/rename`, {
        customName
      });
      return response;
    } catch (error) {
      console.error('Product rename error:', error);
      throw error;
    }
  }

  // Termék keresés név alapján
  async searchProducts(query, options = {}) {
    try {
      const params = {
        q: query,
        page: options.page || 1,
        limit: options.limit || 20,
        ...options
      };

      const response = await apiService.get('/products/search', params);
      return {
        products: response.products || [],
        pagination: response.pagination || {},
        total: response.pagination?.total || 0
      };
    } catch (error) {
      console.error('Search products error:', error);
      throw error;
    }
  }

  // Egyedi termék létrehozása
  async createCustomProduct(productData) {
    try {
      const response = await apiService.post('/products/custom', productData);
      return response.product;
    } catch (error) {
      console.error('Create custom product error:', error);
      throw error;
    }
  }

  // Termék részletek lekérése ID alapján
  async getProductById(productId) {
    try {
      const response = await apiService.get(`/products/${productId}`);
      return response.product;
    } catch (error) {
      console.error('Get product by ID error:', error);
      
      if (error.status === 404) {
        return null;
      }
      
      throw error;
    }
  }

  // Termék adatok validálása vonalkód alapján
  async validateBarcode(barcode) {
    // Alapvető vonalkód validáció
    if (!barcode || typeof barcode !== 'string') {
      return { isValid: false, error: 'Vonalkód megadása kötelező' };
    }

    // Hossz ellenőrzése
    if (barcode.length < 8 || barcode.length > 20) {
      return { isValid: false, error: 'A vonalkód 8-20 karakter hosszú lehet' };
    }

    // Csak számok ellenőrzése
    if (!/^\d+$/.test(barcode)) {
      return { isValid: false, error: 'A vonalkód csak számokat tartalmazhat' };
    }

    return { isValid: true };
  }

  // Termék kép URL optimalizálása
  optimizeImageUrl(imageUrl, size = 'medium') {
    if (!imageUrl) return null;

    // Open Food Facts képek optimalizálása
    if (imageUrl.includes('openfoodfacts.org')) {
      const sizeMap = {
        small: '200',
        medium: '400', 
        large: '800'
      };
      
      // Ha már van méret paraméter, cseréljük le
      if (imageUrl.includes('.jpg')) {
        return imageUrl.replace(/\.(\d+)\.jpg/, `.${sizeMap[size]}.jpg`);
      }
    }

    return imageUrl;
  }

  // Termék kategória normalizálása
  normalizeCategory(category) {
    if (!category) return 'Egyéb';

    const categoryMap = {
      'beverages': 'Italok',
      'dairy': 'Tejtermékek',
      'meat': 'Hús',
      'fish': 'Hal',
      'vegetables': 'Zöldségek',
      'fruits': 'Gyümölcsök',
      'bread': 'Pékáruk',
      'sweets': 'Édességek',
      'snacks': 'Snackek',
      'frozen': 'Fagyasztott',
      'canned': 'Konzerv',
      'spices': 'Fűszerek',
      'oils': 'Olajok',
      'pasta': 'Tészták',
      'cereals': 'Gabonafélék'
    };

    // Keresés a kategória térképben
    const normalizedKey = Object.keys(categoryMap).find(key => 
      category.toLowerCase().includes(key)
    );

    return categoryMap[normalizedKey] || category;
  }

  // Allergének fordítása magyarra
  translateAllergens(allergens) {
    if (!allergens || !Array.isArray(allergens)) return [];

    const allergenMap = {
      'gluten': 'Glutén',
      'milk': 'Tej',
      'eggs': 'Tojás',
      'nuts': 'Dió',
      'peanuts': 'Földimogyoró',
      'sesame': 'Szezám',
      'soy': 'Szója',
      'fish': 'Hal',
      'shellfish': 'Rákfélék',
      'celery': 'Zeller',
      'mustard': 'Mustár',
      'sulphites': 'Szulfit'
    };

    return allergens.map(allergen => {
      const key = Object.keys(allergenMap).find(k => 
        allergen.toLowerCase().includes(k)
      );
      return allergenMap[key] || allergen;
    });
  }

  // Termék adatok formázása megjelenítéshez
  formatProductForDisplay(product) {
    if (!product) return null;

    return {
      ...product,
      displayName: product.name || product.customName || 'Névtelen termék',
      displayBrand: product.brand || product.customBrand || '',
      displayCategory: this.normalizeCategory(product.category),
      optimizedImageUrl: this.optimizeImageUrl(product.image_url || product.thumbnail_url),
      translatedAllergens: this.translateAllergens(product.allergens),
      hasNutritionData: !!(product.nutrition_data && Object.keys(product.nutrition_data).length > 0),
      qualityScore: product.data_quality_score || 0,
      isHighQuality: (product.data_quality_score || 0) >= 80
    };
  }

  // Termék statisztikák lekérése (fejlesztői funkció)
  async getProductStats() {
    try {
      const response = await apiService.get('/products/stats');
      return response;
    } catch (error) {
      console.error('Get product stats error:', error);
      throw error;
    }
  }

  // Gyakran keresett termékek cache-elése
  async getCachedFrequentProducts() {
    try {
      const cached = localStorage.getItem('frequentProducts');
      if (cached) {
        const data = JSON.parse(cached);
        const isExpired = Date.now() - data.timestamp > 24 * 60 * 60 * 1000; // 24 óra
        
        if (!isExpired) {
          return data.products;
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error getting cached frequent products:', error);
      return [];
    }
  }

  // Gyakran keresett termékek mentése
  cacheFrequentProduct(product) {
    try {
      const cached = this.getCachedFrequentProducts();
      const updated = [product, ...cached.filter(p => p.id !== product.id)].slice(0, 10);
      
      localStorage.setItem('frequentProducts', JSON.stringify({
        products: updated,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error caching frequent product:', error);
    }
  }

  // Termék árának mentése
  async saveProductPrice(barcode, productName, price) {
    try {
      const response = await apiService.post(`/products/${barcode}/price`, {
        price,
        productName
      });
      return response;
    } catch (error) {
      console.error('Save product price error:', error);
      throw error;
    }
  }
}

// Singleton instance
const productsService = new ProductsService();

export default productsService;
