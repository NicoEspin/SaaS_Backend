-- Drop branch code field (no longer needed)

-- branches.code was originally created in the init migration.
DROP INDEX IF EXISTS "branches_tenant_id_code_key";
ALTER TABLE "branches" DROP COLUMN IF EXISTS "code";
