-- CreateEnum
CREATE TYPE "ProductAttributeType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'ENUM');

-- AlterTable
ALTER TABLE "products"
ADD COLUMN "attributes" JSONB;

-- CreateTable
CREATE TABLE "product_attribute_definitions" (
    "id" VARCHAR(26) NOT NULL,
    "tenant_id" VARCHAR(26) NOT NULL,
    "category_id" VARCHAR(26) NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "type" "ProductAttributeType" NOT NULL,
    "options" JSONB,
    "unit" VARCHAR(24),
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_visible_in_table" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_attribute_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_attribute_definitions_tenant_id_category_id_idx" ON "product_attribute_definitions"("tenant_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_attribute_definitions_tenant_id_category_id_key_key" ON "product_attribute_definitions"("tenant_id", "category_id", "key");

-- AddForeignKey
ALTER TABLE "product_attribute_definitions" ADD CONSTRAINT "product_attribute_definitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_definitions" ADD CONSTRAINT "product_attribute_definitions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
