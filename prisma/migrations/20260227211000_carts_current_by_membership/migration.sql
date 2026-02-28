-- Add created_by_membership_id to orders to support per-user carts.

ALTER TABLE "orders" ADD COLUMN "created_by_membership_id" VARCHAR(26);

ALTER TABLE "orders"
ADD CONSTRAINT "orders_created_by_membership_id_fkey"
FOREIGN KEY ("created_by_membership_id")
REFERENCES "memberships"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "orders_tenant_branch_membership_status_idx"
ON "orders"("tenant_id", "branch_id", "created_by_membership_id", "status");

-- Ensure at most one DRAFT cart per tenant+branch+membership.
CREATE UNIQUE INDEX "orders_tenant_branch_membership_draft_unique"
ON "orders"("tenant_id", "branch_id", "created_by_membership_id")
WHERE ("status" = 'DRAFT' AND "created_by_membership_id" IS NOT NULL);
