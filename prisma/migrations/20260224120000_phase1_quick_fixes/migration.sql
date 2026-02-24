-- AlterTable
ALTER TABLE "products" ADD COLUMN "unit" VARCHAR(24);

-- AlterTable
ALTER TABLE "branch_inventories" ADD COLUMN "max_stock" INTEGER;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN "tax_id" VARCHAR(32);

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "notes" TEXT;
ALTER TABLE "invoices" ADD COLUMN "customer_name_snapshot" VARCHAR(200);
ALTER TABLE "invoices" ADD COLUMN "customer_tax_id_snapshot" VARCHAR(32);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "notes" TEXT;

-- CreateIndex
CREATE INDEX "orders_tenant_id_customer_id_idx" ON "orders"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_customer_id_idx" ON "invoices"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "branch_inventories_tenant_id_branch_id_stock_on_hand_idx" ON "branch_inventories"("tenant_id", "branch_id", "stock_on_hand");
