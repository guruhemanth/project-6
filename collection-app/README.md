# 🕉 Vinayaka Chavithi Chandas Collection App 2026

A modern, production-ready, **multi-tenant real-time festival fund collection and audit platform** built for housing societies and festival committees.

---

## 🌟 Key Features

- 🏛️ **Multi-Tenant Collection Spaces:** Each festival committee/society registers as an independent Admin space with its own isolated total, records, collectors, and audit history.
- 🔐 **Bcrypt Security & Role-Based Access:** All passwords are encrypted with bcrypt (10 rounds). Admins manage collectors; collectors perform door-to-door fund logging.
- ⚡ **Real-Time Live Sync (Socket.io):** Instant collection totals and live feeds across all connected mobile devices and desktops with zero-latency room isolation.
- 📜 **Automated Database Audit Triggers:** Powered by PostgreSQL PL/pgSQL triggers logging immutable before-and-after JSONB snapshots on every `INSERT`, `UPDATE`, and `DELETE`.
- 🔍 **Multi-Criteria Search & Filtering:** Filter by donor name, door number, amount range, and sort order.
- 🐳 **Full Dockerization:** Production-ready multi-stage Docker builds and `docker-compose.yml` for 1-command deployment.
- 🧪 **34 Automated Tests:** Native Node.js test suite covering auth, protection, multi-tenant isolation, CRUD, and database triggers (100% pass rate).

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 (Vite), Tailwind CSS, Lucide React, Zustand State Management, Axios |
| **Backend API** | Node.js 20, Express, Socket.io, JSON Web Tokens (JWT), BcryptJS |
| **Database** | PostgreSQL 16 with PL/pgSQL Triggers & JSONB Audit Logs |
| **Containerization** | Docker, Docker Compose, Multi-stage Nginx Alpine SPA server |

---

## 📚 Documentation Index

- 🏛️ **[System Architecture & Design Document (docs/ARCHITECTURE.md)](docs/ARCHITECTURE.md)** — Architectural diagrams, ERD schema, multi-tenant security invariants, and Socket.io room lifecycle.
- 📡 **[REST API Specification (docs/API_DOCUMENTATION.md)](docs/API_DOCUMENTATION.md)** — Comprehensive endpoints, query parameters, request/response payloads, and error codes.

---

## 🚀 Quick Start with Docker (Recommended)

Run the entire application stack (PostgreSQL + Express/Socket.io API + React/Nginx SPA) with a single command:

```bash
docker compose up -d --build
```

### Accessing the Services:
- 🌐 **Frontend Application:** [http://localhost:5173](http://localhost:5173) (or `http://localhost:80`)
- ⚙️ **Backend REST API:** [http://localhost:5000](http://localhost:5000)
- 🗄️ **PostgreSQL Database:** `localhost:5432`

To stop all containers:
```bash
docker compose down
```

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm 9+

### 2. Database Initialization
```bash
psql -U postgres -c "CREATE DATABASE collection_db;"
```

### 3. Backend Setup
```bash
cd server
cp .env.example .env
# Edit .env with your PostgreSQL credentials if needed
npm install
npm run dev
```
> The backend boots on `http://localhost:5000` and automatically runs idempotent schema checks and seed verification.

### 4. Run Automated Test Suite
```bash
cd server
npm test
```
*(Runs 34 automated integration tests across 9 test suites).*

### 5. Frontend Setup
```bash
cd client
npm install
npm run dev
```
> The frontend will be live on `http://localhost:5173`.

---

## 🔑 Default Accounts

| Society / Space | Username | Password | Role | Access Level |
|---|---|---|---|---|
| **GovindaNagar** | `GovindaNagar` | `GN@123` | **Admin** | Primary Admin with full collection control |

*You can register new independent society spaces on the login page by clicking **"New Admin Space"**!*

---

## 📂 Project Structure

```
collection-app/
├── client/                      # React SPA (Vite + Tailwind + Zustand)
│   ├── src/
│   │   ├── components/Header.jsx # Dynamic society navigation & stats badge
│   │   ├── pages/
│   │   │   ├── HomePage.jsx     # Quick entry form & live recent feed
│   │   │   ├── RecordsPage.jsx  # Search, filter, edit & delete records
│   │   │   ├── HistoryPage.jsx  # Immutable audit log timeline
│   │   │   ├── UsersPage.jsx    # Admin-only collector management
│   │   │   └── LoginPage.jsx    # 2-button Sign In / New Admin Space
│   │   ├── store/useCollectionStore.js # Zustand store & Socket.io client
│   │   └── services/api.js      # Axios instance & token interceptors
│   ├── Dockerfile               # Multi-stage Vite build + Nginx Alpine
│   └── nginx.conf               # SPA routing & backend reverse proxy
│
├── server/                      # Node.js Express REST API & Socket.io
│   ├── src/
│   │   ├── config/db.js         # PostgreSQL pool & auto-healing integrity check
│   │   ├── controllers/         # Multi-tenant scoped business logic
│   │   ├── middleware/auth.js   # JWT authentication & tenant injection
│   │   ├── routes/              # Express API route declarations
│   │   ├── scripts/init-db.sql  # Schema DDL, indexes & PL/pgSQL triggers
│   │   ├── sockets/socketHandler.js # Socket.io room partitioning
│   │   └── server.js            # Express server initialization
│   ├── test/api.test.js         # 34 automated unit/integration tests
│   └── Dockerfile               # Node 20 Alpine production image
│
├── docs/
│   ├── ARCHITECTURE.md          # System architecture, ERD & lifecycle diagrams
│   └── API_DOCUMENTATION.md     # Complete REST API reference
│
├── docker-compose.yml           # Multi-service orchestration
└── README.md                    # Project documentation
```

---

## 🌐 Production Deployment

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and our deployment guide:
- **Free Cloud Option:** Frontend on [Vercel](https://vercel.com) + Backend on [Render](https://render.com) + DB on [Neon.tech](https://neon.tech)
- **VPS / VM Option:** Run `docker compose up -d --build` on any Linux cloud server.

---

🙏 **గణపతి బాప్పా మోరయా! Happy Festival Collection!** 🙏
