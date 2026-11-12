ALTER TYPE "ReplacementStatus" ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE "ReplacementStatus" ADD VALUE IF NOT EXISTS 'declined';

ALTER TABLE "objects"
  ADD COLUMN "accessCredentials" JSONB;
