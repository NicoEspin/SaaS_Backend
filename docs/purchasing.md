# Purchasing (Suppliers + Purchase Orders + Receipts)

All endpoints require authentication via JWT.

Access control:

- All purchasing endpoints require role: `OWNER | ADMIN | MANAGER`.

This module implements procurement as a separate domain from Sales:

- Sales uses `Order` / `OrderItem`.
- Purchasing uses `PurchaseOrder` / `PurchaseOrderItem` and always records inbound stock via `PurchaseReceipt` / `PurchaseReceiptItem`.

Key business rules:

- Stock is impacted ONLY when receiving goods (creating a receipt), never on purchase order confirmation.
- Costs are tracked as:
  - `agreedUnitCost` on the purchase order item (what we agreed with the supplier)
  - `actualUnitCost` on the receipt item (what was actually billed)
- `BranchInventory.cost` is updated using weighted average based on `actualUnitCost`.

Base paths:

- Suppliers: `/api/v1/suppliers`
- Purchase orders: `/api/v1/purchase-orders`

## Suppliers

### Create supplier

- POST `/api/v1/suppliers`

Body:

```json
{
  "name": "ACME S.A.",
  "email": "compras@acme.com",
  "phone": "+54 11 5555-5555",
  "address": "Av. Siempre Viva 123",
  "taxId": "30-12345678-9",
  "paymentTerms": "NET30",
  "notes": "Entrega en deposito central",
  "isActive": true
}
```

### List suppliers (cursor pagination)

- GET `/api/v1/suppliers?limit=50&cursor=<supplierId>&isActive=true&q=acme`

Response:

```json
{
  "items": [
    {
      "id": "01J...",
      "name": "ACME S.A.",
      "email": "compras@acme.com",
      "phone": null,
      "address": null,
      "taxId": null,
      "paymentTerms": "NET30",
      "notes": null,
      "isActive": true,
      "createdAt": "2026-02-28T00:00:00.000Z",
      "updatedAt": "2026-02-28T00:00:00.000Z"
    }
  ],
  "nextCursor": "01J..."
}
```

### Get supplier

- GET `/api/v1/suppliers/:id`

### Update supplier

- PATCH `/api/v1/suppliers/:id`

## Purchase Orders

Purchase order statuses:

- `DRAFT`: editable; no stock impact.
- `CONFIRMED`: ready to receive; no stock impact.
- `PARTIALLY_RECEIVED`: at least one receipt exists and there is still pending quantity.
- `COMPLETED`: all items fully received (`quantityOrdered - receivedQty = 0` for all lines).
- `CANCELLED`: only allowed if no receipts were created.

### Create purchase order

- POST `/api/v1/purchase-orders`

Body:

```json
{
  "branchId": "01J...",
  "supplierId": "01J...",
  "expectedAt": "2026-03-10T12:00:00.000Z",
  "notes": "Entregar por la tarde",
  "items": [
    {
      "productId": "01J...",
      "quantityOrdered": 10,
      "agreedUnitCost": 1200
    }
  ]
}
```

Notes:

- Each item must include exactly one of `productId` or `newProduct`.
- `agreedUnitCost` is stored in the purchase order item as `agreedUnitCost`.

### Create purchase order with a new product

`newProduct` supports the same `categoryId` + `attributes` concept as product creation, but does NOT allow `initialStock`.
The product is created inside the same DB transaction as the purchase order.

```json
{
  "branchId": "01J...",
  "supplierId": "01J...",
  "items": [
    {
      "newProduct": {
        "code": "SKU-N",
        "name": "Producto Nuevo",
        "categoryId": "01J...",
        "attributes": { "color": "rojo" },
        "isActive": true
      },
      "quantityOrdered": 5,
      "agreedUnitCost": 500
    }
  ]
}
```

### Confirm purchase order

- POST `/api/v1/purchase-orders/:id/confirm`

Behavior:

- Moves status from `DRAFT` -> `CONFIRMED`.
- Does NOT change inventory.

### Cancel purchase order

- POST `/api/v1/purchase-orders/:id/cancel`

Rules:

- Not allowed if any item has `receivedQty > 0`.
- Not allowed if already `COMPLETED`.

### Receive goods (create receipt)

- POST `/api/v1/purchase-orders/:id/receipts`

Body:

```json
{
  "receivedAt": "2026-03-10T15:30:00.000Z",
  "notes": "Llegaron 2 cajas",
  "payableId": "01J...",
  "items": [
    {
      "purchaseOrderItemId": "01J...",
      "quantityReceived": 3,
      "actualUnitCost": 550
    }
  ]
}
```

Rules:

- `quantityReceived` must be `<= pendingQty` for that purchase order item.
- Each receipt item generates:
  - a `PurchaseReceiptItem`
  - an increment to `PurchaseOrderItem.receivedQty`
  - inventory impact via weighted average cost update
  - one `StockMovement` (`type = PURCHASE_RECEIPT`, `referenceType = PURCHASE_RECEIPT`, `referenceId = receiptId`)

Status transitions:

- If after this receipt all items are fully received => `COMPLETED`.
- Otherwise, if the order was `CONFIRMED` => becomes `PARTIALLY_RECEIVED`.

## Inventory + Costing

Inventory impact is centralized in `InventoryService.receivePurchaseLine(...)`.

- `BranchInventory.stockOnHand` is incremented by the receipt quantities.
- `BranchInventory.cost` is recalculated using weighted average with `actualUnitCost`:

`(stockBefore * costBefore + qtyReceived * actualUnitCost) / stockAfter`

If the branch inventory row is new, `cost = actualUnitCost`.
