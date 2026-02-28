# Carts (Sales)

Cart is implemented as an `Order` in `DRAFT` status.

Access is scoped by tenant, branch, and the authenticated membership. You cannot read or modify another user's cart even if you know its id.

All endpoints require authentication via JWT.

Base path:

- /api/v1/branches/:branchId/carts

## Current cart (per user)

This API supports a single `DRAFT` cart per authenticated user (`membershipId`) and branch.

### Get current cart

- GET /api/v1/branches/:branchId/carts/current

Returns 404 if there is no current `DRAFT` cart.

### Get or create current cart

- POST /api/v1/branches/:branchId/carts/current

Body:

```json
{
  "customerId": "01J..."
}
```

Notes:

- This is idempotent: if a `DRAFT` cart already exists for this user+branch, it returns it.
- `customerId` is optional.

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
- This endpoint behaves like "create-or-get" for the current user+branch.

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
- Creates an invoice and invoice lines in `DRAFT` status.
- Calculates VAT breakdown per line (prices are treated as VAT-included).
- Invoice issuance is a separate step (see `docs/invoices.md`).

Notes:

- `customerId` is optional, but if provided it must be active.
- `Factura B` can be issued without a customer (treated as "Consumidor Final").
- `Factura A` requires a customer (enforced at issuance time).
