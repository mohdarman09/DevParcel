# DevParcel

A developer-focused VS Code extension for packaging and securely sharing development projects.

DevParcel lets you package your workspace into a clean ZIP, share it directly via your OS, or generate a temporary download link — all from your editor's sidebar.

## Features

- **Download Project as ZIP** — One-click workspace packaging with intelligent exclusions
- **Secure Project Exclusions** — Automatically excludes `node_modules/`, `.git/`, build artifacts, and more
- **Sensitive File Protection** — Detects `.env`, `.pem`, `.key`, and other secrets before packaging
- **Share ZIP via OS** — Share directly through Windows Explorer or your platform's native sharing
- **Generate Temporary Download Links** — Create secure, expiring links for project sharing
- **Configurable Link Expiry** — Set custom expiry from 1 hour to 7 days per share
- **Share History** — Track all your shared links with status, expiry, and download counts
- **Share Revocation** — Instantly revoke any active share link
- **Password-Protected Shares** — Optional Argon2id-hashed password protection with brute-force lockout
- **Upload Progress** — Real-time progress tracking during cloud upload
- **Drag-and-Drop ZIP Sharing** — Drop any ZIP file to share it instantly
- **Recipient Web Download Page** — Premium web experience for recipients to download shared projects
- **50 MB Upload Limit** — Proactive detection with Windows Explorer fallback for oversized packages

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     VS Code Extension                     │
│  Scanner → ZIP Engine → Upload → Share Link Generation    │
└──────────────────┬───────────────────────────────────────┘
                   │ HTTP API
┌──────────────────▼───────────────────────────────────────┐
│                     Backend (Node.js/Express)             │
│  Validation → Disk-Spooled Upload → Storage → DB          │
├──────────────────┬───────────────┬───────────────────────┤
│   PostgreSQL     │  Supabase     │  Rate Limiting         │
│   (Metadata)     │  Storage (S3) │  Security Headers      │
└──────────────────┴───────────────┴───────────────────────┘
                   │ Signed URLs
┌──────────────────▼───────────────────────────────────────┐
│              Recipient Web App (React/Vite)               │
│  Metadata Display → Password Gate → Secure Download       │
└──────────────────────────────────────────────────────────┘
```

## Security

DevParcel is designed with security as a first-class concern:

- **Sensitive File Exclusions** — `.env`, `.pem`, `.key`, `.p12`, `.pfx` detected and flagged before packaging
- **Secure Random Share Tokens** — 22-character `crypto.randomBytes` tokens (not UUIDs)
- **Server-Side Expiry Enforcement** — Shares expire on the server, not the client
- **Private Cloud Storage** — All uploads stored in a private Supabase Storage bucket
- **Short-Lived Signed URLs** — Download URLs valid for 5 minutes only
- **Argon2id Password Hashing** — Industry-standard password hashing with zero plaintext storage
- **HMAC Access Tickets** — Tamper-proof, time-limited download authorization
- **Brute-Force Protection** — Token-keyed lockout + IP-based rate limiting
- **Rate Limiting** — Per-endpoint rate limiting for all API routes
- **Sender Authorization** — Share revocation restricted to the original sender
- **Security Headers** — Helmet with CSP, HSTS, and CORP
- **Safe Error Handling** — No credentials, database URIs, or stack traces in error responses
- **Zip Slip Prevention** — Archive path sanitization against directory traversal

For vulnerability reporting, see [SECURITY.md](SECURITY.md).

## Repository Structure

```
DevParcel/
├── extension/          VS Code extension (TypeScript)
│   ├── src/
│   │   ├── commands/       Command registrations
│   │   ├── config/         Extension configuration
│   │   ├── scanner/        Workspace file scanner & exclusion engine
│   │   ├── security/       Sensitive file detection
│   │   ├── services/       Sender identity service
│   │   ├── sharing/        OS sharing providers & backend client
│   │   ├── summary/        Project summary builder
│   │   ├── test/           Extension test suite
│   │   ├── ui/             Webview UI provider
│   │   ├── workspace/      Workspace detection
│   │   └── zip/            ZIP engine (archiver)
│   └── resources/          Extension icon
├── backend/            Backend API (Node.js/Express/TypeScript)
│   └── src/
│       ├── config/         Environment & database configuration
│       ├── controllers/    Request handlers
│       ├── db/             Database migrations
│       ├── middleware/      Rate limiting, error handling
│       ├── models/         Data models
│       ├── repositories/   Database access layer
│       ├── routes/         API route definitions
│       ├── scripts/        Maintenance scripts
│       ├── services/       Business logic & storage
│       ├── test/           Backend test suite
│       └── utils/          Utilities (tokens, formatters, HMAC)
├── web/                Recipient web app (React/Vite/TypeScript)
│   ├── src/
│   │   ├── components/     UI components
│   │   ├── config/         Site configuration
│   │   ├── hooks/          React hooks
│   │   ├── pages/          Page components
│   │   ├── services/       API client
│   │   ├── styles/         CSS design system
│   │   ├── types/          TypeScript types
│   │   └── utils/          Utility functions
│   └── test/               Web app test suite
├── LICENSE             Proprietary license
├── SECURITY.md         Security reporting policy
└── THIRD_PARTY_NOTICES.md  Third-party dependency licenses
```

## Development Setup

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **VS Code** >= 1.85.0
- **PostgreSQL** (Supabase or local)
- **Supabase Storage** (S3-compatible) or compatible object storage

### 1. Clone the Repository

```bash
git clone https://github.com/mohdarman09/DevParcel.git
cd DevParcel
```

### 2. Install Dependencies

```bash
# Backend
cd backend && npm install

