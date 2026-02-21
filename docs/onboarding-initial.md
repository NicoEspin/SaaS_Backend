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
  "admin": {
    "email": "admin@acme.com",
    "password": "password123"
  }
}
```

Validation rules:

- tenant.name: string, 1-200 chars
- tenant.slug: string, 1-64 chars, letters/numbers/hyphens (stored lowercased)
- admin.email: email, max 320 chars (stored lowercased)
- admin.password: string, 8-200 chars

## Response (200)

```json
{
  "tenant": {
    "id": "01J...",
    "slug": "acme",
    "name": "Acme Inc"
  },
  "user": {
    "id": "01J...",
    "email": "admin@acme.com"
  },
  "membership": {
    "id": "01J...",
    "role": "OWNER"
  },
  "accessToken": "<jwt>",
  "refreshToken": "<refresh>"
}
```

## Errors

- 400 Bad Request: validation error (invalid payload)
- 409 Conflict: tenant slug already exists
- 409 Conflict: email already registered
