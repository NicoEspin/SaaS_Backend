-- Persist active branch on memberships

-- AlterTable
ALTER TABLE "memberships" ADD COLUMN "active_branch_id" VARCHAR(26);

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_active_branch_id_fkey" FOREIGN KEY ("active_branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