# Extension
cd ../extension && npm install

# Web App
cd ../web && npm install
```

### 3. Configure Environment Variables

```bash
# Backend: Copy and fill in your credentials
cp backend/.env.example backend/.env

# Web: Copy and configure API URL
cp web/.env.example web/.env
```

Edit each `.env` file with your actual configuration values. **Never commit `.env` files.**

### 4. Run Database Migrations

```bash
cd backend
npm run db:migrate
```

### 5. Start the Backend

```bash
cd backend
npm run dev
```

The backend runs on `http://localhost:3000` by default.

### 6. Start the Web App

```bash
cd web
npm run dev
```

The web app runs on `http://localhost:5173` by default.

### 7. Launch the Extension

1. Open the `DevParcel/` folder in VS Code.
2. Press `F5` to launch the Extension Development Host.
3. The DevParcel sidebar will appear in the activity bar.

## Health Monitoring & Uptime

The backend exposes dedicated health monitoring endpoints designed for external uptime services:

- **`GET /health`** — Lightweight liveness probe. Returns HTTP 200 with dynamic uptime, service name, version, and timestamp. Does not touch the database, storage, or secrets.
- **`GET /health/ready`** — Operational readiness probe. Returns HTTP 200 when startup configuration is valid and database is operational, or HTTP 503 if degraded.

### External Monitoring Guidelines

- External uptime monitoring services (e.g. UptimeRobot, BetterUptime, Pingdom) should call `GET https://<backend-domain>/health`.
- Monitoring polling frequency is configurable externally (e.g. 15s, 30s, 60s). A dedicated rate limiter allows up to 300 requests per 15 minutes.
- **Hosting Provider Behavior Note**: Periodic health checks allow external uptime monitoring, but whether periodic requests prevent a hosting provider from sleeping, idling, suspending, or scaling down a container depends entirely on the hosting provider's infrastructure and inactivity policies. A 15-second health check does **not** guarantee that a free-tier or serverless hosting provider will keep a service continuously running.

### Running Tests

```bash
# Backend
cd backend && npm run build && npm test

# Extension
cd extension && npm test

# Web
cd web && npm test
```

## License

**DevParcel is proprietary software. All rights reserved.**

Copyright (c) 2026 Mohd Arman

Viewing or accessing this repository does not grant permission to copy,
modify, distribute, or commercialize the software.

Third-party dependencies retain their respective licenses.
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for details.

## Security

For reporting vulnerabilities, see [SECURITY.md](SECURITY.md).
