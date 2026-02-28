# Invoices

All endpoints require authentication via JWT.

Base path:

- `/api/v1/branches/:branchId/invoices`

Invoices are created from cart checkout and start as `DRAFT`. Issuance is a separate step so we can support fiscal providers (ARCA) later without mixing external calls into checkout/stock transactions.

## Lifecycle

1. Checkout creates:

- `Invoice.status = DRAFT`
- `InvoiceLine` rows (snapshots)
- VAT breakdown per line (prices treated as VAT-included)

2. Issue invoice:

- `INTERNAL`: assigns internal display number and marks invoice as `ISSUED`.
- `ARCA`: planned (will authorize and store CAE/QR/etc.).

## List invoices (cursor pagination)

- `GET /api/v1/branches/:branchId/invoices?limit=50&cursor=<invoiceId>&status=DRAFT&customerId=01J...`

Response:

```json
{
  "items": [
    {
      "id": "01J...",
      "number": "01J...",
      "displayNumber": "B-00000001",
      "status": "ISSUED",
      "mode": "INTERNAL",
      "docType": "B",
      "issuedAt": "2026-02-27T00:00:00.000Z",
      "customerId": null,
      "customerNameSnapshot": null,
      "total": "121.00",
      "createdAt": "2026-02-27T00:00:00.000Z"
    }
  ],
  "nextCursor": "01J..."
}
```

## Get invoice

- `GET /api/v1/branches/:branchId/invoices/:invoiceId`

Returns invoice totals + line VAT breakdown.

## Issue invoice

- `POST /api/v1/branches/:branchId/invoices/:invoiceId/issue`

Body:

```json
{
  "docType": "B",
  "mode": "INTERNAL"
}
```

Rules:

- `docType=A` requires a `customerId` on the invoice.
- `docType=B` can be issued without a customer (treated as "Consumidor Final").
- `mode=ARCA` returns `501 Not Implemented` for now.

Internal numbering:

- Issuance assigns `displayNumber` in the form: `A-00000001` / `B-00000001`.
- Sequence is per `tenantId + branchId + docType + mode`.

## PDF

- `GET /api/v1/branches/:branchId/invoices/:invoiceId/pdf?variant=internal`

Notes:

- `variant=fiscal` is reserved for ARCA and returns `501` for now.
- Response is `application/pdf` and includes `Content-Disposition: inline`.
