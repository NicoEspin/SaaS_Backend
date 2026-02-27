# Stock Management API (NestJS + Prisma + Postgres)

Backend API for the Stock Management SaaS.

## Quick links

- Base path: `/api/v1`
- Swagger UI: `/api/docs`
- OpenAPI JSON (generated): `docs/openapi.json` (run `npm run openapi:generate`)

## Requirements

- Node.js + npm
- PostgreSQL

## Setup

```bash
npm install
```

Environment variables (see `src/common/config/env.schema.ts`):

- `DATABASE_URL` (required outside `NODE_ENV=test`)
- `JWT_ACCESS_SECRET` (required outside `NODE_ENV=test`, min 32 chars)
- Optional: `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, cookie settings

Run the API:

```bash
npm run start:dev
```

## Auth

- This API accepts the access token via:
  - `Authorization: Bearer <token>` header, or
  - `accessToken` cookie (see `src/common/auth/jwt.strategy.ts`).
- `POST /api/v1/auth/login` sets auth cookies (204)
- `GET /api/v1/auth/session` returns the session for the current user

## Customers

`Customer` includes optional future billing fields and a soft-delete flag.

Enums:

- `type`: `RETAIL | WHOLESALE`
- `taxIdType`: `CUIT | CUIL | DNI | PASSPORT | FOREIGN`
- `vatCondition`: `REGISTERED | MONOTAX | EXEMPT | FINAL_CONSUMER | FOREIGN`

Endpoints:

- `POST /api/v1/customers`
- `GET /api/v1/customers`
  - Filter only active: `?isActive=true` (alias supported: `?IsActive=true`)
- `GET /api/v1/customers/:id`
- `PATCH /api/v1/customers/:id`
- `DELETE /api/v1/customers/:id` (soft delete: sets `isActive=false`)

Notes:

- Carts/checkout only accept active customers (`isActive=true`).

## Prisma / migrations

- Generate client: `npm run prisma:generate`
- Dev migrate: `npm run prisma:migrate:dev`
- Deploy migrations: `npm run prisma:migrate:deploy`

## OpenAPI generation

```bash
npm run openapi:generate
```

## Quality gates

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```
