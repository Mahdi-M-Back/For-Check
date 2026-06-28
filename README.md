# ⚡ BookStore REST API

<!-- ![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg) -->
![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

A production-grade RESTful API for a book marketplace — built with Node.js, Express, MongoDB, and Redis. Features a complete dual-token authentication system, role-based access control, soft-delete data layer, structured logging, and full Docker support.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Docker](#docker)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [CI/CD](#cicd)

---

## Features

- **Dual-token JWT auth** — short-lived access tokens (15 min) paired with long-lived refresh tokens (7 days) stored in httpOnly cookies. Every refresh token carries a `jti` claim stored in Redis, enabling per-session revocation on logout and full revocation on password change.
- **Role-based access control** — three roles (`user`, `admin`, `owner`) enforced at the middleware layer.
- **Soft delete** — no document is ever destroyed. Every collection inherits an `isDeleted` / `deletedDate` pattern from a shared abstract schema. Mongoose query middleware filters deleted documents automatically.
- **Repository pattern** — controllers never import Mongoose models directly. All database operations are encapsulated in per-module repositories that extend a typed `BaseRepository`.
- **Redis caching** — the `protect` middleware caches authenticated users in Redis (TTL = access token lifetime), reducing MongoDB reads on every protected request.
- **Structured JSON logging** — Pino replaces `console.log`. Every log entry is a parseable JSON object. Sensitive fields (`password`, `authorization`) are redacted automatically.
- **Consistent API responses** — every response — success and error — shares the same shape: `{ success, enMessage, data }`. Clients have one parsing path regardless of outcome.
- **Input validation** — a `validateBody` factory produces Express middleware from declarative schemas, eliminating repeated if/else chains across controllers.
- **Rate limiting** — global limiter on all `/api` routes, with stricter limits on auth endpoints.
- **Automated tests** — supertest integration tests cover auth enforcement, CRUD, validation, role checks, and business rules across all five modules.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Framework | Express 5 |
| Database | MongoDB 7 + Mongoose |
| Cache / Token Store | Redis 7 |
| Auth | JSON Web Tokens (jsonwebtoken) |
| Password Hashing | bcryptjs |
| Logging | Pino + pino-http |
| Email | Nodemailer (SMTP — Mailtrap dev / any provider prod) |
| Validation | Custom Validator class + validateBody factory |
| Docs | Swagger / OpenAPI 3 |
| Testing | Jest + Supertest |
| Containers | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## Architecture

### Module-based feature organization

The `src/modules/` directory groups every concern for a domain in one place:

```
modules/book/
├── controller/   — HTTP handlers (read req, call repo, send response)
├── middleware/   — validation (validateBody) and any route-level guards
├── model/        — Mongoose schema
├── repository/   — all database queries (extends BaseRepository)
└── router/       — Express router: mounts middleware → controller
```

Adding a new domain means adding a new folder — nothing in the existing codebase changes.

### Repository pattern

Controllers delegate every database operation to a typed repository:

```
Controller  →  Repository  →  Mongoose Model  →  MongoDB
```

No controller imports a Mongoose model. This means controllers are testable in isolation and database logic has exactly one place to live.

### Dual-token auth strategy

```
Login
  │
  ├─ Access token  (JWT, 15 min, returned in response body)
  │    └─ Sent as Authorization: Bearer <token> on every request
  │
  └─ Refresh token (JWT, 7 days, httpOnly cookie, contains jti)
       └─ jti stored in Redis   ←  revocable

Logout  → DELETE jti from Redis  →  stolen token rejected on next use
Password change  → DELETE all jtis for user  →  all sessions invalidated
```

Short-lived access tokens limit the damage of token theft. The Redis revocation list ensures logout and password changes take effect immediately rather than waiting for token expiry.

### Soft delete

The `abstractSchema` factory applies a Mongoose pre-hook to every `find` and `findOne` query that automatically appends `{ isDeleted: { $ne: true } }`. Controllers call `repository.softDelete(id)` and the document is hidden from all subsequent queries without being destroyed.

---

## Getting Started

### Prerequisites

- Node.js ≥ 22
- MongoDB 7
- Redis 7
- npm

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example config/.env
# Edit config/.env and fill in the required values (see Environment Variables)

# 4. Start the development server (with hot reload)
npm run dev

# The API will be running at http://localhost:3000
# Swagger docs will be available at http://localhost:3000/api-docs
```

### Docker

Docker Compose starts the API, MongoDB, and Redis together. No local MongoDB or Redis installation needed.

```bash
# 1. Create a root-level .env for Docker (Docker reads from the project root)
cp .env.example .env
# Edit .env and fill in the required values

# 2. Build and start all services
docker compose up --build

# 3. Run in the background
docker compose up -d

# 4. Stop everything (data is preserved in named volumes)
docker compose down

# 5. Stop and wipe all data
docker compose down -v
```

The API will be available at `http://localhost:3000`.

> **Note:** Docker uses environment variables injected at runtime via `env_file` — secrets are never baked into the image.

---

## Environment Variables

Create `config/.env` (local) or `.env` (Docker) from `.env.example`.

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | ✅ | `development` / `production` |
| `PORT` | ✅ | HTTP port (default: `3000`) |
| `DATABASE` | ✅ (prod) | MongoDB Atlas connection string (use `<PASSWORD>` placeholder) |
| `DATABASE_PASSWORD` | ✅ (prod) | Replaces `<PASSWORD>` in the Atlas string |
| `DATABASE_LOCAL` | ✅ (dev) | Local MongoDB URI e.g. `mongodb://localhost:27017/bookstore` |
| `JWT_ACCESS_SECRET` | ✅ | Secret for signing access tokens (≥ 32 chars) |
| `JWT_ACCESS_EXPIRES_IN` | ✅ | Access token lifetime e.g. `15m` |
| `JWT_REFRESH_SECRET` | ✅ | Secret for signing refresh tokens (different from access) |
| `JWT_REFRESH_EXPIRES_IN` | ✅ | Refresh token lifetime e.g. `7d` |
| `REDIS_URL` | ✅ | Redis connection URL e.g. `redis://localhost:6379` |
| `EMAIL_HOST` | ✅ | SMTP host e.g. `smtp.mailtrap.io` |
| `EMAIL_PORT` | ✅ | SMTP port e.g. `587` |
| `EMAIL_SECURE` | ✅ | `true` for port 465, `false` for 587 |
| `EMAIL_USERNAME` | ✅ | SMTP username |
| `EMAIL_PASSWORD` | ✅ | SMTP password |
| `EMAIL_FROM` | ✅ | Sender address e.g. `noreply@yourapp.com` |
| `EMAIL_FROM_NAME` | | Display name for sender (default: `App`) |
| `FRONTEND_URL` | ✅ | CORS allowed origin e.g. `http://localhost:5173` |
| `ALLOWED_ORIGINS` | | Comma-separated list for multiple origins |
| `LOG_LEVEL` | | Pino log level (default: `info`) |
| `BCRYPT_SALT_ROUNDS` | | bcrypt cost factor (default: `12`, use `1` in tests) |

---

## API Reference

Full interactive documentation is available at `/api-docs` (Swagger UI) when the server is running.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/users/signup` | — | Register a new user |
| `POST` | `/api/v1/users/login` | — | Login and receive tokens |
| `POST` | `/api/v1/users/logout` | — | Revoke current refresh token |
| `POST` | `/api/v1/users/refresh` | Cookie | Issue a new access token |
| `POST` | `/api/v1/users/forgotPassword` | — | Send password reset email |
| `PATCH` | `/api/v1/users/resetPassword/:token` | — | Reset password via email link |

### User Profile

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/users/me` | Bearer | Get own profile |
| `PATCH` | `/api/v1/users/updateMe` | Bearer | Update own name / username |
| `PATCH` | `/api/v1/users/updatePassword` | Bearer | Change password (requires current password) |
| `DELETE` | `/api/v1/users/deleteMe` | Bearer | Soft-delete own account |

### Admin — User Management

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/users` | Admin | List all users |
| `GET` | `/api/v1/users/:id` | Admin | Get user by id |
| `PATCH` | `/api/v1/users/:id` | Owner | Update user role or email |
| `DELETE` | `/api/v1/users/:id` | Admin | Soft-delete a user |

### Products

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/products` | — | List all products |
| `GET` | `/api/v1/products/:id` | — | Get product by id |
| `POST` | `/api/v1/products` | Admin / Owner | Create a product |
| `PATCH` | `/api/v1/products/:id` | Admin / Owner | Update a product |
| `DELETE` | `/api/v1/products/:id` | Admin / Owner | Soft-delete a product |

### Books

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/books` | Bearer | List all books |
| `GET` | `/api/v1/books/:id` | Bearer | Get book by id |
| `POST` | `/api/v1/books` | Bearer | Create a book (price inherited from product) |
| `PATCH` | `/api/v1/books/:id` | Bearer | Update a book |
| `DELETE` | `/api/v1/books/:id` | Bearer | Soft-delete a book |

### Reviews

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/reviews` | — | List all reviews |
| `GET` | `/api/v1/reviews/:id` | — | Get review by id |
| `POST` | `/api/v1/reviews` | Bearer | Create a review (one per product) |
| `PATCH` | `/api/v1/reviews/:id` | Admin / Owner | Update a review |
| `DELETE` | `/api/v1/reviews/:id` | Admin / Owner | Soft-delete a review |

### Response shape

Every response — success and error — uses the same envelope:

```json
{
  "success": true,
  "enMessage": "Product created successfully.",
  "data": { ... }
}
```

Error responses set `success: false` and `data: null`. HTTP status codes follow REST semantics: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `500`.

---

## Project Structure

```
.
├── .github/
│   └── workflows/
│       ├── ci.yml          — runs tests on every push and PR
│       └── docker.yml      — builds and pushes Docker image on merge to main
├── src/
│   ├── config/
│   │   └── redis.js        — Redis client (singleton, connect()ed in server.js)
│   ├── modules/
│   │   ├── book/
│   │   │   ├── controller/
│   │   │   ├── middleware/  — validateBody schemas
│   │   │   ├── model/
│   │   │   ├── repository/  — extends BaseRepository
│   │   │   └── router/
│   │   ├── product/         — same structure
│   │   ├── review/          — same structure
│   │   └── user/            — same structure
│   ├── repositories/
│   │   └── base.repository.js — findById, create, update, softDelete
│   ├── schema/
│   │   └── abstract.schema.js — isDeleted, deletedDate, pre-hooks
│   ├── test/
│   │   ├── setup.js         — DB helpers, user factory, token factory
│   │   ├── user.test.js
│   │   ├── product.test.js
│   │   ├── book.test.js
│   │   ├── review.test.js
│   │   └── admin.test.js
│   ├── utilities/
│   │   ├── appError.js      — operational error class
│   │   ├── auth.js          — signAccessToken, signRefreshToken, createSendToken
│   │   ├── cache.js         — Redis service (user cache + token revocation)
│   │   ├── catchAsync.js    — async error wrapper
│   │   ├── email.js         — Nodemailer singleton transport
│   │   ├── errorHandler.js  — global Express error handler
│   │   ├── filterObj.js     — whitelist body fields (mass-assignment protection)
│   │   ├── logger.js        — Pino structured logger
│   │   ├── Response.js      — sendResponse() envelope helper
│   │   ├── validateBody.js  — middleware factory with rule combinators
│   │   └── Validator.js     — primitive validation rules
│   ├── app.js               — Express setup, middleware stack, routes
│   └── server.js            — startup: connects Redis → MongoDB → listens
├── .dockerignore
├── .env.example
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## Testing

Tests use **Jest** and **Supertest** running against a real MongoDB test database. Redis is mocked at the module level — no Redis instance is needed to run tests.

```bash
# Run the full test suite
npm test

# Run a single test file
npx jest src/test/product.test.js

# Run with coverage report
npx jest --coverage
```

Tests run serially (`--runInBand`) so each file starts with an isolated database. Each test file:
- Mocks the Redis cache layer (`jest.mock`)
- Mocks the email transport (`jest.mock`)
- Connects to `DATABASE_LOCAL` in `beforeAll`
- Drops the test database in `afterAll`

Coverage targets: auth enforcement, happy-path CRUD, input validation, role-based access, business rules (duplicate reviews, rating sync, price inheritance).

---

## CI/CD

Two GitHub Actions workflows run automatically:

**`ci.yml`** — triggers on every push and pull request to `main`.
Spins up MongoDB and Redis as service containers, installs dependencies, and runs the full test suite. A green badge on every commit confirms nothing is broken.

**`docker.yml`** — triggers on every merge to `main` (after CI passes).
Builds the production Docker image and pushes it to GitHub Container Registry:

```bash
docker pull ghcr.io/YOUR_USERNAME/YOUR_REPO:latest
```

To add the CI status badge to this README, replace `YOUR_USERNAME` and `YOUR_REPO` in the badge URL at the top of this file.
