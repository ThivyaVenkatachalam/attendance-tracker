# AttendEase — Attendance & Leave Tracker

A full-stack attendance management system for colleges, supporting multiple roles, optimistic concurrency, and real-time dashboards.

## Architecture

```
┌─────────────────────┐        ┌─────────────────────┐        ┌─────────────────┐
│    React Client      │ ──────▶│   Express Server     │ ──────▶│    MySQL DB      │
│    Vite : 5173       │ ◀──────│   Node.js : 5000     │ ◀──────│   Port 3306      │
└─────────────────────┘        └─────────────────────┘        └─────────────────┘
         │                               │
         │                               ├── JWT Auth (access + refresh tokens)
         │                               ├── OCC Version-based conflict handling
         │                               ├── Audit Logs → MySQL audit_logs table
         │                               ├── Metrics Tracker (count, avg_ms, p95_ms)
         │                               └── Faculty Tripwire (faculty_classes table)
         │
         ├── Zustand (global state)
         ├── React Router (role-based routing)
         ├── Draft Recovery (sessionStorage per session)
         └── ConflictResolver UI (Reload / Retry / Compare)

Roles:   Admin ──▶ Full access, approve/reject leave, view all dashboards
         Faculty ──▶ Mark attendance for assigned sessions only
         Student ──▶ View own attendance, submit leave requests
         HOD ──▶ Department-level oversight
         Parent ──▶ View linked student attendance
```

## Project Structure

```
attendance-tracker/
├── database/
│   ├── schema.sql          # Database schema
│   └── seed.sql            # Sample data
├── server/                 # Node.js / Express backend
│   ├── src/
│   │   ├── app.js
│   │   ├── config/         # DB, env, logger
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth, error handling
│   │   ├── models/         # Database queries
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Errors, response, metrics
│   │   ├── validators/     # Zod schemas
│   │   └── tests/          # Jest test files
│   ├── .env                # Environment variables (not tracked)
│   └── package.json
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Route pages
│   │   ├── store/          # Zustand stores
│   │   ├── api/            # API calls
│   │   └── hooks/          # Custom hooks (useDraft etc.)
│   └── public/
│       └── sample_attendance.csv
├── sample-data/            # Sample CSV files for submission
│   └── sample_attendance.csv
├── AI_AUDIT_LOG.md
├── debrief.md
└── README.md
```

## Prerequisites

- **Node.js** 16+
- **MySQL** 8.0+ on port 3306

## Setup Instructions

### 1. Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Create Environment Variables

Create `server/.env`:

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=attendance_tracker
DB_POOL_MIN=2
DB_POOL_MAX=10
JWT_ACCESS_SECRET=your_very_long_random_secret_at_least_32_characters_access
JWT_REFRESH_SECRET=your_very_long_random_secret_at_least_32_characters_refresh
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CLIENT_URL=http://localhost:5173
LOG_LEVEL=info
```

### 3. Initialize Database

```bash
cd server
npm run db:init
```

### 4. Seed Sample Data

```bash
mysql -u root -p < database/seed.sql
```

### 5. Start the App

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Visit `http://localhost:5173`

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@college.edu | Test@1234 |
| Faculty | priya.sharma@college.edu | Test@1234 |
| Faculty | arjun.nair@college.edu | Test@1234 |
| Student | arun.kumar@student.edu | Test@1234 |
| Parent | parent.arun@example.com | Test@1234 |
| HOD | hod.cs@college.edu | Test@1234 |

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/attendance/sessions` | List sessions |
| POST | `/api/attendance/sessions/:id/bulk` | Bulk mark attendance |
| PATCH | `/api/attendance/:id` | Update record (OCC) |
| POST | `/api/attendance/import` | CSV import |
| POST | `/api/leave` | Submit leave request |
| PATCH | `/api/leave/:id` | Approve/reject leave (admin) |
| GET | `/api/dashboard/admin` | Admin dashboard |
| GET | `/api/dashboard/faculty` | Faculty dashboard |
| GET | `/api/dashboard/student` | Student dashboard |
| GET | `/metrics` | Performance metrics (admin) |
| GET | `/health` | Health check |

## Search & Filter Design

The Students page supports multi-dimensional filtering:

- **Search by name or roll number** — server-side SQL `LIKE` query on `name` and `roll_no` columns for accuracy
- **Filter by Department** — exact match on `department` column
- **Filter by Semester** — exact match on `semester` column
- **Filter by Attendance Range** — min/max percentage computed server-side using attendance records aggregate query, not cached values
- **Filter by Leave Status** — joins `leave_requests` table to find students with pending/approved/rejected leave

All filters are combinable and applied in a single query for performance.

## Draft Recovery

Unsaved attendance changes survive a page refresh using `sessionStorage`:

- Each attendance session gets its own draft key: `draft_session_{sessionId}`
- On page load, if a draft exists, a banner appears: *"You have unsaved changes from your last session"*
- Faculty can restore or discard the draft

**Limitations:**
- Drafts are stored in `sessionStorage` — cleared when the browser tab is closed
- Drafts do not sync across multiple tabs or devices
- Only one draft per session ID is kept at a time
- Drafts do not expire automatically

## Optimistic Concurrency Control

Version-based conflict detection on attendance updates:

1. Client fetches attendance records (each has a `version` number)
2. Faculty edits and submits with the current version
3. Server runs: `UPDATE ... WHERE id = ? AND version = ?`
4. If `affectedRows = 0` → version mismatch → 409 Conflict returned
5. UI shows **ConflictResolver** modal with 3 options:
   - **Reload Latest** — discard local changes, fetch server state
   - **Retry Update** — resubmit with the latest version
   - **Compare Changes** — side-by-side diff of local vs server value

## Observability

**Structured Audit Logs** saved to `audit_logs` table for every:
- Attendance create / update / bulk / CSV import
- Leave approval / rejection

Each log entry includes: `actor_id`, `student_id`, `action`, `status`, `latency_ms`, `meta`

**Metrics Endpoint** (`GET /metrics` — admin only):
```json
{
  "attendance_bulk": { "count": 5, "avg_ms": 30, "p95_ms": 45 },
  "POST /login":     { "count": 4, "avg_ms": 888, "p95_ms": 907 }
}
```

## Running Tests

```bash
cd server
npm test
```

Tests cover:
- Attendance concurrency conflict (version mismatch → 409)
- Leave approval workflow
- Faculty unauthorized session access (tripwire)

## Troubleshooting

### "Access denied for user 'root'@'localhost'"
Update `DB_PASSWORD` in `server/.env` to match your MySQL password.

### "Table does not exist"
Run `npm run db:init` from the `server/` directory.

### "Cannot find module"
```bash
rm -rf node_modules && npm install
```

## Development Notes

- ES Modules (`"type": "module"`) — all imports use `.js` extensions
- Environment variables validated with Zod on startup
- Metrics are in-memory — reset on server restart (use Prometheus for production)
- All seed passwords are bcrypt hashed (cost 12)
