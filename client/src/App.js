import React, { useState, useEffect } from 'react';
import './App.css';
import './styles/themes.css';
import './styles/dark-theme-fixes.css';
import ProductList from './components/ProductList';
import NewProductModal from './components/NewProductModal';
import LoginPage from './components/LoginPage';
import UserProfile from './components/UserProfile';
import WelcomeMessage from './components/WelcomeMessage';
import ShoppingList from './components/ShoppingList';
import RecipesList from './components/RecipesList';
import NotificationBanner from './components/NotificationBanner';
import HouseholdManager from './components/HouseholdManager';
import ThemeToggle from './components/ThemeToggle';
import Utilities from './components/Utilities';
import MinimalTest from './components/MinimalTest';
import { ThemeProvider } from './contexts/ThemeContext';
import { useDarkThemeForce } from './hooks/useDarkThemeForce';
import authService from './services/authService';
import householdsService from './services/householdsService';
import inventoryService from './services/inventoryService';

function AppContent() {
  // Use the dark theme force hook
  useDarkThemeForce();
  
  const [user, setUser] = useState(null);
  const [currentHousehold, setCurrentHousehold] = useState(null);
  const [households, setHouseholds] = useState([]);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showHouseholdManager, setShowHouseholdManager] = useState(false);
  const [currentView, setCurrentView] = useState('inventory'); // 'inventory', 'shopping', 'recipes', 'utilities', 'settings'
  const [isLoading, setIsLoading] = useState(true);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleAddProduct = async (newProduct) => {
    try {
      setInventoryLoading(true);
      await inventoryService.addInventoryItem(newProduct);
      await loadInventory(); // Frissítjük a listát
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Hiba történt a termék hozzáadásakor: ' + error.message);
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleUpdateProduct = async (productId, newQuantity) => {
    try {
      console.log('Termék frissítése:', { productId, newQuantity });
      
      if (newQuantity <= 0) {
        // Ha a mennyiség 0 vagy kevesebb, töröljük a terméket
        console.log('Mennyiség <= 0, termék törlése');
        await handleDeleteProduct(productId);
        return;
      }
      
      // Optimista UI frissítés - azonnal frissítjük a UI-t
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId 
            ? { ...product, quantity: newQuantity }
            : product
        )
      );
      
      // Backend frissítés
      await inventoryService.updateInventoryItem(productId, { quantity: newQuantity });
      console.log('Termék sikeresen frissítve a backend-en');
      
      // Biztonsági újratöltés (ha szükséges)
      setTimeout(() => {
        loadInventory();
      }, 500);
      
    } catch (error) {
      console.error('Error updating product:', error);
      // Ha hiba volt, töltjük újra a listát a backend-ről
      await loadInventory();
      alert('Hiba történt a termék frissítésekor: ' + error.message);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      console.log('Termék törlése:', productId);
      
      // Optimista UI frissítés - azonnal eltávolítjuk a UI-ból
      setProducts(prevProducts => 
        prevProducts.filter(product => product.id !== productId)
      );
      
      // Backend törlés
      await inventoryService.deleteInventoryItem(productId);
      console.log('Termék sikeresen törölve a backend-en');
      
      // Biztonsági újratöltés
      setTimeout(() => {
        loadInventory();
      }, 500);
      
    } catch (error) {
      console.error('Error deleting product:', error);
      // Ha hiba volt, töltjük újra a listát a backend-ről
      await loadInventory();
      alert('Hiba történt a termék törlésekor: ' + error.message);
    }
  };

  // Bevásárlólista kezelő funkciók (már nem használt - backend integráció miatt)

  // Felhasználó kezelő funkciók
  const handleLogin = async (userData) => {
    setUser(userData);
    setShowWelcome(true);
    
    // Háztartások betöltése bejelentkezés után
    await loadUserHouseholds(userData);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setCurrentHousehold(null);
      setHouseholds([]);
      setProducts([]);
      setShowUserProfile(false);
      
      // Cache-ek tisztítása
      householdsService.clearCurrentHouseholdCache();
      localStorage.removeItem('shoppingItems');
      localStorage.removeItem('inventoryItems');
    }
  };

  // Háztartás kezelő függvények
  const handleHouseholdChange = async (household) => {
    setCurrentHousehold(household);
    householdsService.setCurrentHousehold(household);
    await loadInventory();
    setShowHouseholdManager(false);
  };

  const handleUpdateProfile = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Alkalmazás inicializálása
  useEffect(() => {
    initializeApp();
    
    // Debug funkciók elérhetővé tétele a console-ból
    window.debugApp = {
      clearCache: () => householdsService.clearAllCache(),
      forceReset: () => householdsService.forceReset(),
      reloadHouseholds: () => loadUserHouseholds(),
      reloadInventory: () => loadInventory(),
      getCurrentHousehold: () => householdsService.getCurrentHousehold(),
      getHouseholds: () => households,
      getProducts: () => products,
      updateProduct: (id, quantity) => handleUpdateProduct(id, quantity)
    };
    console.log('🔧 Debug funkciók elérhetők: window.debugApp');
  }, []);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      
      // Próbáljuk meg inicializálni az auth-ot
      const authenticatedUser = await authService.initializeAuth();
      
      if (authenticatedUser) {
        setUser(authenticatedUser);
        await loadUserHouseholds(authenticatedUser);
      }
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserHouseholds = async () => {
    try {
      console.log('Háztartások betöltése...');
      
      // Először töröljük a cache-t ha problémás
      const savedHousehold = householdsService.getCurrentHousehold();
      
      let userHouseholds = await householdsService.getUserHouseholds();
      console.log('Betöltött háztartások:', userHouseholds.length, userHouseholds.map(h => ({ name: h.name, id: h.id, role: h.userRole })));
      
      // Ha nincs háztartás, hozzunk létre egy alapértelmezettet
      if (!userHouseholds || userHouseholds.length === 0) {
        console.log('Nincs háztartás, létrehozunk egy alapértelmezettet...');
        
        // Töröljük a cache-t mielőtt új háztartást hozunk létre
        householdsService.clearAllCache();
        
        const defaultHousehold = await householdsService.createHousehold({
          name: `${user.name} háztartása`,
          description: 'Alapértelmezett háztartás'
        });
        userHouseholds = [defaultHousehold];
        console.log('Új háztartás létrehozva:', defaultHousehold.name, defaultHousehold.id);
      }
      
      setHouseholds(userHouseholds);
      
      // Válasszuk ki az első háztartást vagy a korábban mentett (csak ha érvényes)
      let selectedHousehold = null;
      
      // Ellenőrizzük, hogy a mentett háztartás még mindig elérhető-e
      if (savedHousehold && userHouseholds.find(h => h.id === savedHousehold.id)) {
        selectedHousehold = savedHousehold;
        console.log('Mentett háztartás még érvényes:', savedHousehold.name);
      } else {
        selectedHousehold = userHouseholds[0] || null;
        if (savedHousehold) {
          console.warn('Mentett háztartás már nem elérhető, teljes cache törlése');
          householdsService.clearAllCache();
        }
        if (selectedHousehold) {
          console.log('Új háztartás kiválasztása:', selectedHousehold.name);
        }
      }
      
      if (selectedHousehold) {
        setCurrentHousehold(selectedHousehold);
        householdsService.setCurrentHousehold(selectedHousehold);
        await loadInventory(); // Készlet betöltése
      } else {
        console.error('Nincs elérhető háztartás - ez nem kellene hogy megtörténjen!');
        householdsService.clearAllCache();
      }
    } catch (error) {
      console.error('Error loading households:', error);
      // Ha hiba van, töröljük a cache-t és próbáljuk újra
      console.log('Hiba miatt cache törlése és újrapróbálás...');
      householdsService.clearAllCache();
    }
  };

  // Készlet betöltése
  const loadInventory = async () => {
    try {
      console.log('🔄 Készlet újratöltése...');
      setInventoryLoading(true);
      const inventory = await inventoryService.getCurrentHouseholdInventory();
      const formattedItems = inventory.items.map(item => 
        inventoryService.formatItemForDisplay(item)
      );
      console.log('✅ Készlet betöltve:', formattedItems.length, 'tétel');
      console.log('Termékek:', formattedItems.map(p => ({ id: p.id, name: p.name, quantity: p.quantity })));
      setProducts(formattedItems);
    } catch (error) {
      console.error('❌ Error loading inventory:', error);
      setProducts([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  // Click outside handler a user profile bezárásához
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserProfile && !event.target.closest('.user-menu')) {
        setShowUserProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserProfile]);

  // Ha nincs bejelentkezve, mutassuk a login oldalt
  // Loading állapot
  if (isLoading) {
    return (
      <div className="App loading-state">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Betöltés...</p>
        </div>
      </div>
    );
  }

  // Login oldal
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <NotificationBanner products={products} />
      <header className="App-header">
        <div className="header-left">
          <h1>Háztartási Készletkezelő</h1>
          
          
          <nav className="main-navigation">
            <button 
              className={`nav-button ${currentView === 'inventory' ? 'active' : ''}`}
              onClick={() => setCurrentView('inventory')}
            >
              <span className="nav-icon">📦</span>
              <span className="nav-text">Készlet</span>
              {products.length > 0 && <span className="nav-badge">{products.length}</span>}
            </button>
            <button 
              className={`nav-button ${currentView === 'shopping' ? 'active' : ''}`}
              onClick={() => setCurrentView('shopping')}
            >
              <span className="nav-icon">🛒</span>
              <span className="nav-text">Bevásárlás</span>
              {shoppingItems.filter(item => !item.purchased).length > 0 && <span className="nav-badge">{shoppingItems.filter(item => !item.purchased).length}</span>}
            </button>
            <button 
              className={`nav-button ${currentView === 'recipes' ? 'active' : ''}`}
              onClick={() => setCurrentView('recipes')}
            >
              <span className="nav-icon">🍳</span>
              <span className="nav-text">Receptek</span>
            </button>
            <button 
              className={`nav-button ${currentView === 'utilities' ? 'active' : ''}`}
              onClick={() => setCurrentView('utilities')}
            >
              <span className="nav-icon">🔌</span>
              <span className="nav-text">Közművek</span>
            </button>
          </nav>
        </div>
        
        <div className="header-right">
          <button className="add-product-button" onClick={handleOpenModal}>
            + Új Termék
          </button>
          
          <ThemeToggle onSettingsClick={() => setCurrentView('settings')} />
          
          <div className="user-menu">
            <button 
              className="user-button"
              onClick={() => setShowUserProfile(!showUserProfile)}
            >
              <span className="user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="user-name">{user.name}</span>
              <span className="dropdown-arrow">▼</span>
            </button>
            
            {showUserProfile && (
              <UserProfile 
                user={user}
                onLogout={handleLogout}
                onUpdateProfile={handleUpdateProfile}
              />
            )}
          </div>
        </div>
      </header>
      
      <main>
        {currentView === 'inventory' ? (
          inventoryLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Készlet betöltése...</p>
            </div>
          ) : (
            <ProductList 
              products={products} 
              onUpdate={handleUpdateProduct}
              onDelete={handleDeleteProduct}
            />
          )
        ) : currentView === 'shopping' ? (
          <ShoppingList 
            onItemsChange={(items) => setShoppingItems(items)}
            currentHousehold={currentHousehold}
          />
        ) : currentView === 'recipes' ? (
          <RecipesList 
            currentHousehold={currentHousehold}
          />
        ) : currentView === 'utilities' ? (
          <Utilities 
            currentHousehold={currentHousehold}
          />
        ) : currentView === 'settings' ? (
          <div className="settings-container">
            <div className="settings-header">
              <h2>⚙️ Általános Beállítások</h2>
              <p>Háztartás: {currentHousehold?.name}</p>
            </div>
            <div className="settings-content">
              <div className="settings-section">
                <h3>🏠 Háztartás beállítások</h3>
                <p>Háztartás kezelése, tagok meghívása</p>
                <button 
                  className="settings-action-btn"
                  onClick={() => setShowHouseholdManager(true)}
                >
                  Háztartások kezelése
                </button>
              </div>
              <div className="settings-section">
                <h3>👤 Felhasználói beállítások</h3>
                <p>Profil szerkesztése, jelszó módosítása</p>
                <button 
                  className="settings-action-btn"
                  onClick={() => setShowUserProfile(true)}
                >
                  Profil szerkesztése
                </button>
              </div>
              <div className="settings-section">
                <h3>🎨 Téma beállítások</h3>
                <p>Alkalmazás megjelenésének testreszabása</p>
                <div className="theme-settings">
                  <ThemeToggle />
                </div>
              </div>
              <div className="settings-section">
                <h3>🔌 Közműbeállítások</h3>
                <p>A közműbeállítások a Közművek menüpontban érhetők el</p>
                <button 
                  className="settings-action-btn"
                  onClick={() => setCurrentView('utilities')}
                >
                  Közművek megnyitása
                </button>
              </div>
            </div>
          </div>
        ) : (
          <ProductList 
            products={products} 
            onUpdate={handleUpdateProduct}
            onDelete={handleDeleteProduct}
          />
        )}
      </main>
      
      {isModalOpen && (
        <NewProductModal 
          onClose={handleCloseModal} 
          onAdd={handleAddProduct} 
        />
      )}
      
      {showWelcome && (
        <WelcomeMessage 
          user={user}
          onDismiss={() => setShowWelcome(false)}
        />
      )}

      {showHouseholdManager && (
        <HouseholdManager
          user={user}
          currentHousehold={currentHousehold}
          onHouseholdChange={handleHouseholdChange}
          onClose={() => setShowHouseholdManager(false)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
