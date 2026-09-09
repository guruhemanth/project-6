# 📡 REST API Specification

All protected endpoints require a valid JWT token passed in the `Authorization` header:
```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
Authenticates an Admin or Collector using bcrypt-hashed password verification.

- **Access:** Public
- **Request Body:**
  ```json
  {
    "username": "GovindaNagar",
    "password": "GN@123"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "id": 1,
    "username": "GovindaNagar",
    "role": "admin",
    "adminId": 1,
    "societyName": "GovindaNagar"
  }
  ```
- **Error Response (401 Unauthorized):**
  ```json
  {
    "error": "Invalid username or password."
  }
  ```

---

### `POST /api/auth/register`
Creates a brand new **Admin** account with its own isolated **Collection Space** (Society).

- **Access:** Public
- **Request Body:**
  ```json
  {
    "username": "SaiAdmin",
    "password": "SecurePassword@123",
    "society_name": "SaiNagar Colony"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "id": 10,
    "username": "SaiAdmin",
    "role": "admin",
    "adminId": 10,
    "societyName": "SaiNagar Colony",
    "message": "Admin account & collection space for \"SaiNagar Colony\" created successfully!"
  }
  ```

---

## 2. Collector & User Management

### `GET /api/users`
Retrieves all authorized users (Admin & Collectors) belonging to the active collection space.

- **Access:** Authenticated (`admin` or `collector`)
- **Success Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "username": "GovindaNagar",
      "role": "admin",
      "society_name": "GovindaNagar",
      "created_at": "2026-08-21T11:13:24.350Z"
    },
    {
      "id": 2,
      "username": "RameshCollector",
      "role": "collector",
      "society_name": "GovindaNagar",
      "created_at": "2026-08-21T11:14:44.780Z"
    }
  ]
  ```

---

### `POST /api/users`
Creates a new **Collector** inside the logged-in admin's collection space.

- **Access:** Admin Only (`role === 'admin'`)
- **Request Body:**
  ```json
  {
    "username": "RameshCollector",
    "password": "Ramesh@123"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "id": 2,
    "username": "RameshCollector",
    "role": "collector",
    "admin_id": 1,
    "society_name": "GovindaNagar",
    "created_at": "2026-08-21T11:14:44.780Z"
  }
  ```
- **Forbidden Response (403 Forbidden):**
  ```json
  {
    "error": "Access denied. Only administrators can create collectors for this collection space."
  }
  ```

---

### `DELETE /api/users/:id`
Deletes a collector from the admin's collection space.

- **Access:** Admin Only (`role === 'admin'`)
- **Success Response (200 OK):**
  ```json
  {
    "message": "Collector deleted successfully.",
    "user": {
      "id": 2,
      "username": "RameshCollector"
    }
  }
  ```

---

## 3. Collections & Fund Management

### `GET /api/stats/total`
Returns real-time aggregate stats for the active collection space.

- **Access:** Authenticated
- **Success Response (200 OK):**
  ```json
  {
    "total": 1005218.00,
    "count": 7
  }
  ```

---

### `GET /api/records`
Lists and filters collection records within the active collection space.

- **Access:** Authenticated
- **Query Parameters:**
  - `q` *(optional)* — Search term (filters across `name` and `door_number`)
  - `minAmount` *(optional)* — Minimum collection amount filter
  - `maxAmount` *(optional)* — Maximum collection amount filter
  - `sortBy` *(optional)* — `created_at`, `amount`, `name`, `door_number` (default: `created_at`)
  - `sortOrder` *(optional)* — `ASC` or `DESC` (default: `DESC`)
- **Success Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "admin_id": 1,
      "collector_name": "GovindaNagar",
      "name": "Dr. V. Prasad",
      "door_number": "4-12/A",
      "amount": "50000.00",
      "created_at": "2026-08-21T06:45:00.000Z",
      "updated_at": "2026-08-21T06:45:00.000Z"
    }
  ]
  ```

---

### `POST /api/records`
Creates a new collection record and broadcasts a `COLLECTION_MUTATED` event to the space's Socket.io room.

- **Access:** Authenticated (`admin` or `collector`)
- **Request Body:**
  ```json
  {
    "name": "K. Venkatesh",
    "door_number": "2-34/B",
    "amount": 2500
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "id": 8,
    "admin_id": 1,
    "collector_name": "GovindaNagar",
    "name": "K. Venkatesh",
    "door_number": "2-34/B",
    "amount": "2500.00",
    "created_at": "2026-08-21T11:45:00.000Z",
    "updated_at": "2026-08-21T11:45:00.000Z"
  }
  ```

---

### `PUT /api/records/:id`
Updates an existing collection record inside the active collection space.

- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "name": "K. Venkatesh",
    "door_number": "2-34/B",
    "amount": 3000
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "id": 8,
    "admin_id": 1,
    "collector_name": "GovindaNagar",
    "name": "K. Venkatesh",
    "door_number": "2-34/B",
    "amount": "3000.00",
    "updated_at": "2026-08-21T11:48:00.000Z"
  }
  ```

---

### `DELETE /api/records/:id`
Deletes a collection record by ID within the active collection space.

- **Access:** Authenticated
- **Success Response (200 OK):**
  ```json
  {
    "message": "Record deleted successfully.",
    "record": {
      "id": 8,
      "name": "K. Venkatesh",
      "amount": "3000.00"
    }
  }
  ```

---

## 4. Audit History & Activity Logs

### `GET /api/history`
Fetches the immutable timeline of changes generated by the PostgreSQL audit trigger for this collection space.

- **Access:** Authenticated
- **Query Parameters:**
  - `q` *(optional)* — Search donor name or door number inside JSONB snapshots
  - `action` *(optional)* — Filter by `ALL`, `INSERT`, `UPDATE`, `DELETE`
  - `sortOrder` *(optional)* — `ASC` or `DESC` (default: `DESC`)
- **Success Response (200 OK):**
  ```json
  [
    {
      "id": 24,
      "admin_id": 1,
      "collection_id": 8,
      "action_type": "INSERT",
      "old_data": null,
      "new_data": {
        "id": 8,
        "name": "K. Venkatesh",
        "door_number": "2-34/B",
        "amount": 2500,
        "admin_id": 1
      },
      "performed_at": "2026-08-21T11:45:00.000Z"
    }
  ]
  ```

---

## 5. System Health Check

### `GET /api/health`
Public liveness probe for container orchestrators and monitoring tools.

- **Access:** Public
- **Response (200 OK):**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-08-22T13:22:00.000Z"
  }
  ```
