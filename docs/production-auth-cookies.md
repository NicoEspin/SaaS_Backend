# Production Auth Cookies (Same-site Subdomains)

This project uses HttpOnly cookies for auth:

- `accessToken` (short-lived)
- `refreshToken` (long-lived, rotated)

In development (`localhost`), cookies are shared across ports automatically.
In production, if you deploy with subdomains (recommended) like:

- Frontend: `https://app.example.com`
- Backend API: `https://api.example.com`

you must configure cookie + CORS settings so that:

- The browser stores the cookies from `api.example.com`.
- The browser sends the cookies to BOTH subdomains when needed.
- Next.js middleware/pages on `app.example.com` can see the cookies.

## Required backend settings

## Local testing with subdomains (optional)

If you want to test the production-like setup locally (subdomains + shared
cookies), do not use `localhost` for `COOKIE_DOMAIN`.

Instead, use a loopback domain that supports subdomains, for example:

- Frontend: `http://app.lvh.me:3000`
- Backend: `http://api.lvh.me:3001`
- Backend env: `COOKIE_DOMAIN=lvh.me`

`lvh.me` resolves to `127.0.0.1` and is convenient for cookie domain testing.

### 1) Cookie Path

The `refreshToken` cookie must use `Path=/`.

Why: the browser only sends cookies when the request URL matches the cookie `Path`.
If `refreshToken` is set with `Path=/api/v1/auth`, it will NOT be sent to
`/dashboard/...` page requests on the frontend, and a Next.js middleware that
checks cookies will redirect to `/login` after `accessToken` expires.

Implementation: `src/common/auth/auth.cookies.ts`.

### 2) Cookie Domain

Set `COOKIE_DOMAIN` so cookies are shared across subdomains.

- Recommended: `COOKIE_DOMAIN=example.com` (or `.example.com`)
- Result: cookies set by `api.example.com` are also sent to `app.example.com`

Notes:

- Do NOT set `COOKIE_DOMAIN` in localhost development. Many browsers reject
  `Domain=localhost`, and you do not need it.

### 3) Cookie Secure

In production, you must serve HTTPS and set:

- `COOKIE_SECURE=true`

Otherwise, cookies may be rejected or downgraded.

### 4) Cookie SameSite

For same-site subdomains (app + api under the same registrable domain), use:

- `COOKIE_SAMESITE=lax`

`SameSite=None` is only needed when frontend and backend are truly cross-site
(different registrable domains), and it requires `Secure`.

## CORS (backend)

Because the frontend will call the API with cookies, CORS must allow
credentials and must NOT use a wildcard origin.

Set:

- `CORS_ORIGINS=https://app.example.com`

and ensure CORS is configured with:

- `credentials: true`
- `origin: <explicit allowlist>`

Implementation: `src/main.ts`.

## Frontend requirements

- API calls must send credentials:
  - `fetch(..., { credentials: 'include' })`
  - or axios: `withCredentials: true`

- If you protect pages via Next.js middleware by checking cookies, that
  middleware only sees cookies that are sent to `app.example.com`. This is why
  `COOKIE_DOMAIN` + `Path=/` matters.

## Suggested production env example

Backend (`api.example.com`):

```
NODE_ENV=production

# CORS
CORS_ORIGINS=https://app.example.com

# Cookies (share across subdomains)
COOKIE_DOMAIN=example.com
COOKIE_SECURE=true
COOKIE_SAMESITE=lax

# Cookie names (optional)
COOKIE_ACCESS_NAME=accessToken
COOKIE_REFRESH_NAME=refreshToken
```

Frontend (`app.example.com`):

- Call the API at `https://api.example.com`.
- Ensure your HTTP client includes credentials.

## Troubleshooting checklist

- Cookies appear under the correct domain in DevTools (Application -> Cookies).
- Refresh cookie has:
  - `HttpOnly`
  - `Secure` (prod)
  - `SameSite=Lax`
  - `Domain=example.com` (prod)
  - `Path=/`
- Requests from `app.example.com` to `api.example.com` include cookies.
- Backend responses include `Access-Control-Allow-Credentials: true` and an
  explicit `Access-Control-Allow-Origin: https://app.example.com`.
