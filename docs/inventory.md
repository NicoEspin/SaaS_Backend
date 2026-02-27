# Inventory

All endpoints require authentication via JWT.

Inventory is tracked per branch (`BranchInventory`).

## List inventory by branch

- GET /api/v1/branches/:branchId/inventory

Query params:

- `limit`: 1-100
- `cursor`: 26 char id (cursor pagination)

## Adjust inventory

- POST /api/v1/branches/:branchId/inventory/adjustments

Body:

```json
{
  "productId": "01J...",
  "quantity": -2,
  "notes": "Damaged"
}
```

## Transfer inventory

- POST /api/v1/branches/:branchId/inventory/transfers

Body:

```json
{
  "toBranchId": "01J...",
  "productId": "01J...",
  "quantity": 5,
  "notes": "Restock"
}
```

## Get stock by product

- GET /api/v1/products/:productId/stock
