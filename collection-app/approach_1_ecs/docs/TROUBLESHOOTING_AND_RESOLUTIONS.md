# 🛠️ Troubleshooting & Pipeline Issues Resolution Log

This document provides a chronological post-mortem (in ascending order of occurrence) of the core technical issues, root causes, debugging steps, exact commands used, and resolutions encountered across system architecture, database triggers, Docker containerization, and pipeline orchestration.

---

## 📑 Chronological Navigation Index (Ascending Order)

1. [Issue 1: Multi-Tenant Data Leakage & Permission Escalation Prevention](#1-issue-1-multi-tenant-data-leakage--permission-escalation-prevention) *(Phase 1: Architecture & RBAC)*
2. [Issue 2: Database Startup Integrity Check Failure (Trigger Mismatch)](#2-issue-2-database-startup-integrity-check-failure-trigger-mismatch) *(Phase 2: Database Initialization)*
3. [Issue 3: Docker Internal Port Refusal (`ECONNREFUSED 172.22.0.2:5434`)](#3-issue-3-docker-internal-port-refusal-econnrefused-17222025434) *(Phase 3: Docker Networking)*
4. [Issue 4: Docker Container Health Check Hang & Unhealthy Dependency Crash](#4-issue-4-docker-container-health-check-hang--unhealthy-dependency-crash) *(Phase 4: Healthchecks & Orchestration)*
5. [Issue 5: Proxy IP Header Overflow in Audit Trigger (`VARCHAR(45)` Exceeded)](#5-issue-5-proxy-ip-header-overflow-in-audit-trigger-varchar45-exceeded) *(Phase 5: Production Mutation Flow)*
6. [📋 Master CLI & DevOps Operations Playbook](#-master-cli--devops-operations-playbook) *(All Commands Used in the Journey)*

---

## 1. Issue 1: Multi-Tenant Data Leakage & Permission Escalation Prevention

### ⏱️ Phase: *System Architecture & Multi-Tenancy Design*

### 🛑 Symptoms
Multiple festival societies logging collections simultaneously were sharing a single database namespace, creating security vulnerabilities where:
- Admin spaces could see or alter other societies' collections.
- Collectors could potentially create or delete users without admin privileges.

### 🔍 Root Cause
Absence of tenant-scoping identifiers (`admin_id`) in database tables and missing role-based access control (RBAC) middleware guards on API controllers.

### 💻 Commands Used During Investigation & Verification
```bash
# 1. Run full 34-test suite to verify multi-tenant isolation and 403 authorization
cd server && npm test

# 2. Inspect active tenant data in PostgreSQL
PGPASSWORD="Guru@123" psql -h localhost -U postgres -d collection_db -c "
SELECT id, username, role, admin_id, society_name FROM users ORDER BY id;
"
```

### ✅ Resolution
1. **Schema Scoping:** Added `admin_id` column to `users`, `collections`, and `collection_logs` with foreign key cascades.
2. **Query Scoping:** Enforced `WHERE admin_id = req.user.adminId` across all SQL read and write queries.
3. **RBAC Middleware:** Added `403 Forbidden` authorization guards on user management endpoints (`POST /api/users`, `DELETE /api/users/:id`).
4. **Socket Room Partitioning:** Partitioned WebSocket streams into tenant rooms (`space_${adminId}`) so real-time broadcasts never leak across societies.
5. **Automated Verification:** Implemented 34 automated integration tests in `server/test/api.test.js` validating multi-tenancy and permission boundaries (100% pass rate).

---

## 2. Issue 2: Database Startup Integrity Check Failure (Trigger Mismatch)

### ⏱️ Phase: *Database Engine Triggers & Server Boot Verification*

### 🛑 Symptoms
During backend startup, `chandas-server` crashed and exited with:
```
❌ Database initialization/verification failed: Database integrity check failed! Tables: [collection_logs, collections, users], Trigger: false
```

### 🔍 Root Cause
- In `server/src/scripts/init-db.sql`, the PostgreSQL audit trigger was created with the name:
  ```sql
  CREATE TRIGGER trg_collection_audit ON collections ...
  ```
- In `server/src/config/db.js`, the verification query checked:
  ```sql
  WHERE trigger_name = 'collection_audit_trigger'
  ```
- Because the names differed, the query returned `0` rows $\rightarrow$ `hasTrigger` evaluated to `false` $\rightarrow$ the server aborted startup.

### 💻 Commands Used During Investigation & Verification
```bash
# 1. Query PostgreSQL for actual trigger names on the collections table
PGPASSWORD="Guru@123" psql -h localhost -U postgres -d collection_db -c "
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'collections';
"

# 2. Test server startup and integrity verification directly
timeout 3s node src/server.js
```

### ✅ Resolution
1. Updated `server/src/config/db.js` to accept both trigger naming conventions:
   ```javascript
   const triggerCheck = await pool.query(`
     SELECT trigger_name 
     FROM information_schema.triggers 
     WHERE event_object_table = 'collections' 
       AND trigger_name IN ('trg_collection_audit', 'collection_audit_trigger')
   `);
   ```
2. Updated `init-db.sql` to clean up both trigger names idempotently.

---

## 3. Issue 3: Docker Internal Port Refusal (`ECONNREFUSED 172.22.0.2:5434`)

### ⏱️ Phase: *Docker Compose Bridge Networking*

### 🛑 Symptoms
The backend container failed to connect to PostgreSQL during container startup with:
```
connect ECONNREFUSED 172.22.0.2:5434
```

### 🔍 Root Cause
- In `docker-compose.yml`, the database port was mapped as `5434:5432` to avoid port conflicts on the host computer.
- The server container attempted to connect to port `5434` inside the Docker network.
- **Rule:** `5434` is only the external Host port. Inside the Docker bridge network (`chandas-network`), PostgreSQL **always listens on internal port `5432`**.

### 💻 Commands Used During Investigation & Verification
```bash
# 1. Inspect container logs for connection failure
docker logs chandas-server --tail 30

# 2. Validate Docker Compose service network bindings
docker compose config
```

### ✅ Resolution
Ensured the container's internal `DATABASE_URL` strictly points to internal port `5432`:
```yaml
# In docker-compose.yml
environment:
  DATABASE_URL: postgresql://postgres:postgres@db:5432/collection_db
```

---

## 4. Issue 4: Docker Container Health Check Hang & Unhealthy Dependency Crash

### ⏱️ Phase: *Container Healthchecks & Service Startup Cascades*

### 🛑 Symptoms
When launching the full stack with `docker compose up`, `chandas-server` was flagged as `unhealthy`, preventing `chandas-client` from starting:
```
dependency failed to start: container chandas-server is unhealthy
```

### 🔍 Root Cause
The previous healthcheck command used an asynchronous `node -e` script that lacked an `.on('error')` network rejection handler. When the server was still initializing, unhandled network errors caused Node to hang, exceeding the timeout.

### 💻 Commands Used During Investigation & Verification
```bash
# 1. Test Node inline healthcheck command and inspect exit code
node -e "require('http').get('http://127.0.0.1:5000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
echo "Exit code: $?"

# 2. Check real-time container health states
docker compose ps
```

### ✅ Resolution
Updated `docker-compose.yml` to use `CMD-SHELL` with explicit exit codes and error handlers:
```yaml
healthcheck:
  test: ["CMD-SHELL", "node -e \"require('http').get('http://127.0.0.1:5000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))\""]
  interval: 5s
  timeout: 3s
  retries: 5
  start_period: 3s
```

---

## 5. Issue 5: Proxy IP Header Overflow in Audit Trigger (`VARCHAR(45)` Exceeded)

### ⏱️ Phase: *Production Data Mutation & Multi-Proxy Routing*

### 🛑 Symptoms
When submitting a new collection entry from the frontend, the API failed with HTTP 500:
```
createCollection error: error: value too long for type character varying(45)
```

### 🔍 Root Cause
- In `server/src/config/rlsDb.js`, `req.headers['x-forwarded-for']` was passed directly to PostgreSQL session variables.
- When requests pass through reverse proxies (Nginx / Docker gateway), `x-forwarded-for` contains a comma-separated chain of IP addresses (e.g. `172.22.0.1, 10.0.0.1, ::ffff:127.0.0.1`), exceeding the `VARCHAR(45)` limit of the `collection_logs.client_ip` column.
- The PostgreSQL `log_collection_changes()` audit trigger crashed on insert.

### 💻 Commands Used During Investigation & Fix Application
```bash
# 1. Search schema definitions for character varying(45)
grep -rn "VARCHAR(45)" server/

# 2. Apply schema migration to alter client_ip column to TEXT on live Docker container
docker exec chandas-db psql -U postgres -d collection_db -c "
ALTER TABLE collection_logs ALTER COLUMN client_ip TYPE TEXT;
"

# 3. Update trigger function definition inside live container
docker exec chandas-db psql -U postgres -d collection_db -c "
CREATE OR REPLACE FUNCTION log_collection_changes()
RETURNS TRIGGER AS \$\$
DECLARE
    v_user_id INT;
    v_role VARCHAR(20);
    v_ip TEXT;
BEGIN
    ...
END;
\$\$ LANGUAGE plpgsql;
"

# 4. Restart backend server container to apply fixes
docker compose restart server
```

### ✅ Resolution
1. **Schema Migration:** Altered `collection_logs.client_ip` from `VARCHAR(45)` to `TEXT`.
2. **Trigger Function:** Updated `v_ip TEXT;` variable in `log_collection_changes()`.
3. **App Level Sanitization:** Updated `server/src/config/rlsDb.js` to extract only the client's primary IP:
   ```javascript
   const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
   const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim().slice(0, 100) : '';
   ```

---

## 📋 Master CLI & DevOps Operations Playbook

### 1. 🚀 Docker Compose Pipeline Orchestration
```bash
# Build and start all services in the background
docker compose up -d --build

# View real-time container status and health
docker compose ps

# View live trailing logs from all services
docker compose logs -f --tail 50

# View logs for a specific service
docker compose logs -f server

# Restart a single service without restarting the entire stack
docker compose restart server

# Stop and remove all containers, networks (preserves database volume)
docker compose down

# Stop and wipe all data volumes (full reset)
docker compose down -v
```

### 2. 🗄️ PostgreSQL Database Inspection & Debugging
```bash
# Open interactive psql shell inside Docker PostgreSQL container
docker exec -it chandas-db psql -U postgres -d collection_db

# Query tables from host WSL (outside Docker)
PGPASSWORD="Guru@123" psql -h localhost -p 5434 -U postgres -d collection_db -c "SELECT COUNT(*) FROM collections;"

# Show physical disk storage location of database
PGPASSWORD="Guru@123" psql -h localhost -p 5434 -U postgres -d collection_db -c "SHOW data_directory;"

# Inspect table file nodes
PGPASSWORD="Guru@123" psql -h localhost -p 5434 -U postgres -d collection_db -c "
SELECT relname, pg_relation_filepath(oid) FROM pg_class WHERE relname IN ('users', 'collections', 'collection_logs');
"
```

### 3. 🌐 API & Endpoint Health Verification
```bash
# Test backend health endpoint
curl -s http://127.0.0.1:5000/api/health

# Test frontend Nginx HTTP header response
curl -I http://127.0.0.1:5173/

# Test collection records endpoint with JWT token
curl -s -H "Authorization: Bearer <YOUR_JWT_TOKEN>" http://127.0.0.1:5000/api/records
```

### 4. 🧪 Automated Test Suite Execution
```bash
# Run backend integration tests
cd /home/guru/projects/project-6/collection-app/server
npm test
```
