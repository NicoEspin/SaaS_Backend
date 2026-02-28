# Employees Module (User + Membership)

Employees are represented by two existing core models:

- `User`: global identity (email is unique across the whole database)
- `Membership`: links a `User` to a `Tenant` and stores their role + active branch

All endpoints:

- Require authentication via JWT.
- Authorization (RBAC): only memberships with role `OWNER` or `ADMIN`.
- Multi-tenancy: all operations are scoped to the authenticated user's `tenantId`.

Base path:

- /api/v1/employees

## Data model

- `User`: `{ id, email, fullName, passwordHash, createdAt, updatedAt }`
- `Membership`: `{ id, tenantId, userId, role, activeBranchId, createdAt }`
- Active branch:
  - `Membership.activeBranchId` -> FK to `branches(id)` (nullable)

Notes:

- Email uniqueness is global (`users.email` is `@unique`).
- This API rejects employee creation if the email already exists as a `User`.

## Create employee

- POST /api/v1/employees

Body:

```json
{
  "fullName": "Juan Perez",
  "email": "juan@acme.com",
  "password": "password123",
  "role": "CASHIER",
  "branchId": "01J1QZQ0VQ8J7TQH0YV3A1BCDE"
}
```

Validation rules:

- `fullName`: string, 1-200 chars
- `email`: valid email, max 320 chars
- `password`: string, min 8 chars, max 200 chars
- `role`: `MembershipRole` enum
- `branchId`: 26 chars, must exist in the same tenant

Authorization rules:

- `ADMIN` cannot assign `role=OWNER`.

Errors:

- 400 Bad Request: invalid `branchId`
- 403 Forbidden: insufficient role or invalid role assignment
- 409 Conflict: email already registered

Response (201):

```json
{
  "membership": {
    "id": "01J...",
    "role": "CASHIER",
    "createdAt": "2026-02-28T00:00:00.000Z"
  },
  "user": {
    "id": "01J...",
    "email": "juan@acme.com",
    "fullName": "Juan Perez",
    "createdAt": "2026-02-28T00:00:00.000Z"
  },
  "activeBranch": {
    "id": "01J...",
    "name": "Sucursal principal"
  }
}
```

## List employees (cursor pagination)

- GET /api/v1/employees?limit=100&cursor=<membershipId>&q=juan&role=CASHIER&branchId=<branchId>

Query params:

- `limit`: 1-200 (default 100)
- `cursor`: membership id (26 chars). Uses `id < cursor`.
- `q`: case-insensitive substring match on `users.email` OR `users.full_name`
- `role`: filter by `MembershipRole`
- `branchId`: filter by `memberships.active_branch_id`

Response:

```json
{
  "items": [
    {
      "membership": {
        "id": "01J...",
        "role": "CASHIER",
        "createdAt": "2026-02-28T00:00:00.000Z"
      },
      "user": {
        "id": "01J...",
        "email": "juan@acme.com",
        "fullName": "Juan Perez",
        "createdAt": "2026-02-28T00:00:00.000Z"
      },
      "activeBranch": { "id": "01J...", "name": "Sucursal principal" }
    }
  ],
  "nextCursor": "01J..."
}
```

## Get employee

- GET /api/v1/employees/:id

Where `:id` is the membership id.

Errors:

- 404 Not Found: membership does not exist in tenant

## Update employee

- PATCH /api/v1/employees/:id

Body (partial):

```json
{
  "fullName": "Juan Perez",
  "role": "MANAGER",
  "branchId": "01J1QZQ0VQ8J7TQH0YV3A1BCDE"
}
```

Behavior:

- `fullName` updates the linked `User.fullName`.
- `role` updates `Membership.role`.
- `branchId` moves the employee by setting `Membership.activeBranchId`.

Authorization rules:

- `ADMIN` cannot promote to `OWNER`.
- Only `OWNER` can modify an existing `OWNER` membership.

Errors:

- 400 Bad Request: no fields to update, or invalid `branchId`
- 403 Forbidden: role restrictions
- 404 Not Found: employee not found in tenant
