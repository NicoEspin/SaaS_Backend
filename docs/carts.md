# Carts (Sales)

Cart is implemented as an `Order` in `DRAFT` status.

All endpoints require authentication via JWT.

Base path:

- /api/v1/branches/:branchId/carts

## Create cart

- POST /api/v1/branches/:branchId/carts

Body:

```json
{
  "customerId": "01J..."
}
```

Notes:

- `customerId` is optional.
- If provided, it must exist in the tenant and the customer must be active (`isActive=true`).

## Get cart

- GET /api/v1/branches/:branchId/carts/:cartId

## Add item

- POST /api/v1/branches/:branchId/carts/:cartId/items

Body:

```json
{
  "productId": "01J...",
  "quantity": 2
}
```

Notes:

- Product must be active (`isActive=true`).

## Set item quantity

- PATCH /api/v1/branches/:branchId/carts/:cartId/items/:productId

Body:

```json
{
  "quantity": 0
}
```

Notes:

- `quantity=0` removes the item.

## Remove item

- DELETE /api/v1/branches/:branchId/carts/:cartId/items/:productId

## Checkout

- POST /api/v1/branches/:branchId/carts/:cartId/checkout

Body:

```json
{
  "customerId": "01J..."
}
```

Behavior (high level):

- Validates cart is editable (`DRAFT`).
- Recalculates totals from items.
- Decrements stock on hand (must have enough stock).
- Creates an invoice and invoice lines.

Notes:

- `customerId` is optional, but if provided it must be active.
