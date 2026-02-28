# Inventory

All endpoints require authentication via JWT.

Inventory is tracked per branch (`BranchInventory`).

Notes:

- Inventory is also impacted by the Purchasing module when receiving goods (purchase receipts).
- Purchase receipts update `stockOnHand` and also update `BranchInventory.cost` using weighted average cost.

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
