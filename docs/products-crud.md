# Products CRUD

All endpoints require a valid `Authorization: Bearer <token>`.
All operations are scoped to the authenticated user's `tenantId`.

Base path:

- /api/v1/products

## Create product

- POST /api/v1/products

Body:

```json
{
  "code": "SKU-001",
  "name": "Laptop",
  "description": "Optional",
  "isActive": true
}
```

Errors:

- 409 Conflict: product code already exists (within the same tenant)

## List products (cursor pagination)

- GET /api/v1/products?limit=50&cursor=<productId>&isActive=true

Response:

```json
{
  "items": [
    {
      "id": "01J...",
      "code": "SKU-001",
      "name": "Laptop",
      "description": null,
      "isActive": true,
      "createdAt": "2026-02-17T00:00:00.000Z",
      "updatedAt": "2026-02-17T00:00:00.000Z"
    }
  ],
  "nextCursor": "01J..."
}
```

## Get product

- GET /api/v1/products/:id

## Update product

- PATCH /api/v1/products/:id

Body (partial):

```json
{
  "name": "New name",
  "isActive": false
}
```

## Delete product

- DELETE /api/v1/products/:id
