# File Map (inventario completo)

Este archivo lista TODOS los archivos versionados por Git en este repo y resume su proposito. Sirve como mapa rapido para orientarse.

Nota: el directorio `.agents/` contiene material para el agente de codificacion (skills/rules) y no es necesario para ejecutar la API en produccion; aun asi esta listado porque forma parte del repo.

## Root

- `.dockerignore`: excluye `node_modules`, `dist`, `coverage`, `.git`, `.env`, `.agents` del contexto Docker.
- `.env.example`: plantilla de variables de entorno para desarrollo.
- `.gitignore`: ignora `dist`, `node_modules`, `.env*`, coverage, etc.
- `.prettierrc`: config de prettier (single quotes, trailing commas).
- `AGENTS.md`: reglas internas de desarrollo para este repo (NestJS/Prisma/Postgres).
- `Dockerfile`: build/run de API en contenedor (genera Prisma client + build TS).
- `README.md`: README del proyecto (setup, auth, endpoints principales, quality gates).
- `docker-compose.yml`: stack local (Postgres 16 + API) y comando de arranque con migrate deploy.
- `eslint.config.mjs`: ESLint flat config con TypeScript type-checked + prettier.
- `nest-cli.json`: config del Nest CLI (sourceRoot, deleteOutDir).
- `package-lock.json`: lockfile NPM (autogenerado).
- `package.json`: scripts, dependencias, config Jest.
- `prisma.config.ts`: config de Prisma CLI (schema, migrations, DATABASE_URL via env).
- `tsconfig.build.json`: TS config para build (excluye tests/dist).
- `tsconfig.json`: TS compiler options.

## Docs

- `docs/backend-advanced.md`: documentacion avanzada del backend (este se agrega en esta tarea).
- `docs/file-map.md`: inventario completo de archivos (este se agrega en esta tarea).
- `docs/openapi.json`: especificacion OpenAPI generada desde Swagger.
- `docs/onboarding-initial.md`: doc del endpoint publico de onboarding inicial.
- `docs/products-crud.md`: doc de productos + import/export.
- `docs/categories-crud.md`: doc de categories.
- `docs/branches-crud.md`: doc de branches (CRUD + active branch).
- `docs/auth.md`: doc de endpoints de autenticacion.
- `docs/customers-crud.md`: doc de customers (CRUD + soft delete).
- `docs/carts.md`: doc de carts + checkout.
- `docs/inventory.md`: doc de inventario (list/adjust/transfer).

## Prisma

- `prisma/schema.prisma`: schema principal (modelos, enums, indexes, relaciones).
- `prisma/migrations/migration_lock.toml`: lock del provider de migraciones (no editar).
- `prisma/migrations/20260217154134_init_tenant_branch_domain/migration.sql`: migracion inicial (tablas base + enums + indices).
- `prisma/migrations/20260218100000_add_categories/migration.sql`: agrega categories y relation product->category.
- `prisma/migrations/20260219120000_product_custom_attributes/migration.sql`: agrega JSONB attributes + definiciones de atributos.
- `prisma/migrations/20260220192216_add_refresh_tokens/migration.sql`: agrega refresh_tokens e indices en products.
- `prisma/migrations/20260227100000_add_customer_fields/migration.sql`: agrega billing fields a customers + `is_active`.
- `prisma/migrations/20260226153000_membership_active_branch/migration.sql`: agrega `memberships.active_branch_id` (branch activo por membership).

## Source (NestJS)

- `src/main.ts`: bootstrap de Nest (prefix, pipes, CORS, swagger, cookies).
- `src/openapi.ts`: genera `docs/openapi.json` sin levantar el server.
- `src/app.module.ts`: modulo raiz, importa features y modulos comunes.
- `src/app.controller.ts`: endpoint `GET /` (hello world).
- `src/app.service.ts`: service del `GET /`.
- `src/app.controller.spec.ts`: unit test del `GET /`.

### Common: config, DB, logging, tenancy, ids

