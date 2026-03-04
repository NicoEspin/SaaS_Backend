-- AlterEnum
ALTER TYPE "StockMovementType" ADD VALUE 'PRICE_CHANGE';

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "price_after" DECIMAL(12,2),
ADD COLUMN     "price_before" DECIMAL(12,2);
