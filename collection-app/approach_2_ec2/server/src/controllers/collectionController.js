import { withTenantContext } from '../config/rlsDb.js';
import { broadcastDelta } from '../utils/realtime.js';

// ── GET /api/records ──
export async function getCollections(req, res) {
  try {
    const { search, q, sort = 'created_at', sortBy, order = 'desc', sortOrder, minAmount, maxAmount, page, limit } = req.query;
    const searchTerm = (q || search || '').trim();
    const effectiveSort = sortBy || sort || 'created_at';
    const effectiveOrder = (sortOrder || order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const result = await withTenantContext(req, async (client) => {
      let query = 'SELECT * FROM collections WHERE admin_id = $1';
      const params = [req.user.adminId];

      if (searchTerm) {
        params.push(`%${searchTerm}%`);
        query += ` AND (name ILIKE $${params.length} OR door_number ILIKE $${params.length} OR collector_name ILIKE $${params.length})`;
      }

      if (minAmount !== undefined && minAmount !== '') {
        const minVal = parseFloat(minAmount);
        if (!isNaN(minVal)) {
          params.push(minVal);
          query += ` AND amount >= $${params.length}`;
        }
      }

      if (maxAmount !== undefined && maxAmount !== '') {
        const maxVal = parseFloat(maxAmount);
        if (!isNaN(maxVal)) {
          params.push(maxVal);
          query += ` AND amount <= $${params.length}`;
        }
      }

      const allowedSorts = ['created_at', 'amount', 'name', 'door_number'];
      const sortCol = allowedSorts.includes(effectiveSort) ? effectiveSort : 'created_at';
      query += ` ORDER BY ${sortCol} ${effectiveOrder}`;

      // Pagination only if specified
      if (page || limit) {
        const safeLimit = Math.min(100, Math.max(1, parseInt(limit || 50)));
        const offset = (Math.max(1, parseInt(page || 1)) - 1) * safeLimit;
        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(safeLimit, offset);
      }

      const recordsRes = await client.query(query, params);

      // Return raw array if no pagination params were provided (backward test compatibility)
      if (!page && !limit) {
        return recordsRes.rows;
      }

      // Count query for pagination response
      let countQuery = 'SELECT COUNT(*) as total_count FROM collections WHERE admin_id = $1';
      const countParams = [req.user.adminId];
      if (searchTerm) {
        countParams.push(`%${searchTerm}%`);
        countQuery += ` AND (name ILIKE $${countParams.length} OR door_number ILIKE $${countParams.length} OR collector_name ILIKE $${countParams.length})`;
      }
      const countRes = await client.query(countQuery, countParams);

      return {
        records: recordsRes.rows,
        total: parseInt(countRes.rows[0].total_count),
        page: parseInt(page || 1),
        limit: Math.min(100, Math.max(1, parseInt(limit || 50))),
      };
    });

    res.json(result);
  } catch (err) {
    console.error('getCollections error:', err);
    res.status(500).json({ error: 'Failed to retrieve collections.' });
  }
}

// ── GET /api/records/stats ──
export async function getStats(req, res) {
  try {
    const stats = await withTenantContext(req, async (client) => {
      const result = await client.query(
        `SELECT 
           COALESCE(SUM(amount), 0) AS total_amount,
           COUNT(*) AS total_count,
           COALESCE(MAX(amount), 0) AS max_amount,
           COALESCE(AVG(amount), 0) AS avg_amount
         FROM collections 
         WHERE admin_id = $1`,
        [req.user.adminId]
      );
      return result.rows[0];
    });

    res.json({
      total: parseFloat(stats.total_amount),
      count: parseInt(stats.total_count),
      max: parseFloat(stats.max_amount),
      avg: parseFloat(stats.avg_amount),
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ error: 'Failed to retrieve statistics.' });
  }
}

// ── POST /api/records ──
export async function createCollection(req, res) {
  try {
    const { name, door_number, amount, phone_number, idempotency_key } = req.body;

    if (!name || !door_number || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Name, door number, and amount are required.' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ error: 'Amount must be a non-negative number.' });
    }

    const newRecord = await withTenantContext(req, async (client) => {
      // Idempotency deduplication check
      if (idempotency_key) {
        const existing = await client.query(
          'SELECT * FROM collections WHERE idempotency_key = $1 AND admin_id = $2',
          [idempotency_key, req.user.adminId]
        );
        if (existing.rows.length > 0) {
          return existing.rows[0];
        }
      }

      const result = await client.query(
        `INSERT INTO collections (admin_id, collector_id, collector_name, name, door_number, phone_number, amount, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          req.user.adminId,
          req.user.id,
          req.user.username,
          name.trim(),
          door_number.trim(),
          phone_number ? phone_number.trim() : null,
          numAmount,
          idempotency_key || null,
        ]
      );
      return result.rows[0];
    });

    // Real-Time Delta Emission
    const io = req.app.get('io');
    broadcastDelta(io, req.user.adminId, 'COLLECTION_MUTATED', {
      action: 'INSERT',
      record: newRecord,
      amountDelta: parseFloat(newRecord.amount),
    });

    res.status(201).json(newRecord);
  } catch (err) {
    console.error('createCollection error:', err);
    res.status(500).json({ error: 'Failed to create collection record.' });
  }
}

// ── PUT /api/records/:id ──
export async function updateCollection(req, res) {
  try {
    const { id } = req.params;
    const { name, door_number, amount, phone_number } = req.body;

    if (!name || !door_number || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Name, door number, and amount are required.' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ error: 'Amount must be a non-negative number.' });
    }

    const updateResult = await withTenantContext(req, async (client) => {
      // Get old amount for delta calculation
      const oldRes = await client.query(
        'SELECT * FROM collections WHERE id = $1 AND admin_id = $2',
        [id, req.user.adminId]
      );
      if (oldRes.rows.length === 0) return null;

      const oldRecord = oldRes.rows[0];
      const result = await client.query(
        `UPDATE collections 
         SET name = $1, door_number = $2, amount = $3, phone_number = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND admin_id = $6
         RETURNING *`,
        [name.trim(), door_number.trim(), numAmount, phone_number ? phone_number.trim() : null, id, req.user.adminId]
      );

      return {
        updated: result.rows[0],
        amountDelta: numAmount - parseFloat(oldRecord.amount),
      };
    });

    if (!updateResult) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    const io = req.app.get('io');
    broadcastDelta(io, req.user.adminId, 'COLLECTION_MUTATED', {
      action: 'UPDATE',
      record: updateResult.updated,
      amountDelta: updateResult.amountDelta,
    });

    res.json(updateResult.updated);
  } catch (err) {
    console.error('updateCollection error:', err);
    res.status(500).json({ error: 'Failed to update collection record.' });
  }
}

// ── DELETE /api/records/:id ──
export async function deleteCollection(req, res) {
  try {
    const { id } = req.params;

    const deleted = await withTenantContext(req, async (client) => {
      const result = await client.query(
        'DELETE FROM collections WHERE id = $1 AND admin_id = $2 RETURNING *',
        [id, req.user.adminId]
      );
      return result.rows[0];
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    const io = req.app.get('io');
    broadcastDelta(io, req.user.adminId, 'COLLECTION_MUTATED', {
      action: 'DELETE',
      record: deleted,
      amountDelta: -parseFloat(deleted.amount),
    });

    res.json({ message: 'Record deleted successfully.', record: deleted });
  } catch (err) {
    console.error('deleteCollection error:', err);
    res.status(500).json({ error: 'Failed to delete collection record.' });
  }
}
