import React, { useState } from 'react';
import './App.css';
import NewProductModal from './components/NewProductModal';
import ProductList from './components/ProductList';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState([
    { id: 1, name: 'Tej', quantity: 2 },
    { id: 2, name: 'Kenyér', quantity: 1 },
    { id: 3, name: 'Tojás', quantity: 12 },
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
    setProducts(products.filter(p => p.id !== productId));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Háztartási Készletkezelő</h1>
        <button className="add-product-button" onClick={handleOpenModal}>Új Termék</button>
      </header>
      <main>
        <ProductList 
          products={products} 
          onUpdate={handleUpdateProduct}
          onDelete={handleDeleteProduct}
        />
      </main>
      {isModalOpen && <NewProductModal onClose={handleCloseModal} onAdd={handleAddProduct} />}
    </div>
  );
}

export default App;
