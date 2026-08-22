import pool from '../config/db.js';

/**
 * Helper: queries fresh aggregate stats scoped to a specific admin's collection space.
 * Returns { total: number, count: number }
 */
async function getFreshStats(adminId) {
  const result = await pool.query(
    'SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM collections WHERE admin_id = $1',
    [adminId]
  );
  return {
    total: parseFloat(result.rows[0].total),
    count: parseInt(result.rows[0].count),
  };
}

/**
 * GET /api/stats/total
 * Returns { total, count } aggregate stats for the user's collection space.
 */
export async function getStats(req, res) {
  try {
    const adminId = req.user.adminId;
    const stats = await getFreshStats(adminId);
    return res.json(stats);
  } catch (err) {
    console.error('getStats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
}

/**
 * GET /api/records?q=&minAmount=&maxAmount=&sortBy=&sortOrder=
 * Returns collections scoped to the user's admin collection space.
 */
export async function getRecords(req, res) {
  try {
    const adminId = req.user.adminId;
    const { q, minAmount, maxAmount, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    const conditions = ['admin_id = $1'];
    const params = [adminId];

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      conditions.push(`(name ILIKE $${params.length} OR door_number ILIKE $${params.length})`);
    }

    if (minAmount && !isNaN(parseFloat(minAmount))) {
      params.push(parseFloat(minAmount));
      conditions.push(`amount >= $${params.length}`);
    }

    if (maxAmount && !isNaN(parseFloat(maxAmount))) {
      params.push(parseFloat(maxAmount));
      conditions.push(`amount <= $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const allowedSortColumns = {
      created_at: 'created_at',
      amount: 'amount',
      name: 'name',
      door_number: 'door_number',
    };
    const sortColumn = allowedSortColumns[sortBy] || 'created_at';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const query = `
      SELECT * FROM collections
      ${whereClause}
      ORDER BY ${sortColumn} ${direction}
    `;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('getRecords error:', err);
    return res.status(500).json({ error: 'Failed to fetch records.' });
  }
}

/**
 * POST /api/records
 * Creates a new collection entry inside the user's admin space. Emits COLLECTION_MUTATED.
 */
export async function createRecord(req, res) {
  try {
    const adminId = req.user.adminId;
    const collectorName = req.user.username;
    const { name, door_number, amount } = req.body;

    if (!name || !door_number || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'name, door_number, and amount are required.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number.' });
    }

    const result = await pool.query(
      `INSERT INTO collections (admin_id, collector_name, name, door_number, amount)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [adminId, collectorName, name.trim(), door_number.trim(), parsedAmount]
    );

    const record = result.rows[0];
    const stats = await getFreshStats(adminId);

    const io = req.app.get('io');
    if (io) {
      io.to(`space_${adminId}`).emit('COLLECTION_MUTATED', { action: 'INSERT', stats, record, adminId });
      io.emit('COLLECTION_MUTATED', { action: 'INSERT', stats, record, adminId });
    }

    return res.status(201).json(record);
  } catch (err) {
    console.error('createRecord error:', err);
    return res.status(500).json({ error: 'Failed to create record.' });
  }
}

/**
 * PUT /api/records/:id
 * Updates a collection entry within the user's admin space.
 */
export async function updateRecord(req, res) {
  try {
    const adminId = req.user.adminId;
    const { id } = req.params;
    const { name, door_number, amount } = req.body;

    if (!name || !door_number || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'name, door_number, and amount are required.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number.' });
    }

    const result = await pool.query(
      `UPDATE collections SET name = $1, door_number = $2, amount = $3
       WHERE id = $4 AND admin_id = $5 RETURNING *`,
      [name.trim(), door_number.trim(), parsedAmount, id, adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found in your collection space.' });
    }

    const record = result.rows[0];
    const stats = await getFreshStats(adminId);

    const io = req.app.get('io');
    if (io) {
      io.to(`space_${adminId}`).emit('COLLECTION_MUTATED', { action: 'UPDATE', stats, record, adminId });
      io.emit('COLLECTION_MUTATED', { action: 'UPDATE', stats, record, adminId });
    }

    return res.json(record);
  } catch (err) {
    console.error('updateRecord error:', err);
    return res.status(500).json({ error: 'Failed to update record.' });
  }
}

/**
 * DELETE /api/records/:id
 * Deletes a collection entry within the user's admin space.
 */
export async function deleteRecord(req, res) {
  try {
    const adminId = req.user.adminId;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM collections WHERE id = $1 AND admin_id = $2 RETURNING *',
      [id, adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found in your collection space.' });
    }

    const record = result.rows[0];
    const stats = await getFreshStats(adminId);

    const io = req.app.get('io');
    if (io) {
      io.to(`space_${adminId}`).emit('COLLECTION_MUTATED', { action: 'DELETE', stats, record, adminId });
      io.emit('COLLECTION_MUTATED', { action: 'DELETE', stats, record, adminId });
    }

    return res.json({ message: 'Record deleted successfully.', record });
  } catch (err) {
    console.error('deleteRecord error:', err);
    return res.status(500).json({ error: 'Failed to delete record.' });
  }
}
