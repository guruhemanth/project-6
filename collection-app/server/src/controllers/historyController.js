import pool from '../config/db.js';

/**
 * GET /api/history?q=&action=&sortOrder=
 * Returns audit log entries from collection_logs scoped to the user's admin collection space.
 */
export async function getHistory(req, res) {
  try {
    const adminId = req.user.adminId;
    const { q, action, sortOrder = 'DESC' } = req.query;

    const conditions = ['admin_id = $1'];
    const params = [adminId];

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      conditions.push(`(
        new_data->>'name' ILIKE $${params.length} OR
        new_data->>'door_number' ILIKE $${params.length} OR
        old_data->>'name' ILIKE $${params.length} OR
        old_data->>'door_number' ILIKE $${params.length}
      )`);
    }

    if (action && action.trim() && action.toUpperCase() !== 'ALL') {
      params.push(action.trim().toUpperCase());
      conditions.push(`action_type = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const query = `
      SELECT * FROM collection_logs
      ${whereClause}
      ORDER BY performed_at ${direction}
    `;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('getHistory error:', err);
    return res.status(500).json({ error: 'Failed to fetch history.' });
  }
}
