-- AlterTable
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "passwordResetToken" VARCHAR(255);
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "passwordResetTokenExpiry" TIMESTAMP(3);
