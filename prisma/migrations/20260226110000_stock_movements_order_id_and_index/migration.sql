-- Link stock movements to orders/users + add inventory index

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN "order_id" VARCHAR(26);

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_branch_id_product_id_idx" ON "stock_movements"("tenant_id", "branch_id", "product_id");
