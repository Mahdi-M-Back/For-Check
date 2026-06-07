# For-Check — Production-Grade Node.js Backend

> A fully-featured backend project built to demonstrate real-world engineering practices across authentication, authorization, database design, security, testing, and deployment.

---

## Why This Project Exists

My production work is under NDA and cannot be shared publicly. This project was built to give you a full picture of how I design and ship backend systems — using the same patterns, tools, and standards I've applied in real production environments.

Everything here is intentional. Nothing is a tutorial copy-paste.

---

## What's Inside

### Authentication & Authorization
- JWT access tokens + refresh token rotation
- Google OAuth 2.0 (social login)
- Email verification on registration
- Secure password reset flow (token-based, time-limited)
- Role-Based Access Control (RBAC) with reusable middleware
- Secure cookie handling

### API Design
- RESTful architecture with consistent response structure
- Centralized error handling middleware
- Request validation pipeline
- Pagination on all list endpoints

### Database Layer (MongoDB / Mongoose)
- Normalized schema design with relationships
- Strategic indexing for query performance
- Aggregation pipelines for complex data operations
- Virtual population for efficient document joins

### Security
- Helmet (HTTP security headers)
- XSS Protection
- Mongo Sanitize (NoSQL injection prevention)
- Rate limiting on auth and sensitive routes
- Input validation on all endpoints

### DevOps & Deployment
- Dockerized with Docker Compose
- Nginx as reverse proxy
- PM2 process manager
- Deployable on any Ubuntu Linux server

### Testing & Documentation
- Integration tests with Jest & Supertest
- Full Swagger / OpenAPI documentation (available at /api-docs)
- Morgan request logging

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT, Google OAuth 2.0 |
| Testing | Jest, Supertest |
| Docs | Swagger (OpenAPI YAML) |
| DevOps | Docker, Nginx, PM2, Linux |
| Security | Helmet, Rate Limiting, XSS, Mongo Sanitize |

---

## Project Status

> Actively in development. Core systems are complete. Final modules being added.

| Module | Status |
|---|---|
| JWT Auth + Refresh Tokens | ✅ Done |
| Google OAuth 2.0 
| Email Verification & Password Reset
| RBAC Middleware | ✅ Done |
| MongoDB Schema & Indexing 
| Aggregation Pipelines 
| Security Middleware Stack | ✅ Done |
| Rate Limiting | ✅ Done |
| Docker + Nginx Deployment | ✅ Done |
| Jest & Supertest Tests 
| Swagger Documentation 

---

## Getting Started

# Clone the repository
git clone https://github.com/Mahdi-M-Back/for-check.git
cd for-check

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your values in .env

# Run in development
npm run dev

# Run with Docker
docker-compose up --build
---

## Environment Variables

NODE_ENV=development
PORT=3000

DATABASE_LOCAL=mongodb://localhost:27017/Test

JWT_ACCESS_SECRET=kl;jgespoi9*!@$&^%&$jkdhfdfjghk;dfkjhjfsdafjkl!
JWT_REFRESH_SECRET=oui$%^&reyft$%^&g@$Zew3$%^&@!pru%$$%^&@jkdhfdfjghk;dfkjhjfgsdg%$%^&$%^&53$%^&3u$%^&k$%^&hgjrrk89075fgtd
JWT_ACCESS_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

## API Documentation

Once the server is running, visit:

http://localhost:{PORT}/api-docs
Full Swagger UI with all endpoints, request bodies, and response schemas.

---

## Contact

If you're a recruiter or developer and want to discuss this project or my work:

- Email: mahdim.back@gmail.com
- LinkedIn: [Mahdi-Moshtaghi](https://linkedin.com/in/Mahdi-Moshtaghi)

---

*Built by Mahdi Moshtaghi — Node.js Backend Developer*