-- DropIndex
DROP INDEX "orders_tenant_id_branch_id_number_key";

-- CreateIndex
CREATE UNIQUE INDEX "orders_tenant_id_number_key" ON "orders"("tenant_id", "number");

-- DropIndex
DROP INDEX "invoices_tenant_id_branch_id_number_key";

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenant_id_number_key" ON "invoices"("tenant_id", "number");
