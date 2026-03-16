# ⚡ APIFlow Docs

> A real-time collaborative API documentation platform — Google Docs + Swagger + Postman combined.

## 🚀 Features

- **Real-Time Collaborative Editing** — Multiple developers can edit documentation simultaneously with live cursors and CRDT-based conflict-free syncing
- **API Documentation Builder** — Create rich API docs with endpoints, schemas, headers, query parameters, and auth types
- **Built-in API Playground** — Test APIs directly from documentation, similar to Postman
- **API Contract System** — Define request/response schemas with automatic OpenAPI spec generation
- **Shareable Documentation** — Generate public read-only or team-editable share links
- **Version History** — Track every change with full timeline, compare versions, and restore previous states
- **Smart Search** — Find any API by endpoint, tag, description, or HTTP method
- **Mock API Generator** — Auto-generate mock APIs from defined contracts for frontend development
- **API Tree Visualization** — Navigate your entire API structure in a collapsible tree view
- **Import/Export** — Import Swagger/OpenAPI/Postman collections, export to OpenAPI spec or Postman

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React.js, TypeScript, TailwindCSS v4, Monaco Editor |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | PostgreSQL |
| **Real-time** | Socket.IO, Yjs CRDT |
| **Deployment** | Docker, Docker Compose |

## 📁 Project Structure

```
apiflow-docs/
├── frontend/          React + TypeScript + TailwindCSS
│   └── src/
│       ├── components/   UI components
│       ├── pages/        Page components
│       ├── hooks/        Custom hooks (auth, socket)
│       ├── lib/          API client, utilities
│       └── types/        TypeScript types
├── backend/           Express.js + TypeScript
│   └── src/
│       ├── routes/       REST API routes
│       ├── config/       Database configuration
│       ├── middleware/   Auth middleware
│       └── websocket/   Socket.IO server
├── database/          PostgreSQL schema & seed
├── docker/            Docker configuration
└── README.md
```

## 🏁 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1. Database Setup

```bash
# Create the database
createdb apiflow_docs

# Run the schema
psql apiflow_docs < database/schema.sql

# Seed demo data (optional)
psql apiflow_docs < database/seed.sql
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env .env.local  # Edit with your database credentials
npm run dev
```

The backend will start at `http://localhost:4000`.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:5173`.

### 4. Docker Setup (Alternative)

```bash
cd docker
docker-compose up -d
```

This starts PostgreSQL, Redis, backend, and frontend. Access at `http://localhost:3000`.

## 🔑 Demo Credentials

```
Email: demo@apiflow.dev
Password: demo123
```

## 📡 API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Get current user |
| `GET` | `/api/projects` | List projects |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects/:id/tree` | Get API tree |
| `POST` | `/api/apis/project/:id` | Create API group |
| `POST` | `/api/endpoints/api/:id` | Create endpoint |
| `PUT` | `/api/endpoints/:id` | Update endpoint |
| `POST` | `/api/playground/test` | Test API endpoint |
| `GET` | `/api/export/:id/openapi` | Export OpenAPI spec |
| `POST` | `/api/export/:id/import` | Import spec |
| `GET` | `/api/search?q=` | Search APIs |
| `ALL` | `/api/mock/:slug/*` | Mock API responses |

## 🔌 WebSocket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `doc:join` | Client → Server | Join editing session |
| `doc:update` | Bidirectional | CRDT document sync |
| `cursor:update` | Bidirectional | Live cursor positions |
| `user:joined` | Server → Client | User presence |
| `user:left` | Server → Client | User left |

## 📜 License

MIT
