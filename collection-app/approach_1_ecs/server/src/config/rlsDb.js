import pool from './db.js';

/**
 * Executes a callback within a transactional tenant session where
 * tenant context and client metadata are set locally before running queries.
 */
export async function withTenantContext(req, callback) {
  const client = await pool.connect();
  try {
    const adminId = req.user?.adminId ? String(req.user.adminId) : '';
    const userId = req.user?.id ? String(req.user.id) : '';
    const role = req.user?.role || '';
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim().slice(0, 100) : '';

    await client.query('BEGIN');
    
    // Use set_config to safely pass parameterized values into transaction-local session settings
    await client.query(`
      SELECT 
        set_config('app.current_admin_id', $1, true),
        set_config('app.current_user_id', $2, true),
        set_config('app.current_user_role', $3, true),
        set_config('app.current_client_ip', $4, true);
    `, [adminId, userId, role, clientIp]);

    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
