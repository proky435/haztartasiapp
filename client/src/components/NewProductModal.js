import React, { useState } from 'react';
import './NewProductModal.css';

function NewProductModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && quantity > 0) {
      onAdd({ name, quantity: parseInt(quantity, 10) });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Új Termék Hozzáadása</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Termék Neve:
            <input type="text" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Mennyiség:
            <input type="number" name="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" required />
          </label>
          <div className="button-group">
            <button type="button">Vonalkód Beolvasása</button>
            <button type="button">Blokk Beolvasása (OCR)</button>
          </div>
          <div className="form-actions">
            <button type="submit">Mentés</button>
            <button type="button" onClick={onClose}>Mégse</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewProductModal;
