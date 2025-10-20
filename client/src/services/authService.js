import apiService from './api';

class AuthService {
  // Regisztráció
  async register(userData) {
    try {
      const response = await apiService.post('/auth/register', userData);
      
      if (response.tokens) {
        this.handleAuthSuccess(response);
      }
      
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Bejelentkezés
  async login(credentials) {
    try {
      const response = await apiService.post('/auth/login', credentials);
      
      if (response.tokens) {
        this.handleAuthSuccess(response);
      }
      
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Demo bejelentkezés
  async demoLogin() {
    try {
      const response = await apiService.post('/auth/demo-login');
      
      if (response.tokens) {
        this.handleAuthSuccess(response);
      }
      
      return response;
    } catch (error) {
      console.error('Demo login error:', error);
      throw error;
    }
  }

  // Sikeres autentikáció kezelése
  handleAuthSuccess(response) {
    const { user, tokens } = response;
    
    // Tokenek mentése
    apiService.setToken(tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    
    // Felhasználó adatok mentése
    localStorage.setItem('user', JSON.stringify(user));
    
    // Event dispatch a komponenseknek
    window.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: { user, isAuthenticated: true }
    }));
  }

  // Kijelentkezés
  async logout() {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.handleLogout();
    }
  }

  // Kijelentkezés kezelése
  handleLogout() {
    apiService.setToken(null);
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    window.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: { user: null, isAuthenticated: false }
    }));
  }

  // Aktuális felhasználó lekérése
  async getCurrentUser() {
    try {
      const response = await apiService.get('/auth/me');
      
      // Frissítjük a helyi tárolót
      localStorage.setItem('user', JSON.stringify(response.user));
      
      return response.user;
    } catch (error) {
      console.error('Get current user error:', error);
      
      // Ha nem sikerül, töröljük a helyi adatokat
      this.handleLogout();
      throw error;
    }
  }

  // Bejelentkezett állapot ellenőrzése
  isAuthenticated() {
    const token = apiService.getToken();
    const user = this.getStoredUser();
    return !!(token && user);
  }

  // Tárolt felhasználó lekérése
  getStoredUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing stored user:', error);
      return null;
    }
  }

  // Profil frissítése
  async updateProfile(profileData) {
    try {
      await apiService.put('/users/profile', profileData);
      
      // Frissítjük a felhasználó adatokat
      const updatedUser = await this.getCurrentUser();
      
      return updatedUser;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Beállítások frissítése
  async updateSettings(settings) {
    try {
      await apiService.put('/users/settings', settings);
      
      // Frissítjük a felhasználó adatokat
      const updatedUser = await this.getCurrentUser();
      
      return updatedUser;
    } catch (error) {
      console.error('Update settings error:', error);
      throw error;
    }
  }

  // Token érvényességének ellenőrzése
  async validateToken() {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Automatikus bejelentkezés inicializálása
  async initializeAuth() {
    if (this.isAuthenticated()) {
      try {
        // Ellenőrizzük, hogy a token még érvényes-e
        const user = await this.getCurrentUser();
        
        window.dispatchEvent(new CustomEvent('authStateChanged', {
          detail: { user, isAuthenticated: true }
        }));
        
        return user;
      } catch (error) {
        console.error('Auth initialization failed:', error);
        this.handleLogout();
        return null;
      }
    }
    
    return null;
  }
}

// Singleton instance
const authService = new AuthService();

export default authService;
