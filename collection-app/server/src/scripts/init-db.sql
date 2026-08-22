-- ============================================
-- Vinayaka Chavithi Chandas Collection App
-- Multi-Tenant Collection Space Schema
-- ============================================

-- Users Table (Admins & Collectors)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'collector', -- 'admin' or 'collector'
    admin_id INT REFERENCES users(id) ON DELETE CASCADE, -- NULL for admins, parent admin's ID for collectors
    society_name VARCHAR(100) DEFAULT 'GovindaNagar',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist if table was already created
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_id INT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS society_name VARCHAR(100) DEFAULT 'GovindaNagar';

-- Collections Table (Scoped to Admin Space)
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    admin_id INT REFERENCES users(id) ON DELETE CASCADE,
    collector_name VARCHAR(100),
    name VARCHAR(100) NOT NULL,
    door_number VARCHAR(50) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist if table was already created
ALTER TABLE collections ADD COLUMN IF NOT EXISTS admin_id INT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS collector_name VARCHAR(100);

-- Audit / History Table (Scoped to Admin Space)
CREATE TABLE IF NOT EXISTS collection_logs (
    id SERIAL PRIMARY KEY,
    admin_id INT,
    collection_id INT,
    action_type VARCHAR(10) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure admin_id column exists if table was already created
ALTER TABLE collection_logs ADD COLUMN IF NOT EXISTS admin_id INT;

-- Trigger Function for Automated Multi-Tenant Audit Logging
CREATE OR REPLACE FUNCTION log_collection_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO collection_logs (admin_id, collection_id, action_type, new_data)
        VALUES (NEW.admin_id, NEW.id, 'INSERT', to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
        INSERT INTO collection_logs (admin_id, collection_id, action_type, old_data, new_data)
        VALUES (NEW.admin_id, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO collection_logs (admin_id, collection_id, action_type, old_data)
        VALUES (OLD.admin_id, OLD.id, 'DELETE', to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS collection_audit_trigger ON collections;
CREATE TRIGGER collection_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON collections
FOR EACH ROW EXECUTE FUNCTION log_collection_changes();
