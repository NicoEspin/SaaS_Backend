-- CreateEnum
CREATE TYPE "InvoiceMode" AS ENUM ('INTERNAL', 'ARCA');

-- CreateEnum
CREATE TYPE "InvoiceDocType" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "InvoiceFiscalProvider" AS ENUM ('ARCA');

-- CreateEnum
CREATE TYPE "InvoiceFiscalStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'REJECTED');

-- AlterTable
ALTER TABLE "invoice_lines" ADD COLUMN     "net_line_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "net_unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "product_code_snapshot" VARCHAR(64),
ADD COLUMN     "vat_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vat_rate" DECIMAL(6,4) NOT NULL DEFAULT 0.21;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "customer_address_snapshot" VARCHAR(300),
ADD COLUMN     "customer_tax_id_type_snapshot" "CustomerTaxIdType",
ADD COLUMN     "customer_vat_condition_snapshot" "CustomerVatCondition",
ADD COLUMN     "display_number" VARCHAR(64),
ADD COLUMN     "doc_type" "InvoiceDocType",
ADD COLUMN     "fiscal_number" INTEGER,
ADD COLUMN     "mode" "InvoiceMode",
ADD COLUMN     "net_subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "point_of_sale" INTEGER;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "vat_rate" DECIMAL(6,4) NOT NULL DEFAULT 0.21;

-- CreateTable
CREATE TABLE "invoice_fiscals" (
    "invoice_id" VARCHAR(26) NOT NULL,
    "tenant_id" VARCHAR(26) NOT NULL,
    "provider" "InvoiceFiscalProvider" NOT NULL,
    "status" "InvoiceFiscalStatus" NOT NULL DEFAULT 'PENDING',
    "cae" VARCHAR(32),
    "cae_expires_at" TIMESTAMP(3),
    "authorized_at" TIMESTAMP(3),
    "qr_payload" TEXT,
    "request_json" JSONB,
    "response_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_fiscals_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "id" VARCHAR(26) NOT NULL,
    "tenant_id" VARCHAR(26) NOT NULL,
    "branch_id" VARCHAR(26) NOT NULL,
    "mode" "InvoiceMode" NOT NULL,
    "docType" "InvoiceDocType" NOT NULL,
    "next_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_billing_profiles" (
    "id" VARCHAR(26) NOT NULL,
    "tenant_id" VARCHAR(26) NOT NULL,
    "legal_name" VARCHAR(200) NOT NULL,
    "tax_id" VARCHAR(32) NOT NULL,
    "vat_condition" "CustomerVatCondition",
    "address" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_billing_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_fiscal_settings" (
    "id" VARCHAR(26) NOT NULL,
    "tenant_id" VARCHAR(26) NOT NULL,
    "branch_id" VARCHAR(26) NOT NULL,
    "point_of_sale" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_fiscal_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_fiscals_tenant_id_idx" ON "invoice_fiscals"("tenant_id");

-- CreateIndex
CREATE INDEX "invoice_sequences_tenant_id_branch_id_idx" ON "invoice_sequences"("tenant_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_sequences_tenant_id_branch_id_mode_docType_key" ON "invoice_sequences"("tenant_id", "branch_id", "mode", "docType");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_billing_profiles_tenant_id_key" ON "tenant_billing_profiles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_fiscal_settings_branch_id_key" ON "branch_fiscal_settings"("branch_id");

-- CreateIndex
CREATE INDEX "branch_fiscal_settings_tenant_id_branch_id_idx" ON "branch_fiscal_settings"("tenant_id", "branch_id");

-- AddForeignKey
ALTER TABLE "invoice_fiscals" ADD CONSTRAINT "invoice_fiscals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_fiscals" ADD CONSTRAINT "invoice_fiscals_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_sequences" ADD CONSTRAINT "invoice_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_sequences" ADD CONSTRAINT "invoice_sequences_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_billing_profiles" ADD CONSTRAINT "tenant_billing_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_fiscal_settings" ADD CONSTRAINT "branch_fiscal_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_fiscal_settings" ADD CONSTRAINT "branch_fiscal_settings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
