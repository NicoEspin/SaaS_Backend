# apps/api — Backend Agent Rules (NestJS + PostgreSQL + Prisma)

This is the backend API (NestJS) using PostgreSQL via Prisma.

## Commands (must run before finishing)
- Dev: `npm run start:dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Tests: `npm run test` (and `npm run test:e2e` if present)
- Prisma:
  - Generate: `npm run prisma:generate`
  - Migrations (dev): `npm run prisma:migrate:dev`
  - Migrations (prod): `npm run prisma:migrate:deploy`


Definition of Done:
1) No TypeScript errors (`npm run typecheck`)
2) No lint errors (`npm run lint`)
3) Tests updated/added when behavior changes
4) DB changes include migrations + rollback/plan notes when risky
5) No “performance regressions by default” (pagination, select fields, indexes when needed)

---

## Architecture (non-negotiable)
- Feature-first modules (e.g. `users/`, `auth/`, `orders/`).
- Controllers: HTTP only (request/response, routing, guards).
- Services: business logic (no HTTP concerns).
- Data access: Prisma behind a small repository/service layer where complexity grows.
- Shared: `common/` for pipes/filters/interceptors/guards and `lib/` for utilities.

---

## TypeScript rules (ZERO type issues)
- No `any`.
- No `unknown` without narrowing.
- No forced casts (`as Type`) unless there is a clear, documented reason.
- DTOs must be typed and validated at the boundary.
- Prefer `satisfies` over casting for object literals.

---

## Validation & error handling
- All inputs validated at the boundary:
  - DTO + ValidationPipe (or a single consistent schema approach).
- Use a global exception filter for consistent error shape.
- Never leak stack traces, secrets, or internal DB errors to clients.

---

## Prisma rules (performance + safety)
- PrismaClient must be a singleton within the app process.
- Prefer `select` (only fields you need). Avoid fetching entire models by default.
- Avoid N+1:
  - Use `include`/nested selects thoughtfully,
  - Or rewrite using fewer queries / transactions when needed.
- Pagination is required for lists:
  - Prefer cursor pagination for large datasets.
- Use transactions for multi-step writes that must be atomic.
- Never run destructive “dev” commands in production.
- Migration discipline:
  - Dev: `migrate dev`
  - Prod: `migrate deploy`
  - Do not edit applied migrations; use follow-up migrations.

---

## PostgreSQL rules (performance)
- Add indexes intentionally for:
  - frequent filters, joins, sorting, and cursor pagination fields.
- Use EXPLAIN/ANALYZE mentality for slow queries.
- Be mindful of locking:
  - prefer additive migrations,
  - batch big backfills,
  - avoid long-running transactions.
- Connection management:
  - use pooling in production (pgBouncer/managed pool) when applicable,
  - avoid creating too many Prisma clients.

---

## Security baseline
- Authentication + authorization are mandatory for protected resources.
- Apply rate limiting/throttling where endpoints can be abused.
- Validate & sanitize inputs to prevent injection and payload abuse.
- CORS must be explicit and minimal (no wildcard in production).

---

## API contract
- Keep API consistent:
  - stable response envelope conventions,
  - predictable error formats,
  - clear pagination shape.
- If an OpenAPI spec exists, it must be updated alongside endpoint changes.

---

## Skills usage (use deliberately)
Use these skills as source of truth when relevant:

- `nestjs-best-practices`: module structure, DI, guards, interceptors, testing patterns.
- `nestjs-clean-typescript`: strong typing patterns and clean API architecture.
- `prisma-database-setup` / `prisma-cli`: setup and correct Prisma workflows.
- `prisma-migration-assistant`: planning safe migrations and deploy workflow.
- `supabase-postgres-best-practices` / `postgresql-best-practices`: indexing, pooling, query plans, locking, monitoring.
- `openapi-spec-generation`: spec-first or spec maintenance.
- `api-security-best-practices`: auth, rate limiting, OWASP API risks.
- `prisma-expert` (optional): query performance, relations modeling, Prisma pitfalls.