- `src/common/config/config.module.ts`: ConfigModule global con `validateEnv`.
- `src/common/config/env.schema.ts`: schema Zod de env + validacion.
- `src/common/database/prisma.module.ts`: modulo global que exporta PrismaService.
- `src/common/database/prisma.service.ts`: PrismaClient singleton + pg pool + lifecycle.
- `src/common/logging/logging.module.ts`: nestjs-pino setup.
- `src/common/tenancy/tenancy.module.ts`: modulo global de tenancy.
- `src/common/tenancy/tenancy.service.ts`: lookup tenant por slug (select minimo).
- `src/common/ids/new-id.ts`: helper de IDs ULID (26 chars).

### Common: auth

- `src/common/auth/auth.module.ts`: registra Passport/JWT y provee AuthService/JwtStrategy/RolesGuard.
- `src/common/auth/auth.controller.ts`: endpoints login/refresh/logout (cookies, 204).
- `src/common/auth/auth.service.ts`: logica de login, emision JWT, refresh tokens persistidos.
- `src/common/auth/auth.cookies.ts`: opciones de cookies (secure/samesite/domain/path).
- `src/common/auth/auth.types.ts`: tipos `AuthUser`, `JwtPayload`, roles.
- `src/common/auth/current-user.decorator.ts`: decorator `@CurrentUser()` (requiere JwtAuthGuard).
- `src/common/auth/jwt-auth.guard.ts`: wrapper de AuthGuard('jwt').
- `src/common/auth/jwt.strategy.ts`: estrategia JWT (extrae cookie o bearer).
- `src/common/auth/jwt.util.ts`: util `durationToSeconds()` para TTL.
- `src/common/auth/roles.decorator.ts`: decorator `@Roles()`.
- `src/common/auth/roles.guard.ts`: guard de roles (usa metadata con Reflector).
- `src/common/auth/dto/login.dto.ts`: DTO de login.
- `src/common/auth/dto/logout.dto.ts`: DTO alternativo para logout (no usado por controller actual).
- `src/common/auth/dto/refresh.dto.ts`: DTO alternativo para refresh (no usado por controller actual).

### Onboarding

- `src/onboarding/onboarding.module.ts`: modulo onboarding (importa AuthModule).
- `src/onboarding/onboarding.controller.ts`: `POST /onboarding/initial` (set cookies, devuelve tenant/user/membership).
- `src/onboarding/onboarding.service.ts`: transaccion tenant+admin+membership + emite tokens.
- `src/onboarding/onboarding.service.spec.ts`: unit tests del onboarding.
- `src/onboarding/dto/initial-onboarding.dto.ts`: DTO validado para onboarding inicial.

### Products

- `src/products/products.module.ts`: modulo products.
- `src/products/products.controller.ts`: endpoints CRUD + attribute definitions.
- `src/products/products.service.ts`: logica de productos (paginacion cursor, validacion attributes, conflictos).
- `src/products/products.service.spec.ts`: unit tests del service.
- `src/products/dto/create-product.dto.ts`: DTO create.
- `src/products/dto/update-product.dto.ts`: DTO update.
- `src/products/dto/list-products.query.dto.ts`: DTO query list (limit/cursor/q/filtros).
- `src/products/dto/product-id.param.dto.ts`: DTO param `:id` (26 chars).
- `src/products/dto/create-product-attribute-definition.dto.ts`: DTO create attribute definition.
- `src/products/dto/update-product-attribute-definition.dto.ts`: DTO update attribute definition.
- `src/products/dto/list-product-attribute-definitions.query.dto.ts`: DTO query list definitions.
- `src/products/dto/product-attribute-definition-id.param.dto.ts`: DTO param `:id` para definiciones.

### Branches

