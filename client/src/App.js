import React, { useState, useEffect } from 'react';
import './App.css';
import './styles/themes.css';
import './styles/dark-theme-fixes.css';
import './styles/mobile.css';
import ProductList from './components/ProductList';
import NewProductModal from './components/NewProductModal';
import LoginPage from './components/LoginPage';
import UserProfile from './components/UserProfile';
import WelcomeMessage from './components/WelcomeMessage';
import ShoppingList from './components/ShoppingList';
import RecipesList from './components/RecipesList';
import SharedRecipePage from './components/SharedRecipePage';
import NotificationBanner from './components/NotificationBanner';
import HouseholdManager from './components/HouseholdManager';
import ThemeToggle from './components/ThemeToggle';
import Utilities from './components/Utilities';
import MinimalTest from './components/MinimalTest';
import PWAPrompt from './components/PWAPrompt';
import Statistics from './components/Statistics';
import Settings from './components/Settings';
import InstallPrompt from './components/InstallPrompt';
import OfflineIndicator from './components/OfflineIndicator';
// import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { useDarkThemeForce } from './hooks/useDarkThemeForce';
import authService from './services/authService';
import householdsService from './services/householdsService';
import * as serviceWorker from './utils/serviceWorker';
import inventoryService from './services/inventoryService';
import shoppingListService from './services/shoppingListService';

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

  // Ellenőrizzük, hogy shared recipe URL-e
  const currentPath = window.location.pathname;
  const isSharedRecipePage = currentPath.startsWith('/shared-recipe/');
  const shareId = isSharedRecipePage ? currentPath.split('/shared-recipe/')[1] : null;

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleAddProduct = async (newProduct) => {
    console.log('handleAddProduct called with:', newProduct);
    try {
      setInventoryLoading(true);
      console.log('Adding inventory item...');
      const result = await inventoryService.addInventoryItem(newProduct);
      console.log('Inventory item added:', result);
      console.log('Reloading inventory...');
      await loadInventory(); // Frissítjük a listát
      console.log('Closing modal...');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding product:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        data: error.data,
        response: error.response
      });
      alert('Hiba történt a termék hozzáadásakor: ' + JSON.stringify(error.data || error.message));
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
    await loadShoppingListCount(); // Bevásárlólista számláló frissítése
    setShowHouseholdManager(false);
  };

  const handleUpdateProfile = async (updatedData) => {
    try {
      console.log('Updating profile with:', updatedData);
      
      // Backend API hívás az authService-en keresztül
      const updatedUser = await authService.updateProfile(updatedData);
      
      console.log('Profile updated successfully:', updatedUser);
      
      // State frissítése
      setUser(updatedUser);
      
      return Promise.resolve(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
      return Promise.reject(error);
    }
  };

  // Alkalmazás inicializálása
  useEffect(() => {
    initializeApp();
    
    // Service Worker regisztráció (fejlesztésben kikapcsolva SSL problémák miatt)
    if (process.env.NODE_ENV === 'production') {
      try {
        serviceWorker.register({
          onSuccess: () => {
            console.log('PWA: Service Worker regisztrálva és cache-elve offline használatra');
          },
          onUpdate: () => {
            console.log('PWA: Új tartalom elérhető, frissítés szükséges');
          }
        });
      } catch (error) {
        console.warn('PWA: Service Worker regisztráció sikertelen (SSL hiba):', error);
      }
    } else {
      console.log('PWA: Service Worker regisztráció kihagyva fejlesztési módban');
    }
    
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
        await loadShoppingListCount(); // Bevásárlólista számláló betöltése
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

  // Bevásárlólista számláló betöltése
  const loadShoppingListCount = async () => {
    try {
      console.log('🛒 Bevásárlólista számláló betöltése...');
      const defaultListItems = await shoppingListService.getDefaultListItems();
      const formattedItems = defaultListItems.map(item => 
        shoppingListService.formatItemForDisplay(item)
      );
      setShoppingItems(formattedItems);
      console.log('✅ Bevásárlólista betöltve:', formattedItems.filter(item => !item.purchased).length, 'aktív tétel');
    } catch (error) {
      console.warn('⚠️ Bevásárlólista betöltési hiba, lokális tárolás használata:', error.message);
      // Fallback: lokális tárolás használata
      try {
        const localItems = shoppingListService.getLocalShoppingItems();
        const formattedItems = localItems.map(item => 
          shoppingListService.formatItemForDisplay(item)
        );
        setShoppingItems(formattedItems);
      } catch (localError) {
        console.error('❌ Lokális bevásárlólista betöltési hiba:', localError);
        setShoppingItems([]);
      }
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

  // Shared Recipe Page - NINCS SZÜKSÉG BEJELENTKEZÉSRE!
  if (isSharedRecipePage && shareId) {
    return <SharedRecipePage shareId={shareId} />;
  }

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
      <OfflineIndicator />
      <InstallPrompt />
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
            <button 
              className={`nav-button ${currentView === 'statistics' ? 'active' : ''}`}
              onClick={() => setCurrentView('statistics')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">Statisztikák</span>
            </button>
          </nav>
        </div>
        
        <div className="header-right">
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
              onAddNew={handleOpenModal}
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
        ) : currentView === 'statistics' ? (
          <Statistics 
            currentHousehold={currentHousehold}
          />
        ) : currentView === 'settings' ? (
          <Settings 
            user={user}
            currentHousehold={currentHousehold}
            onUpdateProfile={handleUpdateProfile}
            onShowHouseholdManager={() => setShowHouseholdManager(true)}
            onNavigateToUtilities={() => setCurrentView('utilities')}
          />
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
          householdId={currentHousehold?.id}
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
      
      {/* PWA Prompt */}
      <PWAPrompt />
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
