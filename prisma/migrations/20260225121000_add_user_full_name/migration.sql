-- Add full_name to users for staff traceability

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "full_name" VARCHAR(200) NOT NULL DEFAULT '';
