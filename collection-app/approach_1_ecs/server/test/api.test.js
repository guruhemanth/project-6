import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5173';
let authToken = '';
let testRecordId = null;

describe('Vinayaka Chavithi Chandas Collection API Test Suite', () => {

  // ── 1. Health Endpoint ──
  describe('1. Health Check Endpoint', () => {
    test('GET /api/health - should return status ok without authentication', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      assert.equal(res.status, 200, 'Health endpoint should return 200');
      
      const body = await res.json();
      assert.equal(body.status, 'ok', 'Status should be ok');
      assert.ok(body.timestamp, 'Response should contain timestamp');
    });
  });

  // ── 2. Authentication ──
  describe('2. Authentication Endpoint (POST /api/auth/login)', () => {
    test('should reject request with missing credentials', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 400, 'Should return 400 for empty body');
      const body = await res.json();
      assert.ok(body.error, 'Should return error message');
    });

    test('should reject invalid password', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'GovindaNagar', password: 'WrongPassword' }),
      });

      assert.equal(res.status, 401, 'Should return 401 for wrong credentials');
      const body = await res.json();
      assert.equal(body.error, 'Invalid username or password.');
    });

    test('should succeed with valid credentials and return JWT token', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'GovindaNagar', password: 'GN@123' }),
      });

      assert.equal(res.status, 200, 'Should return 200 for valid credentials');
      const body = await res.json();
      assert.ok(body.token, 'Should return JWT token');
      assert.equal(body.username, 'GovindaNagar');
      
      authToken = body.token;
    });
  });

  // ── 3. Route Protection ──
  describe('3. Route Protection Middleware', () => {
    test('GET /api/records - should reject request without Authorization header', async () => {
      const res = await fetch(`${BASE_URL}/api/records`);
      assert.equal(res.status, 401, 'Should return 401 without auth header');
    });

    test('GET /api/stats/total - should reject invalid JWT token', async () => {
      const res = await fetch(`${BASE_URL}/api/stats/total`, {
        headers: { Authorization: 'Bearer invalid.token.signature' },
      });
      assert.equal(res.status, 401, 'Should return 401 for invalid token');
    });
  });

  // ── 4. Stats Endpoint ──
  describe('4. Stats Aggregate Endpoint (GET /api/stats/total)', () => {
    test('should return total collection and donor count as numbers', async () => {
      const res = await fetch(`${BASE_URL}/api/stats/total`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(typeof body.total, 'number', 'total should be a number');
      assert.equal(typeof body.count, 'number', 'count should be a number');
      assert.ok(body.total >= 0, 'total must be non-negative');
      assert.ok(body.count >= 0, 'count must be non-negative');
    });
  });

  // ── 5. Records CRUD Lifecycle ──
  describe('5. Collection Records CRUD Operations', () => {

    test('POST /api/records - should reject missing name/door/amount', async () => {
      const res = await fetch(`${BASE_URL}/api/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: 'Incomplete' }),
      });

      assert.equal(res.status, 400);
    });

    test('POST /api/records - should reject non-positive amount', async () => {
      const res = await fetch(`${BASE_URL}/api/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: 'Zero Pay', door_number: '1-1', amount: -50 }),
      });

      assert.equal(res.status, 400);
    });

    test('POST /api/records - should create a new record successfully', async () => {
      const testPayload = {
        name: 'AutoTest Member',
        door_number: '9-99/X',
        amount: 1500,
      };

      const res = await fetch(`${BASE_URL}/api/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(testPayload),
      });

      assert.equal(res.status, 201, 'Should return 201 Created');
      const body = await res.json();
      assert.ok(body.id, 'Created record should have an id');
      assert.equal(body.name, testPayload.name);
      assert.equal(body.door_number, testPayload.door_number);
      assert.equal(parseFloat(body.amount), testPayload.amount);
      assert.ok(body.created_at, 'Should contain created_at timestamp');

      testRecordId = body.id;
    });

    test('GET /api/records - should retrieve all records', async () => {
      const res = await fetch(`${BASE_URL}/api/records`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const records = await res.json();
      assert.ok(Array.isArray(records), 'Records should be an array');
      const found = records.some(r => r.id === testRecordId);
      assert.ok(found, 'Created test record should be in the list');
    });

    test('GET /api/records?q= - should filter by search keyword', async () => {
      const res = await fetch(`${BASE_URL}/api/records?q=AutoTest`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const records = await res.json();
      assert.ok(records.length > 0, 'Should find at least 1 matching record');
      assert.ok(records.every(r => r.name.includes('AutoTest') || r.door_number.includes('AutoTest')));
    });

    test('GET /api/records?minAmount=&sortBy= - should filter by amount and sort', async () => {
      const res = await fetch(`${BASE_URL}/api/records?minAmount=1000&sortBy=amount&sortOrder=DESC`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const records = await res.json();
      assert.ok(Array.isArray(records));
      assert.ok(records.every(r => parseFloat(r.amount) >= 1000), 'All amounts should be >= 1000');
    });

    test('PUT /api/records/:id - should update the record', async () => {
      assert.ok(testRecordId, 'testRecordId must exist');

      const updatedPayload = {
        name: 'AutoTest Member Updated',
        door_number: '9-99/X-NEW',
        amount: 2500,
      };

      const res = await fetch(`${BASE_URL}/api/records/${testRecordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(updatedPayload),
      });

      assert.equal(res.status, 200, 'Should return 200 OK');
      const body = await res.json();
      assert.equal(body.id, testRecordId);
      assert.equal(body.name, updatedPayload.name);
      assert.equal(body.door_number, updatedPayload.door_number);
      assert.equal(parseFloat(body.amount), updatedPayload.amount);
    });

    test('DELETE /api/records/:id - should delete the record', async () => {
      assert.ok(testRecordId, 'testRecordId must exist');

      const res = await fetch(`${BASE_URL}/api/records/${testRecordId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200, 'Should return 200 OK');
      const body = await res.json();
      assert.equal(body.message, 'Record deleted successfully.');
      assert.equal(body.record.id, testRecordId);
    });

    test('PUT /api/records/:id - should return 404 for deleted record', async () => {
      const res = await fetch(`${BASE_URL}/api/records/${testRecordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: 'Ghost', door_number: '0', amount: 100 }),
      });

      assert.equal(res.status, 404);
    });
  });

  // ── 6. Audit History & Trigger Verification ──
  describe('6. Automated Audit Trigger Logs (GET /api/history)', () => {
    test('GET /api/history - should retrieve audit log entries with INSERT, UPDATE, and DELETE', async () => {
      const res = await fetch(`${BASE_URL}/api/history`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const logs = await res.json();
      assert.ok(Array.isArray(logs), 'Audit logs should be an array');
      assert.ok(logs.length >= 3, 'Should have at least INSERT, UPDATE, and DELETE logs');

      // Verify that our testRecordId had all 3 actions logged automatically by the trigger
      const testLogs = logs.filter(l => (l.entity_id === testRecordId) || (l.collection_id === testRecordId) || (l.new_data?.id === testRecordId) || (l.old_data?.id === testRecordId));
      const actions = testLogs.map(l => l.action_type);

      assert.ok(actions.includes('INSERT'), 'Audit logs must contain INSERT action from trigger');
      assert.ok(actions.includes('UPDATE'), 'Audit logs must contain UPDATE action from trigger');
      assert.ok(actions.includes('DELETE'), 'Audit logs must contain DELETE action from trigger');
    });

    test('GET /api/history?action=UPDATE - should filter audit logs by action_type', async () => {
      const res = await fetch(`${BASE_URL}/api/history?action=UPDATE`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const logs = await res.json();
      assert.ok(logs.every(l => l.action_type === 'UPDATE'), 'All logs must be of type UPDATE');
    });

    test('GET /api/history?q= - should filter audit logs by donor search keyword', async () => {
      const res = await fetch(`${BASE_URL}/api/history?q=AutoTest`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const logs = await res.json();
      assert.ok(logs.length > 0, 'Should find audit logs matching AutoTest');
    });
  });

  // ── 7. Multi-User Management & Bcrypt Password Hashing ──
  describe('7. Multi-User Management & Bcrypt Hashing', () => {
    let createdUserId = null;
    const testUsername = `TestCollector_${Date.now()}`;
    const testPassword = 'SecretPass@123';

    test('POST /api/users - should reject invalid/short username or password', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ username: 'ab', password: '12' }),
      });

      assert.equal(res.status, 400, 'Should reject short credentials');
    });

    test('POST /api/users - should create a new collector with bcrypt hashed password', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          username: testUsername,
          password: testPassword,
          role: 'collector',
        }),
      });

      assert.equal(res.status, 201, 'Should return 201 Created');
      const body = await res.json();
      assert.ok(body.id, 'Created user should have an id');
      assert.equal(body.username, testUsername);
      assert.equal(body.role, 'collector');
      assert.equal(body.password_hash, undefined, 'Must not expose password_hash');

      createdUserId = body.id;
    });

    test('POST /api/users - should reject duplicate username', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          username: testUsername,
          password: 'AnotherPassword',
        }),
      });

      assert.equal(res.status, 409, 'Should return 409 Conflict for duplicate username');
    });

    test('POST /api/auth/login - should authenticate newly created user using bcrypt', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testUsername,
          password: testPassword,
        }),
      });

      assert.equal(res.status, 200, 'Should login successfully');
      const body = await res.json();
      assert.ok(body.token, 'Should return JWT token for new user');
      assert.equal(body.username, testUsername);
      assert.equal(body.role, 'collector');
    });

    test('GET /api/users - should list users without leaking password hashes', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const users = await res.json();
      assert.ok(Array.isArray(users));
      assert.ok(users.length >= 2, 'Should have at least default admin and new collector');
      assert.ok(users.every(u => u.password_hash === undefined), 'Password hashes must never be exposed');
    });

    test('DELETE /api/users/:id - should reject deleting own active account', async () => {
      // First get current user id
      const usersRes = await fetch(`${BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const users = await usersRes.json();
      const admin = users.find(u => u.username === 'GovindaNagar');

      const res = await fetch(`${BASE_URL}/api/users/${admin.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 400, 'Should reject self-deletion');
    });

    test('DELETE /api/users/:id - should delete created collector account', async () => {
      assert.ok(createdUserId, 'createdUserId must exist');

      const res = await fetch(`${BASE_URL}/api/users/${createdUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200, 'Should return 200 OK');
      const body = await res.json();
      assert.equal(body.message, 'Collector deleted successfully.');
    });
  });

  // ── 8. Multi-Tenant Collection Space Isolation & Permissions ──
  describe('8. Multi-Tenant Collection Space Isolation & Admin Permissions', () => {
    let admin2Token = '';
    let admin2RecordId = null;
    let collectorToken = '';

    test('POST /api/auth/register - should create a new independent Admin space (SaiNagar Colony)', async () => {
      const uniqueAdmin = `Admin_${Date.now()}`;
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: uniqueAdmin,
          password: 'AdminPassword@123',
          society_name: 'SaiNagar Colony',
        }),
      });

      assert.equal(res.status, 201, 'Should create new Admin space');
      const body = await res.json();
      assert.ok(body.token);
      assert.equal(body.role, 'admin');
      assert.equal(body.societyName, 'SaiNagar Colony');
      admin2Token = body.token;
    });

    test('Admin 2 space should initially have 0 total collection and 0 records', async () => {
      const statsRes = await fetch(`${BASE_URL}/api/stats/total`, {
        headers: { Authorization: `Bearer ${admin2Token}` },
      });
      const stats = await statsRes.json();
      assert.equal(stats.total, 0, 'New space total should be 0');
      assert.equal(stats.count, 0, 'New space count should be 0');

      const recRes = await fetch(`${BASE_URL}/api/records`, {
        headers: { Authorization: `Bearer ${admin2Token}` },
      });
      const recs = await recRes.json();
      assert.equal(recs.length, 0, 'New space should have 0 records');
    });

    test('Admin 2 creates a record in their own space', async () => {
      const res = await fetch(`${BASE_URL}/api/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin2Token}`,
        },
        body: JSON.stringify({
          name: 'Sai Resident 1',
          door_number: '12-34',
          amount: 5000,
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      admin2RecordId = body.id;
      assert.equal(parseFloat(body.amount), 5000);
    });

    test('Admin 1 (GovindaNagar) should NOT see Admin 2 (SaiNagar) records', async () => {
      const res = await fetch(`${BASE_URL}/api/records`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const recs = await res.json();
      const leaked = recs.some(r => r.id === admin2RecordId);
      assert.equal(leaked, false, 'Admin 1 must NOT see Admin 2 records');
    });

    test('Admin 2 creates a collector inside their space', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin2Token}`,
        },
        body: JSON.stringify({
          username: `SaiCollector_${Date.now()}`,
          password: 'CollectorPass@123',
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.role, 'collector');

      // Login as this collector
      const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: body.username,
          password: 'CollectorPass@123',
        }),
      });
      const loginData = await loginRes.json();
      collectorToken = loginData.token;
    });

    test('Collector CANNOT create other collectors (403 Forbidden)', async () => {
      const res = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collectorToken}`,
        },
        body: JSON.stringify({
          username: 'UnauthorizedUser',
          password: 'Password@123',
        }),
      });

      assert.equal(res.status, 403, 'Collector must be forbidden from creating users');
    });

    test('Collector CAN add collection records to their assigned Admin space', async () => {
      const res = await fetch(`${BASE_URL}/api/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collectorToken}`,
        },
        body: JSON.stringify({
          name: 'Sai Resident 2',
          door_number: '12-35',
          amount: 2500,
        }),
      });

      assert.equal(res.status, 201);
    });

    test('Admin 2 stats should now reflect both records (total ₹7500, count 2)', async () => {
      const res = await fetch(`${BASE_URL}/api/stats/total`, {
        headers: { Authorization: `Bearer ${admin2Token}` },
      });
      const stats = await res.json();
      assert.equal(stats.total, 7500);
      assert.equal(stats.count, 2);
    });

    test('Allow same collector username across different societies', async () => {
      const sharedCollectorName = `SharedCollector_${Date.now()}`;

      // Create collector in Admin 1 space
      const res1 = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          username: sharedCollectorName,
          password: 'Pass1@123',
        }),
      });
      assert.equal(res1.status, 201, 'Should allow collector creation in Society 1');

      // Create collector with SAME username in Admin 2 space
      const res2 = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin2Token}`,
        },
        body: JSON.stringify({
          username: sharedCollectorName,
          password: 'Pass2@123',
        }),
      });
      assert.equal(res2.status, 201, 'Should allow same collector username in Society 2');

      // Reject duplicate in SAME space
      const res3 = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin2Token}`,
        },
        body: JSON.stringify({
          username: sharedCollectorName,
          password: 'Pass3@123',
        }),
      });
      assert.equal(res3.status, 409, 'Should reject duplicate collector username in SAME society');
    });

    test('Registration with City & State', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `TirupatiAdmin_${Date.now()}`,
          password: 'Password@123',
          society_name: 'Balaji Colony',
          city: 'Tirupati',
          state: 'Andhra Pradesh',
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.city, 'Tirupati');
      assert.equal(data.state, 'Andhra Pradesh');
    });
  });

});

