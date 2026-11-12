-- Add tenant and license identifiers plus richer audit attributes expected by the services.
ALTER TABLE "tenants"
  ADD COLUMN "licenseKey" VARCHAR(100);

CREATE UNIQUE INDEX "tenants_licenseKey_key" ON "tenants"("licenseKey");

ALTER TABLE "api_keys"
  ADD COLUMN "tenantId" VARCHAR(36);

ALTER TABLE "api_keys"
  ADD CONSTRAINT "api_keys_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "api_keys_tenantId_idx" ON "api_keys"("tenantId");

ALTER TABLE "audit_logs"
  ADD COLUMN "tenantId" VARCHAR(36),
  ADD COLUMN "entityType" VARCHAR(100),
  ADD COLUMN "entityId" VARCHAR(36),
  ADD COLUMN "changes" JSONB,
  ADD COLUMN "metadata" JSONB;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt" DESC);
