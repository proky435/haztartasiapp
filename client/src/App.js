import React, { useState, useEffect } from 'react';
import './App.css';
import ProductList from './components/ProductList';
import NewProductModal from './components/NewProductModal';
import LoginPage from './components/LoginPage';
import UserProfile from './components/UserProfile';
import WelcomeMessage from './components/WelcomeMessage';
import ShoppingList from './components/ShoppingList';
import NotificationBanner from './components/NotificationBanner';

function App() {
  const [user, setUser] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState('inventory'); // 'inventory' vagy 'shopping'
  const [shoppingItems, setShoppingItems] = useState([
    { id: 1, name: 'Alma', purchased: false, addedDate: '2024-10-19' },
    { id: 2, name: 'Kenyér', purchased: true, addedDate: '2024-10-18' },
  ]);
  const [products, setProducts] = useState([
    { 
      id: 1, 
      name: 'Tej', 
      quantity: 2, 
      expiryDate: '2024-10-25',
      location: 'Hűtő',
      barcode: '1234567890123'
    },
    { 
      id: 2, 
      name: 'Kenyér', 
      quantity: 1, 
      expiryDate: '2024-10-22',
      location: 'Kamra',
      barcode: null
    },
    { 
      id: 3, 
      name: 'Tojás', 
      quantity: 12, 
      expiryDate: '2024-10-30',
      location: 'Hűtő',
      barcode: '9876543210987'
    },
  ]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleAddProduct = (newProduct) => {
    setProducts([...products, { ...newProduct, id: Date.now() }]);
    handleCloseModal();
  };

  const handleUpdateProduct = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      handleDeleteProduct(productId);
    } else {
      setProducts(products.map(p => p.id === productId ? { ...p, quantity: newQuantity } : p));
    }
  };

  const handleDeleteProduct = (productId) => {
    const productToDelete = products.find(p => p.id === productId);
    if (productToDelete) {
      // Automatikusan hozzáadás a bevásárlólistához
      const shoppingItem = {
        id: Date.now(),
        name: productToDelete.name,
        purchased: false,
        addedDate: new Date().toISOString(),
        fromProduct: true
      };
      setShoppingItems(prev => [...prev, shoppingItem]);
    }
    setProducts(products.filter(p => p.id !== productId));
  };

  // Bevásárlólista kezelő funkciók
  const handleItemPurchased = (itemId, purchased) => {
    setShoppingItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, purchased } : item
      )
    );
  };

  const handleItemRemoved = (itemId) => {
    setShoppingItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Felhasználó kezelő funkciók
  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Új felhasználó esetén welcome üzenet
    const isNewUser = !localStorage.getItem('hasSeenWelcome');
    if (isNewUser) {
      setShowWelcome(true);
      localStorage.setItem('hasSeenWelcome', 'true');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setShowUserProfile(false);
    localStorage.removeItem('user');
  };

  const handleUpdateProfile = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Felhasználó betöltése localStorage-ból
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

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
              📦 Készlet ({products.length})
            </button>
            <button 
              className={`nav-button ${currentView === 'shopping' ? 'active' : ''}`}
              onClick={() => setCurrentView('shopping')}
            >
              🛒 Bevásárlás ({shoppingItems.filter(item => !item.purchased).length})
            </button>
          </nav>
        </div>
        
        <div className="header-right">
          {currentView === 'inventory' && (
            <button className="add-product-button" onClick={handleOpenModal}>
              + Új Termék
            </button>
          )}
          
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
          <ProductList 
            products={products} 
            onUpdate={handleUpdateProduct}
            onDelete={handleDeleteProduct}
          />
        ) : (
          <ShoppingList 
            shoppingItems={shoppingItems}
            onItemPurchased={handleItemPurchased}
            onItemRemoved={handleItemRemoved}
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
    </div>
  );
}

export default App;
