-- ============================================================================
-- LAYER 1: POSTGRESQL 16 SCHEMA WITH RLS, AUDIT TRIGGER & PERFORMANCE INDEXES
-- ============================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'collector' CHECK (role IN ('admin', 'collector')),
    admin_id INT REFERENCES users(id) ON DELETE CASCADE,
    society_name VARCHAR(100) DEFAULT 'GovindaNagar',
    city VARCHAR(100),
    state VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_admin_unique_username ON users (LOWER(username)) WHERE role = 'admin';
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_collector_unique_per_space ON users (admin_id, LOWER(username)) WHERE role = 'collector';

-- 2. COLLECTIONS TABLE (DONATIONS)
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    idempotency_key VARCHAR(100) UNIQUE,
    admin_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collector_id INT REFERENCES users(id) ON DELETE SET NULL,
    collector_name VARCHAR(100),
    name VARCHAR(100) NOT NULL,
    door_number VARCHAR(50) NOT NULL,
    phone_number VARCHAR(15),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migration safety: ensure idempotency_key column exists if collections table was created earlier
ALTER TABLE collections ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100) UNIQUE;

-- 3. EXPENSES TABLE (SERVER-PERSISTED EXPENDITURES)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    spent_by VARCHAR(100),
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. AUDIT / HISTORY TABLE WITH ENRICHED ACTOR & CLIENT METADATA
CREATE TABLE IF NOT EXISTS collection_logs (
    id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL,
    entity_type VARCHAR(30) DEFAULT 'collection',
    entity_id INT,
    action_type VARCHAR(10) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by_user_id INT,
    user_role VARCHAR(20),
    client_ip TEXT,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migration safety: ensure enriched columns exist and have generous types in collection_logs
ALTER TABLE collection_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(30) DEFAULT 'collection';
ALTER TABLE collection_logs ADD COLUMN IF NOT EXISTS changed_by_user_id INT;
ALTER TABLE collection_logs ADD COLUMN IF NOT EXISTS user_role VARCHAR(20);
ALTER TABLE collection_logs ADD COLUMN IF NOT EXISTS client_ip TEXT;
ALTER TABLE collection_logs ALTER COLUMN client_ip TYPE TEXT;

-- 5. HIGH-CONCURRENCY COMPOSITE B-TREE INDEXES
CREATE INDEX IF NOT EXISTS idx_collections_admin_created ON collections (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collections_admin_door ON collections (admin_id, door_number);
CREATE INDEX IF NOT EXISTS idx_collections_idempotency ON collections (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_admin_created ON expenses (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_logs_admin_action ON collection_logs (admin_id, action_type, performed_at DESC);

-- 6. ENRICHED PL/PGSQL AUDIT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION log_collection_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id INT;
    v_role VARCHAR(20);
    v_ip TEXT;
BEGIN
    BEGIN
        v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::INT;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    v_role := NULLIF(current_setting('app.current_user_role', true), '');
    v_ip   := NULLIF(current_setting('app.current_client_ip', true), '');

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO collection_logs (
            admin_id, entity_type, entity_id, action_type, new_data,
            changed_by_user_id, user_role, client_ip
        ) VALUES (
            NEW.admin_id, TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW),
            v_user_id, v_role, v_ip
        );
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
        INSERT INTO collection_logs (
            admin_id, entity_type, entity_id, action_type, old_data, new_data,
            changed_by_user_id, user_role, client_ip
        ) VALUES (
            NEW.admin_id, TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW),
            v_user_id, v_role, v_ip
        );
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO collection_logs (
            admin_id, entity_type, entity_id, action_type, old_data,
            changed_by_user_id, user_role, client_ip
        ) VALUES (
            OLD.admin_id, TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD),
            v_user_id, v_role, v_ip
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_collection_audit ON collections;
DROP TRIGGER IF EXISTS collection_audit_trigger ON collections;
CREATE TRIGGER trg_collection_audit
AFTER INSERT OR UPDATE OR DELETE ON collections
FOR EACH ROW EXECUTE FUNCTION log_collection_changes();
