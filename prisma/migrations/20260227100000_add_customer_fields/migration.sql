-- Add customer billing fields and soft-delete flag

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('RETAIL', 'WHOLESALE');
CREATE TYPE "CustomerTaxIdType" AS ENUM ('CUIT', 'CUIL', 'DNI', 'PASSPORT', 'FOREIGN');
CREATE TYPE "CustomerVatCondition" AS ENUM ('REGISTERED', 'MONOTAX', 'EXEMPT', 'FINAL_CONSUMER', 'FOREIGN');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN "type" "CustomerType" NOT NULL DEFAULT 'RETAIL';
ALTER TABLE "customers" ADD COLUMN "tax_id_type" "CustomerTaxIdType";
ALTER TABLE "customers" ADD COLUMN "vat_condition" "CustomerVatCondition";
ALTER TABLE "customers" ADD COLUMN "address" VARCHAR(300);
ALTER TABLE "customers" ADD COLUMN "notes" TEXT;
ALTER TABLE "customers" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "customers_tenant_id_tax_id_idx" ON "customers"("tenant_id", "tax_id");
CREATE INDEX "customers_tenant_id_is_active_id_idx" ON "customers"("tenant_id", "is_active", "id");
