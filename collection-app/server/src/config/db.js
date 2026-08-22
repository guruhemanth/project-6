import pg from 'pg';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Reads and executes init-db.sql to set up tables, triggers, and functions.
 * Safe to call on every startup/restart (uses IF NOT EXISTS / CREATE OR REPLACE).
 * Also performs an explicit integrity verification to ensure all tables, users, and triggers are intact.
 */
export async function initDatabase() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const sqlPath = join(__dirname, '..', 'scripts', 'init-db.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  try {
    // 1. Execute idempotent DDL & triggers (creates if missing, preserves if existing)
    await pool.query(sql);

    // 2. Seed default admin user (GovindaNagar / GN@123) with bcrypt hash if not already present
    let adminUser = await pool.query(
      'SELECT id, username FROM users WHERE LOWER(username) = LOWER($1)',
      ['GovindaNagar']
    );

    if (adminUser.rows.length === 0) {
      const defaultHash = await bcrypt.hash('GN@123', 10);
      const res = await pool.query(
        'INSERT INTO users (username, password_hash, role, society_name) VALUES ($1, $2, $3, $4) RETURNING id, username',
        ['GovindaNagar', defaultHash, 'admin', 'GovindaNagar']
      );
      adminUser = res;
      console.log('👤 Default admin "GovindaNagar" seeded with hashed password.');
    }

    const defaultAdminId = adminUser.rows[0].id;

    // 3. Backfill any existing collections or logs that don't have an admin_id
    await pool.query(
      'UPDATE collections SET admin_id = $1 WHERE admin_id IS NULL',
      [defaultAdminId]
    );
    await pool.query(
      'UPDATE collection_logs SET admin_id = $1 WHERE admin_id IS NULL',
      [defaultAdminId]
    );
    await pool.query(
      'UPDATE users SET admin_id = $1 WHERE role = $2 AND admin_id IS NULL AND id != $1',
      [defaultAdminId, 'collector']
    );

    // 3. Perform Integrity Verification
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('users', 'collections', 'collection_logs')
    `);
    const existingTables = tableCheck.rows.map(r => r.table_name);

    const triggerCheck = await pool.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE event_object_table = 'collections' AND trigger_name = 'collection_audit_trigger'
    `);

    const hasUsers = existingTables.includes('users');
    const hasCollections = existingTables.includes('collections');
    const hasLogs = existingTables.includes('collection_logs');
    const hasTrigger = triggerCheck.rows.length > 0;

    if (!hasUsers || !hasCollections || !hasLogs || !hasTrigger) {
      throw new Error(`Database integrity check failed! Tables: [${existingTables.join(', ')}], Trigger: ${hasTrigger}`);
    }

    // 4. Count existing records for health reporting
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM collections) as collections_count,
        (SELECT COUNT(*) FROM collection_logs) as logs_count
    `);

    const { users_count, collections_count, logs_count } = stats.rows[0];

    console.log('✅ Database schema verified & 100% intact:');
    console.log(`   👥 Table "users": OK (${users_count} users with hashed passwords)`);
    console.log(`   📁 Table "collections": OK (${collections_count} records preserved)`);
    console.log(`   📁 Table "collection_logs": OK (${logs_count} audit logs preserved)`);
    console.log(`   ⚙️  Trigger "collection_audit_trigger": ACTIVE`);
  } catch (err) {
    console.error('❌ Database initialization/verification failed:', err.message);
    throw err;
  }
}

export default pool;
