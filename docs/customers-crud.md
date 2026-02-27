# Customers CRUD (soft delete)

All endpoints require authentication via JWT.

- Supported auth mechanisms:
  - `Authorization: Bearer <token>`
  - Access token cookie (`accessToken`)
- Multi-tenancy: all operations are scoped to the authenticated user's `tenantId`.

Base path:

- /api/v1/customers

## Data model

Customers are tenant-owned records:

- `Customer`: `{ id, tenantId, code?, type, taxId?, taxIdType?, vatCondition?, name, email?, phone?, address?, notes?, isActive, createdAt, updatedAt }`

Enums:

- `type`: `RETAIL | WHOLESALE`
- `taxIdType`: `CUIT | CUIL | DNI | PASSPORT | FOREIGN`
- `vatCondition`: `REGISTERED | MONOTAX | EXEMPT | FINAL_CONSUMER | FOREIGN`

Notes:

- `code` is optional. It is unique per tenant when present (`@@unique([tenantId, code])`).
- Deleting is a soft delete: customers are never removed from the database.

Migration:

- `prisma/migrations/20260227100000_add_customer_fields/migration.sql`

## Create customer

- POST /api/v1/customers

Body (minimal):

```json
{
  "name": "Juan Perez"
}
```

Body (with optional billing fields):

```json
{
  "code": "C001",
  "type": "RETAIL",
  "name": "Juan Perez",
  "taxId": "20123456789",
  "taxIdType": "CUIT",
  "vatCondition": "REGISTERED",
  "email": "juan@example.com",
  "phone": "+54 11 5555-5555",
  "address": "Av. Siempre Viva 742, CABA",
  "notes": "Prefers WhatsApp for contact.",
  "isActive": true
}
```

Validation rules (high level):

- `name`: required, string 1-200 chars
- Most other fields are optional; enums must match allowed values

Errors:

- 409 Conflict: customer code already exists (within the same tenant)

## List customers (cursor pagination)

- GET /api/v1/customers?limit=100&cursor=<customerId>

Query params:

- `limit`: 1-100 (default 100)
- `cursor`: a customer id (26 chars). Uses `id < cursor`.
- `isActive`: optional boolean filter
  - Alias supported: `IsActive`
- Filters (all optional, `contains`, case-insensitive): `q`, `name`, `code`, `taxId`, `email`, `phone`

Response:

```json
{
  "items": [
    {
      "id": "01J...",
      "code": "C001",
      "type": "RETAIL",
      "taxId": "20123456789",
      "taxIdType": "CUIT",
      "vatCondition": "REGISTERED",
      "name": "Juan Perez",
      "email": "juan@example.com",
      "phone": null,
      "address": null,
      "isActive": true,
      "createdAt": "2026-02-27T00:00:00.000Z",
      "updatedAt": "2026-02-27T00:00:00.000Z"
    }
  ],
  "nextCursor": "01J..."
}
```

## Get customer

- GET /api/v1/customers/:id

Errors:

- 404 Not Found: customer does not exist in tenant

## Update customer

- PATCH /api/v1/customers/:id

Body (partial):

```json
{
  "email": "new@example.com",
  "notes": "VIP"
}
```

Clearing fields:

- Send `null` for nullable optional fields (`code`, `taxId`, `taxIdType`, `vatCondition`, `email`, `phone`, `address`, `notes`).

Errors:

- 400 Bad Request: no fields to update
- 404 Not Found: customer does not exist in tenant
- 409 Conflict: customer code already exists

## Delete customer (soft delete)

- DELETE /api/v1/customers/:id

Behavior:

- Sets `isActive=false`.
- Returns `{ "deleted": true }`.

Errors:

- 404 Not Found: customer does not exist in tenant

## Integration: carts

Cart endpoints that accept `customerId` will reject inactive customers:

- A customer must have `isActive=true` to be assigned to a cart or on checkout.
