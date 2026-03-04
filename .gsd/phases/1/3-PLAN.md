---
phase: 1
plan: 3
wave: 2
---

# Plan 1.3: Auth & RBAC Middleware

## Objective
Implement basic Authentication and Role-Based Access Control (RBAC) middleware for the Express server to secure the ERP APIs.

## Context
- .gsd/SPEC.md
- src/server.js
- src/db/schema.js

## Tasks

<task type="auto">
  <name>Implement Auth and RBAC Middleware</name>
  <files>
    - src/middleware/auth.js
  </files>
  <action>
    - Create a minimal JWT-based (or simple token-based) authentication middleware in `src/middleware/auth.js`.
    - Create an RBAC authorization middleware constructor `requireRole(roleArray)` that validates if the `req.user.role` matches the allowed roles.
    - Since this is a testbed (happy path), use a simplified hardcoded secret for JWT signing/verification (`jsonwebtoken` package).
  </action>
  <verify>node -e "const { requireRole } = require('./src/middleware/auth.js'); console.log(typeof requireRole)"</verify>
  <done>Middleware functions are successfully exported and parseable by Node.js.</done>
</task>

<task type="auto">
  <name>Create Basic Auth Routes</name>
  <files>
    - src/routes/auth.js
    - src/server.js
  </files>
  <action>
    - Implement an `auth` router with `/login` and `/register` endpoints.
    - `/register` should insert a new user with a specified role (Admin, HR, Employee) and hash the password using `bcrypt`.
    - `/login` should verify the password and return a JWT.
    - Mount this router on `/api/auth` in `src/server.js`.
  </action>
  <verify>node src/server.js</verify>
  <done>The `/api/auth/register` and `/api/auth/login` endpoints exist and are mounted.</done>
</task>

## Success Criteria
- [ ] JWT and bcrypt dependencies are installed.
- [ ] `src/middleware/auth.js` provides token verification and role checking.
- [ ] `src/routes/auth.js` provides functional registration and login.
