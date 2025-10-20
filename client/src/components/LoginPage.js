import React, { useState } from 'react';
import authService from '../services/authService';
import './LoginPage.css';

function LoginPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Hiba törlése amikor a felhasználó elkezd gépelni
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validáció
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email cím megadása kötelező';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Érvénytelen email cím';
    }
    
    if (!formData.password) {
      newErrors.password = 'Jelszó megadása kötelező';
    } else if (formData.password.length < 6) {
      newErrors.password = 'A jelszónak legalább 6 karakter hosszúnak kell lennie';
    }
    
    if (!isLogin) {
      if (!formData.name) {
        newErrors.name = 'Név megadása kötelező';
      }
      
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Jelszó megerősítése kötelező';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'A jelszavak nem egyeznek';
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      let response;
      
      if (isLogin) {
        // Bejelentkezés
        response = await authService.login({
          email: formData.email,
          password: formData.password
        });
      } else {
        // Regisztráció
        response = await authService.register({
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          name: formData.name
        });
      }
      
      // Sikeres autentikáció
      onLogin(response.user);
      
    } catch (error) {
      console.error('Auth error:', error);
      
      // Hiba kezelése
      if (error.data && error.data.details) {
        // Validációs hibák
        const apiErrors = {};
        error.data.details.forEach(detail => {
          if (detail.path) {
            apiErrors[detail.path] = detail.msg;
          }
        });
        setErrors(apiErrors);
      } else {
        // Általános hiba
        setErrors({
          general: error.data?.message || error.message || 'Hiba történt a bejelentkezés során'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: ''
    });
    setErrors({});
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setErrors({});
    
    try {
      const response = await authService.demoLogin();
      onLogin(response.user);
    } catch (error) {
      console.error('Demo login error:', error);
      setErrors({
        general: 'Demo bejelentkezés sikertelen. Ellenőrizd, hogy a backend szerver fut-e.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          <div className="login-header">
            <div className="app-logo">
              <span className="logo-icon">🏠</span>
              <h1>Háztartási App</h1>
            </div>
            <p className="app-subtitle">
              {isLogin ? 'Üdvözlünk vissza!' : 'Csatlakozz hozzánk!'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {errors.general && (
              <div className="error-message general-error">
                {errors.general}
              </div>
            )}

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="name">Teljes név</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={errors.name ? 'error' : ''}
                  placeholder="Add meg a neved"
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email cím</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? 'error' : ''}
                placeholder="pelda@email.com"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Jelszó</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? 'error' : ''}
                placeholder="••••••••"
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Jelszó megerősítése</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={errors.confirmPassword ? 'error' : ''}
                  placeholder="••••••••"
                />
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>
            )}

            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner">🔄</span>
              ) : (
                isLogin ? 'Bejelentkezés' : 'Regisztráció'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>
              {isLogin ? 'Még nincs fiókod?' : 'Már van fiókod?'}
              <button 
                type="button" 
                className="switch-mode-button"
                onClick={switchMode}
              >
                {isLogin ? 'Regisztrálj' : 'Jelentkezz be'}
              </button>
            </p>
          </div>

          <div className="demo-section">
            <div className="divider">
              <span>vagy</span>
            </div>
            <button 
              type="button" 
              className="demo-button"
              onClick={handleDemoLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner">🔄</span>
              ) : (
                <>
                  <span className="demo-icon">🚀</span>
                  Demo bejelentkezés
                </>
              )}
            </button>
            <p className="demo-info">
              Próbáld ki az alkalmazást demo adatokkal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
