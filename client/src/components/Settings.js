import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ThemeToggle from './ThemeToggle';
import api from '../services/api';
import pushNotificationService from '../services/pushNotificationService';
import './Settings.css';

function Settings({ user, currentHousehold, onUpdateProfile, onShowHouseholdManager, onNavigateToUtilities }) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Consumption tracking beállítások
  const [trackingSettings, setTrackingSettings] = useState({
    consumptionTracking: true,
    shoppingPatternAnalysis: true,
    autoSuggestions: true
  });
  const [notificationSettings, setNotificationSettings] = useState({
    lowStockPredictions: true,
    shoppingPatternSuggestions: true,
    wasteAlerts: true,
    weeklySummary: false
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  
  // Push notification beállítások
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [isCheckingPush, setIsCheckingPush] = useState(true);
  
  // Cron scheduler beállítások
  const [cronSettings, setCronSettings] = useState({
    cron_enabled: true,
    low_stock_cron: '0 9 * * *',
    expiry_warning_cron: '0 8 * * *',
    shopping_reminder_cron: '0 8 * * 1'
  });
  const [cronStatus, setCronStatus] = useState(null);
  const [isLoadingCron, setIsLoadingCron] = useState(true);
  
  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);

  // User prop változásának figyelése
  useEffect(() => {
    setFormData({
      name: user.name,
      email: user.email
    });
  }, [user]);

  // PWA Install Prompt listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt event caught in Settings!');
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Ellenőrizzük, hogy már telepítve van-e
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setCanInstall(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Tracking beállítások betöltése
  useEffect(() => {
    const loadTrackingSettings = async () => {
      if (!currentHousehold?.id) return;
      
      try {
        setIsLoadingSettings(true);
        
        // Household settings lekérése
        const householdResponse = await api.get(`/households/${currentHousehold.id}/settings`);
        if (householdResponse.data) {
          setTrackingSettings({
            consumptionTracking: householdResponse.data.consumption_tracking_enabled ?? true,
            shoppingPatternAnalysis: householdResponse.data.shopping_pattern_analysis_enabled ?? true,
            autoSuggestions: householdResponse.data.auto_suggestions_enabled ?? true
          });
        }
        
        // User notification settings lekérése
        const userResponse = await api.get(`/users/${user.id}/settings`);
        if (userResponse.data?.consumption_notifications) {
          setNotificationSettings({
            lowStockPredictions: userResponse.data.consumption_notifications.low_stock_predictions ?? true,
            shoppingPatternSuggestions: userResponse.data.consumption_notifications.shopping_pattern_suggestions ?? true,
            wasteAlerts: userResponse.data.consumption_notifications.waste_alerts ?? true,
            weeklySummary: userResponse.data.consumption_notifications.weekly_summary ?? false
          });
        }
      } catch (error) {
        console.error('Error loading tracking settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    
    loadTrackingSettings();
  }, [currentHousehold?.id, user.id]);

  // Push notification állapot ellenőrzése
  useEffect(() => {
    const checkPushStatus = async () => {
      try {
        setIsCheckingPush(true);
        const supported = pushNotificationService.isPushNotificationSupported();
        setPushSupported(supported);
        
        if (supported) {
          const subscribed = await pushNotificationService.isSubscribed();
          setPushEnabled(subscribed);
        }
      } catch (error) {
        console.error('Error checking push status:', error);
      } finally {
        setIsCheckingPush(false);
      }
    };
    
    checkPushStatus();
  }, []);

  // Cron beállítások betöltése
  useEffect(() => {
    const loadCronSettings = async () => {
      try {
        setIsLoadingCron(true);
        const response = await api.get('/system-settings/cron');
        if (response.settings) {
          setCronSettings(response.settings);
        }
        if (response.status) {
          setCronStatus(response.status);
        }
      } catch (error) {
        console.error('Error loading cron settings:', error);
      } finally {
        setIsLoadingCron(false);
      }
    };
    
    loadCronSettings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      setSaveMessage('✗ A név és email mező nem lehet üres');
      return;
    }

    setIsSaving(true);
    setSaveMessage('');
    
    try {
      await onUpdateProfile(formData);
      setSaveMessage('✓ Profil sikeresen frissítve!');
      setTimeout(() => {
        setIsEditingProfile(false);
        setSaveMessage('');
      }, 1500);
    } catch (error) {
      console.error('Profile update error:', error);
      setSaveMessage('✗ Hiba történt a mentés során');
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      name: user.name,
      email: user.email
    });
    setIsEditingProfile(false);
    setSaveMessage('');
  };

  // Tracking beállítások mentése
  const handleTrackingSettingChange = async (setting, value) => {
    try {
      setTrackingSettings(prev => ({ ...prev, [setting]: value }));
      
      await api.put(`/households/${currentHousehold.id}/settings`, {
        [`${setting.replace(/([A-Z])/g, '_$1').toLowerCase()}_enabled`]: value
      });
    } catch (error) {
      console.error('Error saving tracking setting:', error);
      // Visszaállítjuk az előző értéket hiba esetén
      setTrackingSettings(prev => ({ ...prev, [setting]: !value }));
    }
  };

  // Notification beállítások mentése
  const handleNotificationSettingChange = async (setting, value) => {
    try {
      setNotificationSettings(prev => ({ ...prev, [setting]: value }));
      
      const updatedSettings = {
        ...notificationSettings,
        [setting]: value
      };
      
      await api.put(`/users/${user.id}/settings`, {
        consumption_notifications: {
          low_stock_predictions: updatedSettings.lowStockPredictions,
          shopping_pattern_suggestions: updatedSettings.shoppingPatternSuggestions,
          waste_alerts: updatedSettings.wasteAlerts,
          weekly_summary: updatedSettings.weeklySummary
        }
      });
    } catch (error) {
      console.error('Error saving notification setting:', error);
      // Visszaállítjuk az előző értéket hiba esetén
      setNotificationSettings(prev => ({ ...prev, [setting]: !value }));
    }
  };

  // Push notification toggle kezelő
  const handlePushToggle = async () => {
    try {
      if (pushEnabled) {
        // Leiratkozás
        await pushNotificationService.unsubscribeFromPushNotifications();
        setPushEnabled(false);
        toast.success('Push értesítések kikapcsolva! ✅');
      } else {
        // Feliratkozás
        await pushNotificationService.subscribeToPushNotifications();
        setPushEnabled(true);
        toast.success('Push értesítések bekapcsolva! ✅');
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      toast.error('Hiba: ' + (error.message || 'Push értesítések beállítása sikertelen'));
    }
  };

  // Teszt notification küldése
  const handleSendTestNotification = async () => {
    try {
      await pushNotificationService.sendTestNotification();
      toast.success('Teszt értesítés elküldve! Nézd meg az értesítéseid. 🔔');
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Hiba: ' + (error.message || 'Teszt értesítés küldése sikertelen'));
    }
  };

  // Automatikus értesítések trigger (scheduler)
  const handleTriggerScheduler = async () => {
    try {
      const response = await api.post('/scheduler/run-all');
      toast.success(`${response.message} - Készlet: ${response.details.lowStock.notificationsSent}, Lejárat: ${response.details.expiry.notificationsSent}, Vásárlás: ${response.details.shopping.notificationsSent}`);
    } catch (error) {
      console.error('Error triggering scheduler:', error);
      toast.error('Hiba: ' + (error.message || 'Scheduler futtatása sikertelen'));
    }
  };

  // Cron toggle kezelő
  const handleCronToggle = async () => {
    try {
      const newEnabled = !cronSettings.cron_enabled;
      
      await api.put('/system-settings/cron', {
        ...cronSettings,
        cron_enabled: newEnabled
      });
      
      setCronSettings(prev => ({ ...prev, cron_enabled: newEnabled }));
      
      // Frissítjük a státuszt
      const response = await api.get('/system-settings/cron');
      if (response.status) {
        setCronStatus(response.status);
      }
      
      newEnabled ? toast.success('Automatikus értesítések bekapcsolva! ✅') : toast.warning('Automatikus értesítések kikapcsolva! ⚠️');
    } catch (error) {
      console.error('Error toggling cron:', error);
      toast.error('Hiba: ' + (error.message || 'Cron beállítás sikertelen'));
    }
  };

  // PWA Install handler
  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      toast.warning('A telepítés jelenleg nem elérhető. Az alkalmazás már telepítve van, vagy a böngésző nem támogatja. ⚠️');
      return;
    }

    try {
      // Prompt megjelenítése
      console.log('Showing install prompt...');
      deferredPrompt.prompt();

      // Várjuk a user választását
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User choice: ${outcome}`);

      if (outcome === 'accepted') {
        console.log('✅ User elfogadta a telepítést');
        toast.success('Alkalmazás telepítése megkezdődött! ✅');
        setCanInstall(false);
      } else {
        console.log('❌ User elutasította a telepítést');
        toast.info('Telepítés megszakítva ℹ️');
      }

      // Prompt elrejtése
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Install error:', error);
      toast.error('Hiba történt a telepítés során: ' + error.message);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>⚙️ Általános Beállítások</h2>
        <p>Háztartás: {currentHousehold?.name}</p>
      </div>
      
      <div className="settings-content">
        {/* Felhasználói beállítások */}
        <div className="settings-section">
          <h3>👤 Felhasználói beállítások</h3>
          
          {!isEditingProfile ? (
            <>
              <div className="profile-display">
                <div className="profile-field">
                  <label>Név:</label>
                  <span>{user.name}</span>
                </div>
                <div className="profile-field">
                  <label>Email:</label>
                  <span>{user.email}</span>
                </div>
              </div>
              <button 
                className="settings-action-btn"
                onClick={() => setIsEditingProfile(true)}
              >
                ✏️ Profil szerkesztése
              </button>
            </>
          ) : (
            <div className="profile-edit-form">
              <div className="form-group">
                <label htmlFor="name">Név:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Név"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Email"
                />
              </div>
              
              {saveMessage && (
                <div className={`save-message ${saveMessage.includes('✓') ? 'success' : 'error'}`}>
                  {saveMessage}
                </div>
              )}
              
              <div className="form-actions">
                <button 
                  onClick={handleSaveProfile}
                  className="save-btn"
                  disabled={isSaving}
                >
                  {isSaving ? '⏳ Mentés...' : '✓ Mentés'}
                </button>
                <button 
                  onClick={handleCancelEdit}
                  className="cancel-btn"
                  disabled={isSaving}
                >
                  ✕ Mégse
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Háztartás beállítások */}
        <div className="settings-section">
          <h3>🏠 Háztartás beállítások</h3>
          <p>Háztartás kezelése, tagok meghívása</p>
          <button 
            className="settings-action-btn"
            onClick={onShowHouseholdManager}
          >
            Háztartások kezelése
          </button>
        </div>

        {/* Téma beállítások */}
        <div className="settings-section">
          <h3>🎨 Téma beállítások</h3>
          <p>Alkalmazás megjelenésének testreszabása</p>
          <div className="theme-settings">
            <ThemeToggle />
          </div>
        </div>

        {/* Fogyasztás Tracking Beállítások */}
        <div className="settings-section">
          <h3>📊 Fogyasztás Tracking</h3>
          <p>Automatikus fogyasztási statisztikák és javaslatok</p>
          
          {isLoadingSettings ? (
            <div className="loading-settings">⏳ Beállítások betöltése...</div>
          ) : (
            <>
              <div className="tracking-settings">
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Fogyasztás követése</label>
                    <span className="setting-description">
                      Automatikus rögzítés amikor termékek mennyisége csökken
                    </span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={trackingSettings.consumptionTracking}
                      onChange={(e) => handleTrackingSettingChange('consumptionTracking', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Vásárlási mintázat elemzés</label>
                    <span className="setting-description">
                      Elemzi mikor és milyen gyakran vásárolsz termékeket
                    </span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={trackingSettings.shoppingPatternAnalysis}
                      onChange={(e) => handleTrackingSettingChange('shoppingPatternAnalysis', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Automatikus javaslatok</label>
                    <span className="setting-description">
                      Bevásárlási javaslatok fogyasztás és mintázatok alapján
                    </span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={trackingSettings.autoSuggestions}
                      onChange={(e) => handleTrackingSettingChange('autoSuggestions', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <h4 style={{ marginTop: '20px' }}>🔔 Értesítési beállítások</h4>
              <div className="notification-settings">
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Készlet elfogyási előrejelzések</label>
                    <span className="setting-description">
                      Értesítés ha egy termék hamarosan elfogyhat
                    </span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={notificationSettings.lowStockPredictions}
                      onChange={(e) => handleNotificationSettingChange('lowStockPredictions', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Vásárlási mintázat javaslatok</label>
                    <span className="setting-description">
                      Értesítés vásárlási szokások alapján
                    </span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={notificationSettings.shoppingPatternSuggestions}
                      onChange={(e) => handleNotificationSettingChange('shoppingPatternSuggestions', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Pazarlás figyelmeztetések</label>
                    <span className="setting-description">
                      Értesítés lejárt vagy megromlott termékekről
                    </span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={notificationSettings.wasteAlerts}
                      onChange={(e) => handleNotificationSettingChange('wasteAlerts', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Heti összefoglaló</label>
                    <span className="setting-description">
                      Heti statisztika emailben
                    </span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={notificationSettings.weeklySummary}
                      onChange={(e) => handleNotificationSettingChange('weeklySummary', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <h4 style={{ marginTop: '20px' }}>📱 Push Értesítések</h4>
              <div className="push-notification-settings">
                {!pushSupported ? (
                  <div className="push-not-supported">
                    <p>❌ Push értesítések nem támogatottak ebben a böngészőben</p>
                    <small>Használj modern böngészőt (Chrome, Firefox, Edge)</small>
                  </div>
                ) : isCheckingPush ? (
                  <p>Ellenőrzés...</p>
                ) : (
                  <>
                    <div className="setting-item">
                      <div className="setting-info">
                        <label>Push értesítések engedélyezése</label>
                        <span className="setting-description">
                          Azonnali értesítések ezen az eszközön
                        </span>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={pushEnabled}
                          onChange={handlePushToggle}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    {pushEnabled && (
                      <div className="push-test-section">
                        <button 
                          className="test-notification-btn"
                          onClick={handleSendTestNotification}
                        >
                          🧪 Teszt értesítés küldése
                        </button>
                        <button 
                          className="scheduler-trigger-btn"
                          onClick={handleTriggerScheduler}
                        >
                          🤖 Automatikus értesítések most
                        </button>
                        <small>Teszt: ellenőrizd az értesítéseket | Automatikus: készlet, lejárat, vásárlás</small>
                      </div>
                    )}
                  </>
                )}
              </div>

              <h4 style={{ marginTop: '20px' }}>⏰ Automatikus Ütemezés (Cron)</h4>
              <div className="cron-settings">
                {isLoadingCron ? (
                  <p>Betöltés...</p>
                ) : (
                  <>
                    <div className="setting-item">
                      <div className="setting-info">
                        <label>Automatikus értesítések ütemezése</label>
                        <span className="setting-description">
                          Napi automatikus ellenőrzés és értesítések küldése
                        </span>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={cronSettings.cron_enabled}
                          onChange={handleCronToggle}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    {cronSettings.cron_enabled && cronStatus && (
                      <div className="cron-status">
                        <p className="cron-status-title">📅 Ütemezett Feladatok:</p>
                        <ul className="cron-schedule-list">
                          <li>
                            <span className="cron-icon">📦</span>
                            <strong>Készlet ellenőrzés:</strong> Naponta 9:00
                            <span className={`status-badge ${cronStatus.jobs.lowStock ? 'active' : 'inactive'}`}>
                              {cronStatus.jobs.lowStock ? '✓ Aktív' : '✗ Inaktív'}
                            </span>
                          </li>
                          <li>
                            <span className="cron-icon">⏰</span>
                            <strong>Lejárati figyelmeztetés:</strong> Naponta 8:00
                            <span className={`status-badge ${cronStatus.jobs.expiry ? 'active' : 'inactive'}`}>
                              {cronStatus.jobs.expiry ? '✓ Aktív' : '✗ Inaktív'}
                            </span>
                          </li>
                          <li>
                            <span className="cron-icon">🛒</span>
                            <strong>Vásárlási emlékeztető:</strong> Hétfő 8:00
                            <span className={`status-badge ${cronStatus.jobs.shopping ? 'active' : 'inactive'}`}>
                              {cronStatus.jobs.shopping ? '✓ Aktív' : '✗ Inaktív'}
                            </span>
                          </li>
                        </ul>
                        <small className="cron-info">
                          ℹ️ Az értesítések csak akkor kerülnek kiküldésre, ha van releváns adat (pl. elfogyó termék)
                        </small>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* PWA Debug Info */}
        <div className="settings-section">
          <h3>📱 PWA Információk</h3>
          <div className="pwa-debug-info">
            <p><strong>Service Worker:</strong> {navigator.serviceWorker ? '✓ Támogatott' : '✗ Nem támogatott'}</p>
            <p><strong>Standalone mód:</strong> {window.matchMedia('(display-mode: standalone)').matches ? '✓ Telepítve' : '✗ Böngészőben'}</p>
            <p><strong>Online állapot:</strong> {navigator.onLine ? '✓ Online' : '✗ Offline'}</p>
            <p><strong>HTTPS:</strong> {window.location.protocol === 'https:' ? '✓ Biztonságos' : '⚠ HTTP'}</p>
            <p><strong>Install Prompt:</strong> {(() => {
              const dismissed = localStorage.getItem('pwa-install-dismissed');
              if (!dismissed) return '✓ Aktív';
              const dismissedTime = parseInt(dismissed);
              const daysSince = Math.floor((Date.now() - dismissedTime) / (1000 * 60 * 60 * 24));
              return `⏸ Elrejtve (${daysSince} napja)`;
            })()}</p>
            <p><strong>Telepítés elérhető:</strong> {canInstall ? '✓ Igen' : '✗ Nem'}</p>
            
            {/* Fő telepítés gomb */}
            {canInstall ? (
              <button 
                className="settings-action-btn primary-install-btn"
                onClick={handleInstallPWA}
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  padding: '12px 24px',
                  marginTop: '12px',
                  marginBottom: '12px'
                }}
              >
                📱 Alkalmazás Telepítése
              </button>
            ) : (
              <button 
                className="settings-action-btn"
                onClick={handleInstallPWA}
                style={{ 
                  background: '#6c757d',
                  color: 'white',
                  fontSize: '14px',
                  padding: '10px 20px',
                  marginTop: '12px',
                  marginBottom: '12px',
                  opacity: 0.7
                }}
              >
                ℹ️ Telepítés nem elérhető
              </button>
            )}
            
            {/* Debug gombok */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              <button 
                className="settings-action-btn"
                onClick={() => {
                  if (window.confirm('Biztosan visszaállítod az install prompt-ot? Az oldal újratöltődik.')) {
                    localStorage.removeItem('pwa-install-dismissed');
                    console.log('Install prompt dismissed flag törölve');
                    // Oldal újratöltése 500ms késleltetéssel
                    setTimeout(() => {
                      window.location.reload();
                    }, 500);
                  }
                }}
              >
                🔄 Reset & Reload
              </button>
              <button 
                className="settings-action-btn"
                onClick={() => {
                  localStorage.removeItem('pwa-install-dismissed');
                  console.log('Install prompt dismissed flag törölve - nincs reload');
                  toast.info('Install prompt visszaállítva! 5 másodperc múlva megjelenik (ha támogatott). ℹ️');
                }}
              >
                ✓ Reset (nincs reload)
              </button>
            </div>
          </div>
        </div>

        {/* Közműbeállítások */}
        <div className="settings-section">
          <h3>🔌 Közműbeállítások</h3>
          <p>A közműbeállítások a Közművek menüpontban érhetők el</p>
          <button 
            className="settings-action-btn"
            onClick={onNavigateToUtilities}
          >
            Közművek megnyitása
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
