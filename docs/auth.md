# Auth

Auth is JWT-based with refresh tokens persisted in DB.

- Access token can be provided via:
  - `Authorization: Bearer <token>`
  - `accessToken` cookie
- Refresh token is only accepted via cookie.

For cookie + CORS settings when deploying with `app.<domain>` / `api.<domain>`,
see `docs/production-auth-cookies.md`.

Base path:

- /api/v1/auth

## Login

- POST /api/v1/auth/login
- Response: 204 No Content

Body:

```json
{
  "tenantSlug": "acme",
  "email": "admin@acme.com",
  "password": "password123"
}
```

Behavior:

- Sets cookies:
  - `accessToken` (HttpOnly)
  - `refreshToken` (HttpOnly)

## Session

- GET /api/v1/auth/session

Returns the current session for the authenticated user.

## Refresh

- POST /api/v1/auth/refresh
- Response: 204 No Content

Behavior:

- Reads `refreshToken` cookie.
- Rotates refresh token and sets new `accessToken` + `refreshToken` cookies.

## Logout

- POST /api/v1/auth/logout
- Response: 204 No Content

Behavior:

- Revokes refresh token (if present).
- Clears auth cookies.