- `src/branches/branches.module.ts`: modulo branches (CRUD + set active branch) con guard de roles.
- `src/branches/branches.controller.ts`: endpoints `/branches` + `POST /branches/active`.
- `src/branches/branches.service.ts`: logica CRUD tenant-scoped + persistencia activeBranch en membership.
- `src/branches/branches.service.spec.ts`: unit tests del service.
- `src/branches/dto/create-branch.dto.ts`: DTO create.
- `src/branches/dto/update-branch.dto.ts`: DTO update.
- `src/branches/dto/list-branches.query.dto.ts`: DTO query list (limit/cursor/q).
- `src/branches/dto/branch-id.param.dto.ts`: DTO param `:id` (26 chars).
- `src/branches/dto/set-active-branch.dto.ts`: DTO body para setear branch activo.

### Customers

- `src/customers/customers.module.ts`: modulo customers.
- `src/customers/customers.controller.ts`: endpoints CRUD (soft delete).
- `src/customers/customers.service.ts`: logica tenant-scoped + filtros + soft delete.
- `src/customers/customers.service.spec.ts`: unit tests del service.
- `src/customers/dto/*`: DTOs (create/update/list/params).

### Sales (carts)

- `src/modules/sales/sales.module.ts`: modulo sales (agrega carts).
- `src/modules/sales/carts/carts.module.ts`: modulo carts.
- `src/modules/sales/carts/carts.controller.ts`: endpoints de carts (branch scoped).
- `src/modules/sales/carts/carts.service.ts`: logica de carts/checkout/invoice/stock.
- `src/modules/sales/carts/carts.service.spec.ts`: unit tests del service.
- `src/modules/sales/carts/dto/create-cart.dto.ts`: DTO create cart.
- `src/modules/sales/carts/dto/checkout-cart.dto.ts`: DTO checkout.
- `src/modules/sales/carts/dto/add-cart-item.dto.ts`: DTO add item.
- `src/modules/sales/carts/dto/set-cart-item-quantity.dto.ts`: DTO set qty.
- `src/modules/sales/carts/dto/branch-id.param.dto.ts`: DTO `:branchId`.
- `src/modules/sales/carts/dto/cart-id.param.dto.ts`: DTO `:cartId`.
- `src/modules/sales/carts/dto/product-id.param.dto.ts`: DTO `:productId`.

### Imports/Exports

- `src/imports-exports/imports-exports.module.ts`: modulo import/export (registra services + adapter products).
- `src/imports-exports/imports-exports.controller.ts`: endpoints genericos import/confirm/export.
- `src/imports-exports/imports-exports.service.ts`: orquestador de adapters + construccion de archivo csv/xlsx.
- `src/imports-exports/import-file-parser.service.ts`: parser de CSV/XLSX a rows tipadas.
- `src/imports-exports/import-preview-store.service.ts`: store in-memory de previews (TTL, one-shot).
- `src/imports-exports/import-export.types.ts`: tipos compartidos para import/export.
- `src/imports-exports/dto/confirm-import.dto.ts`: DTO del body para confirm import.
- `src/imports-exports/entities/import-export-entity-adapter.interface.ts`: contrato de adapter.
- `src/imports-exports/entities/products-import-export.adapter.ts`: adapter de products (preview/confirm/export, columnas base y `attr_`).

## Tests (e2e)

- `test/app.e2e-spec.ts`: test e2e baseline de `GET /`.
- `test/jest-e2e.json`: config Jest para e2e.

## Agent Skills (no runtime)

