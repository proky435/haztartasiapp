import React, { useState, useEffect } from 'react';
import otherExpensesService from '../services/otherExpensesService';
import './OtherExpenses.css';

const OtherExpenses = ({ currentHousehold }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: '',
    notes: ''
  });

  useEffect(() => {
    if (currentHousehold?.id) {
      loadExpenses();
    }
  }, [currentHousehold]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await otherExpensesService.getExpenses();
      setExpenses(data);
      setError(null);
    } catch (err) {
      console.error('Error loading expenses:', err);
      setError('Hiba az egyéb költségek betöltésekor');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await otherExpensesService.updateExpense(editingExpense.id, formData);
      } else {
        await otherExpensesService.addExpense(formData);
      }
      await loadExpenses();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving expense:', err);
      setError('Hiba a költség mentésekor');
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      name: expense.name,
      amount: expense.amount,
      category: expense.category || '',
      notes: expense.notes || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (expenseId) => {
    if (window.confirm('Biztosan törölni szeretnéd ezt a költséget?')) {
      try {
        await otherExpensesService.deleteExpense(expenseId);
        await loadExpenses();
      } catch (err) {
        console.error('Error deleting expense:', err);
        setError('Hiba a költség törlésekor');
      }
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingExpense(null);
    setFormData({
      name: '',
      amount: '',
      category: '',
      notes: ''
    });
  };

  const calculateTotal = () => {
    return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
  };

  if (loading) {
    return <div className="loading">⏳ Betöltés...</div>;
  }

  return (
    <div className="other-expenses-section">
      <div className="section-header">
        <h3>💳 Egyéb költségek</h3>
        <button className="add-expense-btn" onClick={() => setShowAddModal(true)}>
          ➕ Új költség
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="expenses-card">
        {expenses.length === 0 ? (
          <p className="no-expenses">Még nincsenek rögzített egyéb költségek.</p>
        ) : (
          <>
            {expenses.map((expense) => (
              <div key={expense.id} className="expense-item">
                <div className="expense-info">
                  <span className="expense-name">{expense.name}</span>
                  {expense.category && (
                    <span className="expense-category">{expense.category}</span>
                  )}
                </div>
                <div className="expense-actions">
                  <span className="expense-amount">
                    {otherExpensesService.formatCost(expense.amount)}
                  </span>
                  <button
                    className="edit-expense-btn"
                    onClick={() => handleEdit(expense)}
                    title="Szerkesztés"
                  >
                    ✏️
                  </button>
                  <button
                    className="delete-expense-btn"
                    onClick={() => handleDelete(expense.id)}
                    title="Törlés"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            <div className="expense-total">
              <span className="total-label">Összesen:</span>
              <span className="total-amount">
                {otherExpensesService.formatCost(calculateTotal())}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingExpense ? 'Költség szerkesztése' : 'Új költség hozzáadása'}</h3>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Név *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="pl. Telefon, Internet, Netflix"
                  required
                />
              </div>
              <div className="form-group">
                <label>Összeg (Ft) *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="1"
                  required
                />
              </div>
              <div className="form-group">
                <label>Kategória</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Válassz kategóriát...</option>
                  <option value="Kommunikáció">Kommunikáció</option>
                  <option value="Előfizetés">Előfizetés</option>
                  <option value="Biztosítás">Biztosítás</option>
                  <option value="Egyéb">Egyéb</option>
                </select>
              </div>
              <div className="form-group">
                <label>Megjegyzés</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Opcionális megjegyzés..."
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={handleCloseModal} className="cancel-btn">
                  Mégse
                </button>
                <button type="submit" className="save-btn">
                  {editingExpense ? 'Mentés' : 'Hozzáadás'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OtherExpenses;
