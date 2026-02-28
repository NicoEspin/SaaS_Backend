# Stock-Managment Backend (NestJS + PostgreSQL + Prisma)

Este documento explica en profundidad como esta armado el backend, que problemas resuelve cada pieza y como extenderlo sin romper las reglas de arquitectura/seguridad.

La app es un API multi-tenant (SaaS) para stock/ventas. La tenencia se modela con `Tenant` y la identidad/roles con `User` + `Membership`. En runtime, casi todas las operaciones se scopian por `tenantId` (sale del JWT).

## Stack y decisiones clave

- Framework: NestJS (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`).
- DB: PostgreSQL, acceso via Prisma (`@prisma/client`, `prisma`).
- Prisma en Node 22: usa `@prisma/adapter-pg` + `pg.Pool` para un pool explicito.
- Validacion de inputs: `class-validator` + `class-transformer` con `ValidationPipe` global (whitelist + forbidNonWhitelisted + transform).
- Config/env: `@nestjs/config` + validacion fuerte con Zod.
- Auth: JWT access token + refresh token persistido (hash SHA-256) y cookies HTTP-only.
- Logging: `nestjs-pino` (request logging + `x-request-id`).
- Import/Export: CSV (`csv-parse/sync`) y XLSX (`exceljs`) con preview + confirm.
- OpenAPI/Swagger: `@nestjs/swagger` (docs en `/api/docs`).

## Como arranca la aplicacion

Archivo: `src/main.ts`.

1. Crea la app: `NestFactory.create(AppModule, { bufferLogs: true })`.
2. Logger global: engancha `nestjs-pino` (ver `src/common/logging/logging.module.ts`).
3. Shutdown hooks: `app.enableShutdownHooks()`.
4. Versionado/prefix: `app.setGlobalPrefix('api/v1')`.
5. Cookies: `cookie-parser` para poder leer cookies en auth.
6. Validacion global: `ValidationPipe` con:
   - `whitelist: true`: elimina props no declaradas en DTO.
   - `forbidNonWhitelisted: true`: rechaza payload con props extras.
   - `transform: true`: castea query params a tipos (ej `limit` a number).
7. CORS estricto:
   - Lee `CORS_ORIGINS`, separa por coma, normaliza (sin trailing slash).
   - Permite `credentials: true` (cookies cross-origin cuando corresponde).
   - Si `origin` es `undefined` (ej curl/server-to-server) lo permite.
8. Swagger:
   - Titulo/version.
   - `addBearerAuth()` para Authorization header.
   - `addCookieAuth()` para documentar auth via cookie `accessToken`.
   - Setup en `/api/docs`.

Para generar una especificacion OpenAPI versionada en el repo:

- Comando: `npm run openapi:generate`
- Output: `docs/openapi.json`

9. Listen en `PORT`.

## Modulos y limites (arquitectura)

Archivo: `src/app.module.ts`.

Se importan modulos feature-first:

- `AppConfigModule`: Config global + validacion env.
- `LoggingModule`: pino logger.
- `PrismaModule`: PrismaService singleton global.
- `TenancyModule`: helpers tenant (lookup por slug).
- `AuthModule`: auth endpoints + JWT strategy.
- `OnboardingModule`: bootstrap de tenant + admin.
- `CategoriesModule`: CRUD de categorias.
- `BranchesModule`: CRUD de sucursales + branch activo por membership.
- `CustomersModule`: CRUD de customers (soft delete).
- `ProductsModule`: CRUD de productos + definiciones de atributos.
- `InventoryModule`: endpoints de inventario (list/adjust/transfer/stock).
- `SalesModule`: features de ventas (hoy: carts).
- `ImportsExportsModule`: import/export para entidades (hoy: products).

Regla practica: Controllers solo HTTP (DTO, guards, params). Toda logica vive en Services. Acceso a DB via PrismaService y `select` explicitos.

## Configuracion (env)

Archivos: `src/common/config/env.schema.ts`, `src/common/config/config.module.ts`, `.env.example`.

### Variables

- `NODE_ENV`: `development` | `test` | `production`.
- `PORT`: default 3001.
- `LOG_LEVEL`: pino (`fatal|error|warn|info|debug|trace|silent`).
- `CORS_ORIGINS`: lista separada por coma. Importante: sin trailing slash.
- `DATABASE_URL`: requerida salvo en `test`.
- `JWT_ACCESS_SECRET`: requerida salvo en `test` (en test se inyecta default).
- `JWT_ACCESS_TTL`: default `15m`.
- `JWT_REFRESH_TTL`: default `30d`.
- Cookies:
  - `COOKIE_DOMAIN`: en prod, tipico `.miempresa.com`.
  - `COOKIE_SAMESITE`: `lax|strict|none`.
  - `COOKIE_SECURE`: si no se setea, en prod se asume `true`.
  - `COOKIE_ACCESS_NAME`, `COOKIE_REFRESH_NAME`.

### Validacion

`validateEnv()`:

- En `test`, si falta `JWT_ACCESS_SECRET`, setea un secret fijo para evitar fallos de startup.
- Fuera de `test`, exige `DATABASE_URL` y `JWT_ACCESS_SECRET`.
- Si Zod falla, revienta el arranque con un error explicito.

## Base de datos (Prisma + Postgres)

Archivos: `prisma/schema.prisma`, `src/common/database/prisma.service.ts`, `prisma.config.ts`, `prisma/migrations/*`.

### PrismaService (singleton)

`src/common/database/prisma.service.ts`:

- Construye un `pg.Pool` con `DATABASE_URL` (o default local).
- Crea `PrismaClient` con `adapter: new PrismaPg(pool)`.
- Logging:
  - dev: `query|warn|error`.
  - prod: `warn|error`.
- Conecta en `onModuleInit()` excepto en `test`.
- En `onModuleDestroy()` desconecta Prisma y cierra el pool.

Implica: no se crean multiples clientes; Nest inyecta uno global.

### Modelo de datos (alto nivel)

`Tenant`:

- Entidad raiz de multi-tenancy. Todo cuelga del tenant.

`User` + `Membership`:

- `User` es identidad global (email unico).
- `Membership` une `User` con `Tenant` y asigna un rol (`MembershipRole`).

`RefreshToken`:

- Tokens de refresh persistidos.
- Se guarda `tokenHash` (SHA-256) en vez del token raw.
- Campos de auditoria: `expiresAt`, `revokedAt`, `lastUsedAt`.

`Branch` + `BranchInventory`:

- Sucursal y stock/precio por sucursal.
- Checkout decrementa `stockOnHand` con un guard `gte`.

`Product` + `Category` + `ProductAttributeDefinition`:

- Producto con `attributes` JSONB opcional.
- Definiciones de atributos por categoria y tenant.
- `isVisibleInTable` habilita displayAttributes en listados.

`Order` + `OrderItem` + `Invoice` + `InvoiceLine` + `Payment`:

- Base para flujo de ventas y facturacion. En este repo hoy se usan en `CartsService` (cart = Order).

### Migraciones

- `20260217154134_init_tenant_branch_domain`: crea enums y tablas base (tenants/users/memberships/branches/products/inventory/customers/orders/invoices/payments) + indices.
- `20260218100000_add_categories`: agrega `categories` y `products.category_id`.
- `20260219120000_product_custom_attributes`: agrega `ProductAttributeType`, `products.attributes` y `product_attribute_definitions`.
- `20260220192216_add_refresh_tokens`: agrega `refresh_tokens` + indices extra en products.

## Autenticacion y autorizacion

Archivos: `src/common/auth/*`.

### JWT access

- Se firma con `JWT_ACCESS_SECRET`.
- Payload (`src/common/auth/auth.types.ts`):
  - `sub` (userId)
  - `tenantId`
  - `membershipId`
  - `role`

`JwtStrategy` (`src/common/auth/jwt.strategy.ts`):

- Extrae access token de:
  1. Cookie `COOKIE_ACCESS_NAME`.
  2. Header `Authorization: Bearer ...`.
- `validate()` mapea payload a `AuthUser` (queda en `req.user`).

Tradeoff:

- `validate()` no consulta la DB (stateless). Si una membership se elimina/desactiva, los access tokens siguen siendo validos hasta expirar (default `15m`).

`JwtAuthGuard` (`src/common/auth/jwt-auth.guard.ts`) protege endpoints.

### Refresh tokens

`AuthService` (`src/common/auth/auth.service.ts`):

- `login()`:
  - Normaliza `tenantSlug` y `email`.
  - Busca tenant por slug (TenancyService).
  - Busca user por email (seleccion minima).
  - Verifica password con bcrypt.
  - Busca membership (tenant + user) y toma su rol.
  - Emite access token (JWT) y refresh token (random 32 bytes base64url).
  - Persiste el refresh token en DB como `tokenHash` sha256.
  - Limpia refresh tokens expirados del membership al emitir uno nuevo.
- `refresh()`:
  - Hashea el token recibido.
  - Valida que exista, no este revocado y no expire.
  - Busca membership y emite nuevo access token.
  - Rota refresh tokens (revoca el token viejo y emite uno nuevo en una transaccion) para evitar uso indefinido si se filtra.
  - Marca `lastUsedAt` del token viejo.
- `logout()`:
  - Revoca el token (setea `revokedAt`) via `updateMany`.

Nota: `JWT_REFRESH_SECRET` existe en env schema pero el refresh no es un JWT; hoy no se usa.

### Cookies

`auth.cookies.ts`:

- Access cookie: `path: '/'`.
- Refresh cookie: `path: '/api/v1/auth'` (solo via endpoints de auth).
- Ambas: `httpOnly: true`.
- `secure` default a `true` en prod.
- `sameSite` configurable.

Controllers:

- `POST /api/v1/auth/login` (`src/common/auth/auth.controller.ts`): setea cookies y devuelve 204.
- `POST /api/v1/auth/refresh`: lee refresh cookie, rota access + refresh cookies, 204.
- `POST /api/v1/auth/logout`: revoca token si existe y limpia cookies, 204.

### Roles

Existe infraestructura para roles:

- Decorator `@Roles(...)` (`src/common/auth/roles.decorator.ts`).
- Guard `RolesGuard` (`src/common/auth/roles.guard.ts`).

Hoy los endpoints no aplican `@UseGuards(RolesGuard)` ni `@Roles()`. Para habilitar autorizacion por rol, se agrega el guard a nivel controller o global y se anotan handlers.

## Features principales

### Onboarding inicial (tenant + admin)

Archivos: `src/onboarding/*`, doc: `docs/onboarding-initial.md`.

Endpoint publico:

- `POST /api/v1/onboarding/initial`

Flujo (service `src/onboarding/onboarding.service.ts`):

- Normaliza slug/email.
- Hashea password con bcrypt.
- Transaccion:
  - Crea tenant.
  - Crea user.
  - Crea membership OWNER.
- Emite access + refresh token via `AuthService`.

Controller (`src/onboarding/onboarding.controller.ts`):

- Setea cookies y devuelve tenant/user/membership (sin tokens en body).

### Productos (CRUD + atributos)

Archivos: `src/products/*`, doc: `docs/products-crud.md`.

Base path:

- `/api/v1/products` (JWT requerido)

Puntos importantes (service `src/products/products.service.ts`):

- Tenant scoping: todas las queries incluyen `tenantId`.
- `select` explicitos para evitar overfetch.
- Paginacion: cursor por `id` descendente (`where.id < cursor`, `orderBy id desc`, `take limit+1`).
- `attributes`:
  - Solo se aceptan primitivas (string/number/boolean) y se almacenan como JSON.
  - Se requiere `categoryId` si hay attributes.
  - Se validan keys y tipos contra `ProductAttributeDefinition`.
  - `ENUM` valida `options`.
- `displayAttributes`:
  - Solo incluye definiciones con `isVisibleInTable: true`.
  - Se calculan en base a categoria y atributos almacenados.
- Manejo de conflictos:
  - Interpreta Prisma `P2002` para devolver `409` coherente.

### Ventas: Carts (Order DRAFT) + Checkout + Invoice

Archivos: `src/modules/sales/carts/*`.

Endpoints:

- `POST /api/v1/branches/:branchId/carts` crea un cart (Order DRAFT).
- `GET /api/v1/branches/:branchId/carts/current` obtiene el cart DRAFT actual del usuario.
- `POST /api/v1/branches/:branchId/carts/current` obtiene o crea el cart DRAFT actual.
- `GET /api/v1/branches/:branchId/carts/:cartId` obtiene cart + items.
- `POST /api/v1/branches/:branchId/carts/:cartId/items` agrega item (suma cantidad si ya existe).
- `PATCH /api/v1/branches/:branchId/carts/:cartId/items/:productId` setea cantidad (0 elimina).
- `DELETE /api/v1/branches/:branchId/carts/:cartId/items/:productId` elimina item.
- `POST /api/v1/branches/:branchId/carts/:cartId/checkout` confirma (stock decrement + invoice).

Factura/Invoices:

- Checkout crea la `Invoice` en `DRAFT` y calcula IVA por linea (precios tratados como IVA incluido).
- La emision de la factura se hace por separado via `InvoicesModule`.

Detalles de integridad (service `src/modules/sales/carts/carts.service.ts`):

- Editable solo en `OrderStatus.DRAFT`.
- Un cart DRAFT se scopia por `tenantId + branchId + membershipId` (1 por usuario y sucursal).
- `addItem` y `setItemQuantity` corren en transaccion y recalculan totales.
- `checkout`:
  - Lock optimista: `updateMany` cambia `DRAFT -> PENDING` y si `count=0` falla.
  - Recalcula totals desde items para evitar totals stale.
  - Decrementa stock con `updateMany` + `stockOnHand >= qty`.
  - Crea invoice + lines (snapshot de descripcion/qty/precio + IVA desglosado por linea) en `InvoiceStatus.DRAFT`.
  - Marca order como `CONFIRMED`.

### Facturacion: Invoices (issue + PDF)

Archivos: `src/modules/sales/invoices/*`, doc: `docs/invoices.md`.

Endpoints:

- `GET /api/v1/branches/:branchId/invoices` lista facturas (cursor pagination).
- `GET /api/v1/branches/:branchId/invoices/:invoiceId` detalle.
- `POST /api/v1/branches/:branchId/invoices/:invoiceId/issue` emite la factura.
- `GET /api/v1/branches/:branchId/invoices/:invoiceId/pdf?variant=internal` genera PDF interno.

Disenio:

- `INTERNAL`: emision soportada hoy, asigna `displayNumber` secuencial por sucursal y tipo (A/B).
- `ARCA`: reservado (se agrego modelo/estructura para integrarlo sin tocar checkout).

Tradeoffs:

- Stock decrement se hace item por item dentro de la transaccion: para carritos grandes puede ser mas lento pero es correcto.

### Import/Export (products)

Archivos: `src/imports-exports/*`, docs: `docs/products-crud.md` (seccion import/export).

Disenio:

- Controller expone un API generico por entidad:
  - `POST /api/v1/imports/:entity/preview`
  - `POST /api/v1/imports/:entity/confirm`
  - `GET /api/v1/exports/:entity`
- `ImportsExportsService` resuelve un adapter por entity (`products` hoy).
- `ImportFileParserService` parsea `.xlsx` y `.csv` a `{ headers, rows }`.
- `ImportPreviewStoreService` guarda preview in-memory con TTL (15 min) y `take()` la consume (one-shot).
- `ProductsImportExportAdapter`:
  - `buildPreview`: parse + valida + calcula `willCreate/willUpdate`.
  - `confirm`: ejecuta create/update row por row usando `ProductsService`.
  - `buildExport`: arma columnas base + `attr_` dinamicas y devuelve rows.

Consideraciones de produccion:

- El preview store es in-memory: en multi-instancia o restarts se pierde. Si se escala horizontalmente, conviene Redis/DB.

## Logging

Archivo: `src/common/logging/logging.module.ts`.

- Pino HTTP logger.
- Redacta `req.headers.authorization`.
- Genera request id:
  - usa `x-request-id` si viene.
  - si no, genera UUID.

## Docker y ejecucion

`docker-compose.yml`:

- `postgres` en puerto host `5433`.
- `api`:
  - `NODE_ENV=production`.
  - `DATABASE_URL` apunta al servicio `postgres`.
  - Setea un secret dev-only para poder correr local.
  - Comando: `npm run prisma:migrate:deploy && npm run start:prod`.

`Dockerfile`:

- Instala deps con `npm ci`.
- Copia schema/migrations y corre `prisma generate` (requiere `DATABASE_URL` aunque sea dummy).
- Copia TS y hace `npm run build`.
- Runtime: corre migrations deploy y arranca.

## Tests

- Unit tests: specs en `src/**.spec.ts`. En general mockean PrismaService.
- E2E: `test/app.e2e-spec.ts` (sanity check de `GET /`).

## Extensiones y puntos de entrada

1. Nuevo modulo feature-first: crear `src/<feature>/<feature>.module.ts` + controller/service + DTOs. Importar en `src/app.module.ts`.
2. Autorizacion por roles: agregar `@UseGuards(JwtAuthGuard, RolesGuard)` y luego `@Roles('ADMIN', ...)`.
3. Nueva entidad en import/export:
   - Agregar string a `src/imports-exports/import-export.types.ts`.
   - Implementar adapter en `src/imports-exports/entities/*`.
   - Registrarlo en `ImportsExportsService`.
4. Persistencia de previews: reemplazar `ImportPreviewStoreService` por un store compartido.