- `.agents/skills/api-security-best-practices/SKILL.md`: guia de buenas practicas de seguridad para APIs.
- `.agents/skills/nestjs-best-practices/.github/workflows/branch-protection.yml`: workflow ejemplo (material de skill).
- `.agents/skills/nestjs-best-practices/.github/workflows/deploy.yml`: workflow ejemplo (material de skill).
- `.agents/skills/nestjs-best-practices/.gitignore`: ignore de ejemplo para el paquete del skill.
- `.agents/skills/nestjs-best-practices/AGENTS.md`: reglas del skill NestJS.
- `.agents/skills/nestjs-best-practices/SKILL.md`: contenido principal del skill NestJS.
- `.agents/skills/nestjs-best-practices/rules/api-use-dto-serialization.md`: regla sobre serializacion DTO.
- `.agents/skills/nestjs-best-practices/rules/api-use-interceptors.md`: regla sobre interceptors.
- `.agents/skills/nestjs-best-practices/rules/api-use-pipes.md`: regla sobre pipes.
- `.agents/skills/nestjs-best-practices/rules/api-versioning.md`: regla sobre versionado.
- `.agents/skills/nestjs-best-practices/rules/arch-avoid-circular-deps.md`: regla sobre deps circulares.
- `.agents/skills/nestjs-best-practices/rules/arch-feature-modules.md`: regla sobre feature modules.
- `.agents/skills/nestjs-best-practices/rules/arch-module-sharing.md`: regla sobre sharing entre modulos.
- `.agents/skills/nestjs-best-practices/rules/arch-single-responsibility.md`: regla sobre SRP.
- `.agents/skills/nestjs-best-practices/rules/arch-use-events.md`: regla sobre eventos.
- `.agents/skills/nestjs-best-practices/rules/arch-use-repository-pattern.md`: regla sobre repository pattern.
- `.agents/skills/nestjs-best-practices/rules/db-avoid-n-plus-one.md`: regla sobre evitar N+1.
- `.agents/skills/nestjs-best-practices/rules/db-use-migrations.md`: regla sobre migraciones.
- `.agents/skills/nestjs-best-practices/rules/db-use-transactions.md`: regla sobre transacciones.
- `.agents/skills/nestjs-best-practices/rules/devops-graceful-shutdown.md`: regla sobre shutdown.
- `.agents/skills/nestjs-best-practices/rules/devops-use-config-module.md`: regla sobre config.
- `.agents/skills/nestjs-best-practices/rules/devops-use-logging.md`: regla sobre logging.
- `.agents/skills/nestjs-best-practices/rules/di-avoid-service-locator.md`: regla sobre DI.
- `.agents/skills/nestjs-best-practices/rules/di-interface-segregation.md`: regla ISP.
- `.agents/skills/nestjs-best-practices/rules/di-liskov-substitution.md`: regla LSP.
- `.agents/skills/nestjs-best-practices/rules/di-prefer-constructor-injection.md`: regla constructor injection.
- `.agents/skills/nestjs-best-practices/rules/di-scope-awareness.md`: regla sobre scopes.
- `.agents/skills/nestjs-best-practices/rules/di-use-interfaces-tokens.md`: regla sobre tokens/interfaces.
- `.agents/skills/nestjs-best-practices/rules/error-handle-async-errors.md`: regla async errors.
- `.agents/skills/nestjs-best-practices/rules/error-throw-http-exceptions.md`: regla HttpExceptions.
- `.agents/skills/nestjs-best-practices/rules/error-use-exception-filters.md`: regla exception filters.
- `.agents/skills/nestjs-best-practices/rules/micro-use-health-checks.md`: regla health checks.
- `.agents/skills/nestjs-best-practices/rules/micro-use-patterns.md`: regla patterns.
- `.agents/skills/nestjs-best-practices/rules/micro-use-queues.md`: regla queues.
- `.agents/skills/nestjs-best-practices/rules/perf-async-hooks.md`: regla perf/async hooks.
- `.agents/skills/nestjs-best-practices/rules/perf-lazy-loading.md`: regla lazy loading.
- `.agents/skills/nestjs-best-practices/rules/perf-optimize-database.md`: regla optimizacion DB.
- `.agents/skills/nestjs-best-practices/rules/perf-use-caching.md`: regla caching.
- `.agents/skills/nestjs-best-practices/rules/security-auth-jwt.md`: regla JWT.
- `.agents/skills/nestjs-best-practices/rules/security-rate-limiting.md`: regla rate limiting.
- `.agents/skills/nestjs-best-practices/rules/security-sanitize-output.md`: regla sanitizacion.
- `.agents/skills/nestjs-best-practices/rules/security-use-guards.md`: regla guards.
- `.agents/skills/nestjs-best-practices/rules/security-validate-all-input.md`: regla validacion.
- `.agents/skills/nestjs-best-practices/rules/test-e2e-supertest.md`: regla e2e.
- `.agents/skills/nestjs-best-practices/rules/test-mock-external-services.md`: regla mocks.
- `.agents/skills/nestjs-best-practices/rules/test-use-testing-module.md`: regla TestingModule.
- `.agents/skills/nestjs-best-practices/scripts/build-agents.ts`: script de build del skill.
- `.agents/skills/nestjs-best-practices/scripts/build.sh`: script shell del skill.
- `.agents/skills/nestjs-best-practices/scripts/package-lock.json`: lockfile del skill (autogenerado).
- `.agents/skills/nestjs-best-practices/scripts/package.json`: deps/scripts del skill.
- `.agents/skills/nestjs-clean-typescript/SKILL.md`: guia de NestJS con TS limpio.
- `.agents/skills/openapi-spec-generation/SKILL.md`: guia de generacion OpenAPI.
- `.agents/skills/postgresql-best-practices/SKILL.md`: guia de buenas practicas Postgres.
- `.agents/skills/prisma-cli/SKILL.md`: referencia de Prisma CLI.
- `.agents/skills/prisma-cli/rules/db-execute.md`: regla `prisma db execute`.
- `.agents/skills/prisma-cli/rules/db-pull.md`: regla `prisma db pull`.
- `.agents/skills/prisma-cli/rules/db-push.md`: regla `prisma db push`.
- `.agents/skills/prisma-cli/rules/db-seed.md`: regla `prisma db seed`.
- `.agents/skills/prisma-cli/rules/debug.md`: regla debug.
- `.agents/skills/prisma-cli/rules/dev.md`: regla comandos dev.
- `.agents/skills/prisma-cli/rules/format.md`: regla `prisma format`.
- `.agents/skills/prisma-cli/rules/generate.md`: regla `prisma generate`.
- `.agents/skills/prisma-cli/rules/init.md`: regla `prisma init`.
- `.agents/skills/prisma-cli/rules/migrate-deploy.md`: regla migrate deploy.
- `.agents/skills/prisma-cli/rules/migrate-dev.md`: regla migrate dev.
- `.agents/skills/prisma-cli/rules/migrate-diff.md`: regla migrate diff.
- `.agents/skills/prisma-cli/rules/migrate-reset.md`: regla migrate reset.
- `.agents/skills/prisma-cli/rules/migrate-resolve.md`: regla migrate resolve.
- `.agents/skills/prisma-cli/rules/migrate-status.md`: regla migrate status.
- `.agents/skills/prisma-cli/rules/studio.md`: regla prisma studio.
- `.agents/skills/prisma-cli/rules/validate.md`: regla prisma validate.
- `.agents/skills/prisma-database-setup/SKILL.md`: guia de setup DB para Prisma.
- `.agents/skills/prisma-database-setup/rules/cockroachdb.md`: setup CockroachDB.
- `.agents/skills/prisma-database-setup/rules/mongodb.md`: setup MongoDB.
- `.agents/skills/prisma-database-setup/rules/mysql.md`: setup MySQL.
- `.agents/skills/prisma-database-setup/rules/postgresql.md`: setup PostgreSQL.
- `.agents/skills/prisma-database-setup/rules/prisma-client-setup.md`: setup Prisma Client.
- `.agents/skills/prisma-database-setup/rules/prisma-postgres.md`: setup Prisma Postgres.
- `.agents/skills/prisma-database-setup/rules/sqlite.md`: setup SQLite.
- `.agents/skills/prisma-database-setup/rules/sqlserver.md`: setup SQL Server.
- `.agents/skills/prisma-expert/SKILL.md`: guia experta de Prisma.
- `.agents/skills/prisma-migration-assistant/SKILL.md`: guia para planificar migraciones seguras.
- `.agents/skills/supabase-postgres-best-practices/AGENTS.md`: reglas del skill Supabase/Postgres.
- `.agents/skills/supabase-postgres-best-practices/CLAUDE.md`: notas del skill.
- `.agents/skills/supabase-postgres-best-practices/SKILL.md`: contenido principal del skill.
- `.agents/skills/supabase-postgres-best-practices/references/advanced-full-text-search.md`: referencia FTS avanzada.
- `.agents/skills/supabase-postgres-best-practices/references/advanced-jsonb-indexing.md`: referencia indexes JSONB.
- `.agents/skills/supabase-postgres-best-practices/references/conn-idle-timeout.md`: referencia idle timeout.
- `.agents/skills/supabase-postgres-best-practices/references/conn-limits.md`: referencia limites de conexiones.
- `.agents/skills/supabase-postgres-best-practices/references/conn-pooling.md`: referencia connection pooling.
- `.agents/skills/supabase-postgres-best-practices/references/conn-prepared-statements.md`: referencia prepared statements.
- `.agents/skills/supabase-postgres-best-practices/references/data-batch-inserts.md`: referencia batch inserts.
- `.agents/skills/supabase-postgres-best-practices/references/data-n-plus-one.md`: referencia N+1.
- `.agents/skills/supabase-postgres-best-practices/references/data-pagination.md`: referencia pagination.
- `.agents/skills/supabase-postgres-best-practices/references/data-upsert.md`: referencia upsert.
- `.agents/skills/supabase-postgres-best-practices/references/lock-advisory.md`: referencia advisory locks.
- `.agents/skills/supabase-postgres-best-practices/references/lock-deadlock-prevention.md`: referencia deadlocks.
- `.agents/skills/supabase-postgres-best-practices/references/lock-short-transactions.md`: referencia transacciones cortas.
- `.agents/skills/supabase-postgres-best-practices/references/lock-skip-locked.md`: referencia SKIP LOCKED.
- `.agents/skills/supabase-postgres-best-practices/references/monitor-explain-analyze.md`: referencia EXPLAIN/ANALYZE.
- `.agents/skills/supabase-postgres-best-practices/references/monitor-pg-stat-statements.md`: referencia pg_stat_statements.
- `.agents/skills/supabase-postgres-best-practices/references/monitor-vacuum-analyze.md`: referencia VACUUM/ANALYZE.
- `.agents/skills/supabase-postgres-best-practices/references/query-composite-indexes.md`: referencia indices compuestos.
- `.agents/skills/supabase-postgres-best-practices/references/query-covering-indexes.md`: referencia covering indexes.
- `.agents/skills/supabase-postgres-best-practices/references/query-index-types.md`: referencia tipos de indices.
- `.agents/skills/supabase-postgres-best-practices/references/query-missing-indexes.md`: referencia missing indexes.
- `.agents/skills/supabase-postgres-best-practices/references/query-partial-indexes.md`: referencia partial indexes.
- `.agents/skills/supabase-postgres-best-practices/references/schema-data-types.md`: referencia tipos de datos.
- `.agents/skills/supabase-postgres-best-practices/references/schema-foreign-key-indexes.md`: referencia indices en FKs.
- `.agents/skills/supabase-postgres-best-practices/references/schema-lowercase-identifiers.md`: referencia identifiers lowercase.
- `.agents/skills/supabase-postgres-best-practices/references/schema-partitioning.md`: referencia partitioning.
- `.agents/skills/supabase-postgres-best-practices/references/schema-primary-keys.md`: referencia PKs.
- `.agents/skills/supabase-postgres-best-practices/references/security-privileges.md`: referencia privileges.
- `.agents/skills/supabase-postgres-best-practices/references/security-rls-basics.md`: referencia RLS.
- `.agents/skills/supabase-postgres-best-practices/references/security-rls-performance.md`: referencia performance de RLS.
