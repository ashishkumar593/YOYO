# Phase 04: Authentication & User Management

## 1. Objective
Build an enterprise-grade authentication and user authorization system in NestJS featuring email/password credentials, bcrypt hashing, short-lived JWT access tokens, rotating refresh tokens stored in secure HttpOnly cookies, session revocation, and Role-Based Access Control (`SUPER_ADMIN` vs `USER`).

---

## 2. Deliverables Checklist
- [ ] Core Authentication Module (`apps/api/src/modules/auth/`):
  - `POST /api/auth/register`: User registration with validation and default quota initialization.
  - `POST /api/auth/login`: Credential verification, session creation, issue JWT & set HttpOnly refresh cookie.
  - `POST /api/auth/refresh`: Refresh token rotation with replay detection.
  - `POST /api/auth/logout`: Revoke active session and clear cookies.
  - `GET /api/auth/me`: Retrieve current user profile and role.
- [ ] Security Guards & Decorators:
  - `JwtAuthGuard`: Protects private REST endpoints.
  - `RolesGuard` & `@Roles('SUPER_ADMIN')`: Restricts administrative routes.
  - `@CurrentUser()`: Custom parameter decorator injecting decoded user identity.
- [ ] User Profile & Quotas (`apps/api/src/modules/users/`):
  - Profile update and password reset flows.
  - Automatic quota allocation (default 5M tokens / month).

---

## 3. Token Architecture
- **Access Token**:
  - Format: RS256 or HS256 signed JWT.
  - Expiration: 15 minutes.
  - Payload: `{ sub: user.id, email: user.email, role: user.role }`.
- **Refresh Token**:
  - Storage: Stored only in `httpOnly; Secure; SameSite=Strict` cookie.
  - Database: SHA-256 hash stored in `sessions` table.
  - Rotation: Each `/api/auth/refresh` call deletes the old session and issues a fresh token family member.

---

## 4. Acceptance Criteria
1. User registration creates records in `users`, `user_profiles`, and `user_quotas`.
2. Logging in returns access token in response body and sets secure cookie.
3. Refreshing with an already used or invalidated token revokes the entire token family.
4. Non-admin users attempting to access `@Roles('SUPER_ADMIN')` routes receive HTTP 403 Forbidden.

