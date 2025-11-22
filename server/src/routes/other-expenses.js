const express = require('express');
const router = express.Router();
const { query: dbQuery } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const { param, body, validationResult } = require('express-validator');

// Egyéb költségek lekérése
router.get('/:householdId', [
  authenticateToken,
  param('householdId').isUUID().withMessage('Érvénytelen háztartás azonosító')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { householdId } = req.params;

    const result = await dbQuery(`
      SELECT 
        id,
        name,
        amount,
        category,
        notes,
        is_active,
        created_at,
        updated_at
      FROM household_other_expenses
      WHERE household_id = $1 AND is_active = TRUE
      ORDER BY name ASC
    `, [householdId]);

    res.json({ expenses: result.rows });
  } catch (error) {
    console.error('Error fetching other expenses:', error);
    res.status(500).json({ error: 'Hiba az egyéb költségek lekérésekor' });
  }
});

// Új egyéb költség hozzáadása
router.post('/:householdId', [
  authenticateToken,
  param('householdId').isUUID().withMessage('Érvénytelen háztartás azonosító'),
  body('name').trim().notEmpty().withMessage('A név megadása kötelező'),
  body('amount').isFloat({ min: 0 }).withMessage('Az összeg nem lehet negatív')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { householdId } = req.params;
    const { name, amount, category, notes } = req.body;

    const result = await dbQuery(`
      INSERT INTO household_other_expenses (
        household_id,
        name,
        amount,
        category,
        notes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [householdId, name, amount, category || null, notes || null]);

    res.status(201).json({ expense: result.rows[0] });
  } catch (error) {
    console.error('Error creating other expense:', error);
    res.status(500).json({ error: 'Hiba az egyéb költség létrehozásakor' });
  }
});

// Egyéb költség frissítése
router.put('/:householdId/:expenseId', [
  authenticateToken,
  param('householdId').isUUID().withMessage('Érvénytelen háztartás azonosító'),
  param('expenseId').isUUID().withMessage('Érvénytelen költség azonosító'),
  body('name').optional().trim().notEmpty().withMessage('A név nem lehet üres'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Az összeg nem lehet negatív')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { householdId, expenseId } = req.params;
    const { name, amount, category, notes } = req.body;

    const result = await dbQuery(`
      UPDATE household_other_expenses
      SET 
        name = COALESCE($3, name),
        amount = COALESCE($4, amount),
        category = COALESCE($5, category),
        notes = COALESCE($6, notes)
      WHERE household_id = $1 AND id = $2
      RETURNING *
    `, [householdId, expenseId, name, amount, category, notes]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Költség nem található' });
    }

    res.json({ expense: result.rows[0] });
  } catch (error) {
    console.error('Error updating other expense:', error);
    res.status(500).json({ error: 'Hiba az egyéb költség frissítésekor' });
  }
});

// Egyéb költség törlése (soft delete)
router.delete('/:householdId/:expenseId', [
  authenticateToken,
  param('householdId').isUUID().withMessage('Érvénytelen háztartás azonosító'),
  param('expenseId').isUUID().withMessage('Érvénytelen költség azonosító')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { householdId, expenseId } = req.params;

    const result = await dbQuery(`
      UPDATE household_other_expenses
      SET is_active = FALSE
      WHERE household_id = $1 AND id = $2
      RETURNING *
    `, [householdId, expenseId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Költség nem található' });
    }

    res.json({ message: 'Költség sikeresen törölve', expense: result.rows[0] });
  } catch (error) {
    console.error('Error deleting other expense:', error);
    res.status(500).json({ error: 'Hiba az egyéb költség törlésekor' });
  }
});

module.exports = router;
