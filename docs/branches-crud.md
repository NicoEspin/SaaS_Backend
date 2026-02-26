# Branches Module (CRUD + Active Branch)

All endpoints require authentication via JWT.

- Supported auth mechanisms:
  - `Authorization: Bearer <token>`
  - Access token cookie (same JWT as above)
- Authorization (RBAC): only memberships with role `OWNER` or `ADMIN`.
- Multi-tenancy: all operations are scoped to the authenticated user's `tenantId`.

Base path:

- /api/v1/branches

## Data model

Branches are tenant-owned records:

- `Branch`: `{ id, tenantId, name, createdAt, updatedAt }`

Active branch is stored per membership:

- `Membership.activeBranchId` (nullable) -> FK to `branches(id)`

This value is used by `GET /api/v1/auth/session` to return `activeBranch`.

Migration:

- `prisma/migrations/20260226153000_membership_active_branch/migration.sql`

## Create branch

- POST /api/v1/branches

Body:

```json
{
  "name": "Sucursal principal"
}
```

Validation rules:

- name: string, 1-200 chars

Response (200):

```json
{
  "id": "01J...",
  "name": "Sucursal principal",
  "createdAt": "2026-02-26T00:00:00.000Z",
  "updatedAt": "2026-02-26T00:00:00.000Z"
}
```

## List branches (cursor pagination)

- GET /api/v1/branches?limit=100&cursor=<branchId>&q=centro

Query params:

- `limit`: 1-200 (default 100)
- `cursor`: a branch id (26 chars). Uses `id < cursor`.
- `q`: case-insensitive substring match on `name`

Response:

```json
{
  "items": [
    {
      "id": "01J...",
      "name": "Centro",
      "createdAt": "2026-02-26T00:00:00.000Z",
      "updatedAt": "2026-02-26T00:00:00.000Z"
    }
  ],
  "nextCursor": "01J..."
}
```

## Get branch

- GET /api/v1/branches/:id

Errors:

- 404 Not Found: branch does not exist in tenant

## Update branch

- PATCH /api/v1/branches/:id

Body (partial):

```json
{
  "name": "Centro (nuevo)"
}
```

Errors:

- 400 Bad Request: no fields to update
- 404 Not Found: branch does not exist in tenant

## Delete branch

- DELETE /api/v1/branches/:id

Deletion is intentionally blocked if the branch has related records.

Blocked when there is at least one related row in any of:

- `branch_inventories`
- `orders`
- `invoices`
- `payments`
- `stock_movements`

Errors:

- 404 Not Found: branch does not exist in tenant
- 409 Conflict: cannot delete branch with related records

## Set active branch

Sets the authenticated membership's active branch (persisted in DB).

- POST /api/v1/branches/active
- Response: 204 No Content

Body:

```json
{
  "branchId": "01J..."
}
```

Errors:

- 400 Bad Request: invalid `branchId` (does not exist in tenant)
- 403 Forbidden: role is not `OWNER`/`ADMIN`

## Integration: auth/session

`GET /api/v1/auth/session` returns:

- `branches`: all branches in the tenant (ordered by `createdAt asc`)
- `activeBranch`:
  - If `membership.activeBranchId` matches one of `branches`, that branch
  - Otherwise, fallback to the first branch in `branches` (or `null` if none)

Example response:

```json
{
  "tenant": { "id": "t1", "slug": "acme", "name": "Acme Inc" },
  "user": { "id": "u1", "email": "admin@acme.com", "fullName": "Admin Acme" },
  "membership": { "id": "m1", "role": "ADMIN" },
  "branches": [
    { "id": "b1", "name": "Sucursal principal" },
    { "id": "b2", "name": "Centro" }
  ],
  "activeBranch": { "id": "b2", "name": "Centro" }
}
```
