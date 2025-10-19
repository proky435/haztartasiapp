import React, { useState } from 'react';
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

  const validateForm = () => {
    const newErrors = {};

    // Email validáció
    if (!formData.email) {
      newErrors.email = 'Email cím kötelező';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Érvénytelen email cím';
    }

    // Jelszó validáció
    if (!formData.password) {
      newErrors.password = 'Jelszó kötelező';
    } else if (formData.password.length < 6) {
      newErrors.password = 'A jelszónak legalább 6 karakter hosszúnak kell lennie';
    }

    // Regisztráció esetén további validációk
    if (!isLogin) {
      if (!formData.name) {
        newErrors.name = 'Név kötelező';
      }
      
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Jelszó megerősítése kötelező';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'A jelszavak nem egyeznek';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Szimulált API hívás
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Demo felhasználó bejelentkeztetése
      const userData = {
        id: 1,
        name: isLogin ? 'Demo Felhasználó' : formData.name,
        email: formData.email
      };
      
      onLogin(userData);
    } catch (error) {
      setErrors({ general: 'Hiba történt. Próbáld újra!' });
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

          <div className="demo-info">
            <p><strong>Demo verzió:</strong></p>
            <p>Bármilyen email és jelszó (min. 6 karakter) használható</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
