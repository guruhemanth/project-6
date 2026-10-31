import { withTenantContext } from '../config/rlsDb.js';
import { broadcastDelta } from '../utils/realtime.js';

export async function getExpenses(req, res) {
  try {
    const expenses = await withTenantContext(req, async (client) => {
      const adminId = req.user.adminId;
      const result = await client.query(
        'SELECT * FROM expenses WHERE admin_id = $1 ORDER BY created_at DESC',
        [adminId]
      );
      return result.rows;
    });
    return res.json(expenses);
  } catch (err) {
    console.error('getExpenses error:', err);
    return res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
}

export async function createExpense(req, res) {
  try {
    const { category, description, amount, spent_by, receipt_url } = req.body;
    if (!category || !description || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Category, description and valid amount are required.' });
    }

    const newExpense = await withTenantContext(req, async (client) => {
      const adminId = req.user.adminId;
      const result = await client.query(
        `INSERT INTO expenses (admin_id, category, description, amount, spent_by, receipt_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [adminId, category.trim(), description.trim(), Number(amount), spent_by || req.user.username, receipt_url || null]
      );
      return result.rows[0];
    });

    const io = req.app.get('io');
    broadcastDelta(io, req.user.adminId, 'EXPENSE_MUTATED', {
      action: 'INSERT',
      record: newExpense,
      amountDelta: Number(newExpense.amount),
    });

    return res.status(201).json(newExpense);
  } catch (err) {
    console.error('createExpense error:', err);
    return res.status(500).json({ error: 'Failed to create expense.' });
  }
}

export async function deleteExpense(req, res) {
  try {
    const { id } = req.params;
    const deleted = await withTenantContext(req, async (client) => {
      const adminId = req.user.adminId;
      const result = await client.query(
        'DELETE FROM expenses WHERE id = $1 AND admin_id = $2 RETURNING *',
        [id, adminId]
      );
      return result.rows[0];
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Expense item not found.' });
    }

    const io = req.app.get('io');
    broadcastDelta(io, req.user.adminId, 'EXPENSE_MUTATED', {
      action: 'DELETE',
      record: deleted,
      amountDelta: Number(deleted.amount),
    });

    return res.json({ message: 'Expense deleted successfully.', record: deleted });
  } catch (err) {
    console.error('deleteExpense error:', err);
    return res.status(500).json({ error: 'Failed to delete expense.' });
  }
}
