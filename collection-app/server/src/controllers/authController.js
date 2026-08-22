import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

/**
 * Helper to generate JWT with tenant collection space metadata
 */
function generateToken(user, adminId, societyName) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      adminId: adminId,
      societyName: societyName || 'GovindaNagar',
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * POST /api/auth/login
 * Authenticates user and returns JWT with admin collection space scoping.
 */
export async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const result = await pool.query(
      `SELECT u.id, u.username, u.password_hash, u.role, u.admin_id, u.society_name,
              p.society_name as parent_society_name
       FROM users u
       LEFT JOIN users p ON u.admin_id = p.id
       WHERE LOWER(u.username) = LOWER($1)`,
      [username.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Resolve adminId: Admins own their space (their ID), collectors belong to their parent admin
    const adminId = user.role === 'admin' ? user.id : (user.admin_id || user.id);
    const societyName = user.society_name || user.parent_society_name || 'GovindaNagar';

    const token = generateToken(user, adminId, societyName);

    return res.json({
      token,
      id: user.id,
      username: user.username,
      role: user.role,
      adminId,
      societyName,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/auth/register
 * Public registration for new Admins. Each new Admin gets their own isolated collection space!
 */
export async function register(req, res) {
  try {
    const { username, password, society_name } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    const cleanSociety = society_name && society_name.trim() ? society_name.trim() : `${cleanUsername} Society`;

    // Check for duplicate username
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [cleanUsername]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `Username "${cleanUsername}" is already registered. Please choose another.` });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Register as Admin of a new independent collection space
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, role, society_name)
       VALUES ($1, $2, 'admin', $3)
       RETURNING id, username, role, society_name, created_at`,
      [cleanUsername, passwordHash, cleanSociety]
    );

    const user = result.rows[0];
    const adminId = user.id;

    const token = generateToken(user, adminId, user.society_name);

    return res.status(201).json({
      token,
      id: user.id,
      username: user.username,
      role: user.role,
      adminId,
      societyName: user.society_name,
      message: `Admin account & collection space for "${user.society_name}" created successfully!`,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * GET /api/users
 * Returns all collectors belonging to the current admin's collection space.
 */
export async function getUsers(req, res) {
  try {
    const adminId = req.user.adminId;

    const result = await pool.query(
      `SELECT id, username, role, society_name, created_at
       FROM users
       WHERE id = $1 OR admin_id = $1
       ORDER BY id ASC`,
      [adminId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('getUsers error:', err);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
}

/**
 * POST /api/users
 * ONLY Admins can create collectors inside their own admin account.
 */
export async function createUser(req, res) {
  try {
    // Enforce role check: Only Admins can create collectors
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only administrators can create collectors for this collection space.' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    // Check duplicate username
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [cleanUsername]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `Username "${cleanUsername}" is already taken.` });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const adminId = req.user.id;
    const societyName = req.user.societyName || 'GovindaNagar';

    const result = await pool.query(
      `INSERT INTO users (username, password_hash, role, admin_id, society_name)
       VALUES ($1, $2, 'collector', $3, $4)
       RETURNING id, username, role, admin_id, society_name, created_at`,
      [cleanUsername, passwordHash, adminId, societyName]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ error: 'Failed to create collector.' });
  }
}

/**
 * DELETE /api/users/:id
 * Only Admin can delete collectors from their own space.
 */
export async function deleteUser(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only administrators can delete collectors.' });
    }

    const { id } = req.params;
    const adminId = req.user.id;

    const targetUser = await pool.query('SELECT id, username, role, admin_id FROM users WHERE id = $1', [id]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userToDelete = targetUser.rows[0];

    // Cannot delete own account
    if (userToDelete.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own admin account while logged in.' });
    }

    // Must belong to this admin's space
    if (userToDelete.admin_id !== adminId) {
      return res.status(403).json({ error: 'You do not have permission to delete users from other collection spaces.' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, username', [id]);
    return res.json({ message: 'Collector deleted successfully.', user: result.rows[0] });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ error: 'Failed to delete collector.' });
  }
}
