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
  "categoryId": "01J...",
  "description": "Optional",
  "attributes": {
    "color": "rojo",
    "talle": "M"
  },
  "isActive": true
}
```

Notes:

- `attributes` is a key/value object with custom values for the selected `categoryId`.
- Keys and value types are validated against product attribute definitions configured for that category.

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
      "attributes": {
        "color": "rojo"
      },
      "displayAttributes": [
        {
          "key": "color",
          "label": "Color",
          "value": "rojo"
        }
      ],
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

## Product attribute definitions

- POST /api/v1/products/attribute-definitions
- GET /api/v1/products/attribute-definitions?categoryId=<categoryId>
- PATCH /api/v1/products/attribute-definitions/:id
- DELETE /api/v1/products/attribute-definitions/:id

Create body example:

```json
{
  "categoryId": "01J...",
  "key": "color",
  "label": "Color",
  "type": "TEXT",
  "isRequired": false,
  "isVisibleInTable": true,
  "sortOrder": 0
}
```

For enum attributes, include `options`:

```json
{
  "categoryId": "01J...",
  "key": "sabor",
  "label": "Sabor",
  "type": "ENUM",
  "options": ["Pollo", "Carne", "Salmon"]
}
```

## Import products (CSV/XLSX)

- POST /api/v1/imports/products/preview?mode=upsert
- POST /api/v1/imports/products/confirm

Preview request:

- Multipart form-data
  - `file`: `.csv` or `.xlsx`
- `mode`: `create` | `update` | `upsert` (default `upsert`)

Expected product columns:

- Base columns: `code`, `name`, `categoryId`, `description`, `isActive`
- Custom attributes: columns prefixed with `attr_` (example: `attr_color`, `attr_talle`)

Preview response returns `previewId`, row-level errors and counters (`willCreate`, `willUpdate`).
Confirm request body:

```json
{
  "previewId": "01J..."
}
```

## Export products (CSV/XLSX)

- GET /api/v1/exports/products?format=xlsx&columns=code,name,categoryName,isActive

Notes:

- `format`: `xlsx` (default) or `csv`
- `columns`: comma-separated list (supports base columns and dynamic `attr_` columns)
- Reuses products filters (`q`, `name`, `code`, `categoryId`, `categoryName`, `isActive`)
