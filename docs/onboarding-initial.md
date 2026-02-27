# Initial Onboarding (Tenant + Admin)

Creates a new tenant and the first administrator user for that tenant.

Endpoint:

- Method: POST
- Path: /api/v1/onboarding/initial
- Auth: none (public)

## Request

Body:

```json
{
  "tenant": {
    "name": "Acme Inc",
    "slug": "acme"
  },
  "branch": {
    "name": "Sucursal 1"
  },
  "admin": {
    "fullName": "Admin Acme",
    "email": "admin@acme.com",
    "password": "password123"
  }
}
```

Validation rules:

- tenant.name: string, 1-200 chars
- tenant.slug: string, 1-64 chars, letters/numbers/hyphens (stored lowercased)
- branch.name: optional string, 1-200 chars
- admin.fullName: string, 1-200 chars
- admin.email: email, max 320 chars (stored lowercased)
- admin.password: string, 8-200 chars

## Response (200)

This endpoint sets auth cookies and returns the created tenant/user/membership.

- Cookies: `Set-Cookie: accessToken=...; HttpOnly` and `Set-Cookie: refreshToken=...; HttpOnly`

```json
{
  "tenant": {
    "id": "01J...",
    "slug": "acme",
    "name": "Acme Inc"
  },
  "user": {
    "id": "01J...",
    "email": "admin@acme.com",
    "fullName": "Admin Acme"
  },
  "membership": {
    "id": "01J...",
    "role": "OWNER"
  }
}
```

## Errors

- 400 Bad Request: validation error (invalid payload)
- 409 Conflict: tenant slug already exists
- 409 Conflict: email already registered
