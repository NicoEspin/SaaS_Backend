# Categories CRUD

All endpoints require authentication via JWT.

- Supported auth mechanisms:
  - `Authorization: Bearer <token>`
  - Access token cookie (same JWT as above)
    All operations are scoped to the authenticated user's `tenantId`.

Base path:

- /api/v1/categories

## Create category

- POST /api/v1/categories

Body:

```json
{
  "name": "Ropa",
  "attributeDefinitions": [
    {
      "key": "talle",
      "label": "Talle",
      "type": "ENUM",
      "options": ["XS", "S", "M", "L", "XL"],
      "isRequired": false,
      "isVisibleInTable": true,
      "sortOrder": 0
    },
    {
      "key": "marca",
      "label": "Marca",
      "type": "TEXT"
    }
  ]
}
```

Notes:

- `attributeDefinitions` is optional.
- Attribute keys are normalized to lowercase.

## List categories (cursor pagination)

- GET /api/v1/categories?limit=100&cursor=<categoryId>&q=ropa

Response:

```json
{
  "items": [
    {
      "id": "01J...",
      "name": "Ropa",
      "createdAt": "2026-02-17T00:00:00.000Z",
      "updatedAt": "2026-02-17T00:00:00.000Z"
    }
  ],
  "nextCursor": "01J..."
}
```

## Get category (includes attribute definitions)

- GET /api/v1/categories/:id

## List category attribute definitions

- GET /api/v1/categories/:id/attribute-definitions

## Update category

- PATCH /api/v1/categories/:id

Body (partial):

```json
{
  "name": "Indumentaria"
}
```

## Delete category

- DELETE /api/v1/categories/:id

Notes:

- Deletion is blocked if the category has products assigned.
