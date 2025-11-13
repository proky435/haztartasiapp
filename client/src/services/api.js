// API Service Layer - Backend integráció
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://192.168.0.19:3001/api/v1';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('accessToken');
  }

  // Token kezelés
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('accessToken');
  }

  // HTTP kérés wrapper
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();
    
    // Debug üzenetek kikapcsolva
    // console.log('API Request:', url);

     /* 
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      // Fejlesztési környezetben SSL hibák figyelmen kívül hagyása
      ...(process.env.NODE_ENV === 'development' && {
        // A böngésző nem támogatja az agent opciót, de jelezzük a szándékot
      }),
      ...options,
    };
*/

    // Get current household for API requests
    const getCurrentHouseholdId = () => {
      try {
        const currentHousehold = localStorage.getItem('currentHousehold');
        return currentHousehold ? JSON.parse(currentHousehold).id : null;
      } catch (error) {
        return null;
      }
    };

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        // Add current household header
        ...(getCurrentHouseholdId() && { 'X-Current-Household': getCurrentHouseholdId() }),
        ...options.headers,
      },
      
      // JAVÍTÁS: Add hozzá ezt a sort
      credentials: 'include', // Sütik küldése cross-origin kéréseknél

      ...(process.env.NODE_ENV === 'development' && {
        // ...
      }),
      ...options,
    };

    // Debug headers kikapcsolva
    // console.log('Headers:', config.headers);

    
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      // Token lejárt - próbáljuk meg frissíteni
      if (response.status === 401 && token) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Újra próbáljuk az eredeti kérést
          config.headers.Authorization = `Bearer ${this.getToken()}`;
          const retryResponse = await fetch(url, config);
          return this.handleResponse(retryResponse);
        } else {
          // Refresh sikertelen - kijelentkeztetjük
          this.logout();
          throw new Error('Session expired');
        }
      }

      return this.handleResponse(response);
    } catch (error) {
      console.error('API Request Error:', error);
      
      // SSL tanúsítvány hiba kezelése
      if (error.message.includes('net::ERR_CERT') || error.message.includes('SSL')) {
        console.warn('SSL tanúsítvány hiba. Kérjük látogassa meg: https://192.168.0.19:3001/health és fogadja el a tanúsítványt!');
        throw new Error('SSL tanúsítvány hiba. Kérjük fogadja el a backend tanúsítványát a böngészőben!');
      }
      
      throw error;
    }
  }

  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        throw new ApiError(data.error || 'API Error', response.status, data);
      }
      
      return data;
    }
    
    if (!response.ok) {
      throw new ApiError('Network Error', response.status);
    }
    
    return response;
  }

  // Token frissítés
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setToken(data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.tokens.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    
    return false;
  }

  // Kijelentkezés
  logout() {
    this.setToken(null);
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  // HTTP metódusok
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
    });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data,
    });
  }
}

// Custom Error osztály
class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Singleton instance
const apiService = new ApiService();

export default apiService;
export { ApiError };
