-- UsageEvent Table
CREATE TABLE IF NOT EXISTS "usage_events" (
    "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" VARCHAR(36) NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "trackedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- UsageStat Table
CREATE TABLE IF NOT EXISTS "usage_stats" (
    "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" VARCHAR(36) NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "period" DATE NOT NULL,
    "periodType" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "usage_stats_tenantId_resource_action_period_key" UNIQUE("tenantId", "resource", "action", "period")
);

-- Allowance Table
CREATE TABLE IF NOT EXISTS "allowances" (
    "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" VARCHAR(36) NOT NULL,
    "employeeId" VARCHAR(36) NOT NULL,
    "date" DATE NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "allowances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Webhook Table
CREATE TABLE IF NOT EXISTS "webhooks" (
    "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" VARCHAR(36) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "secret" VARCHAR(255) NOT NULL,
    "events" VARCHAR(100)[] NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTrigger" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- WebhookEvent Table
CREATE TABLE IF NOT EXISTS "webhook_events" (
    "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" VARCHAR(36),
    "stripeEventId" VARCHAR(255) NOT NULL UNIQUE,
    "eventType" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes für UsageEvent
CREATE INDEX IF NOT EXISTS "usage_events_tenantId_trackedAt_idx" ON "usage_events"("tenantId", "trackedAt");

-- Indexes für UsageStat
CREATE INDEX IF NOT EXISTS "usage_stats_tenantId_period_idx" ON "usage_stats"("tenantId", "period");

-- Indexes für Allowance
CREATE INDEX IF NOT EXISTS "allowances_tenantId_date_idx" ON "allowances"("tenantId", "date");

-- Indexes für Webhook
CREATE INDEX IF NOT EXISTS "webhooks_tenantId_idx" ON "webhooks"("tenantId");

-- Indexes für WebhookEvent
CREATE INDEX IF NOT EXISTS "webhook_events_tenantId_idx" ON "webhook_events"("tenantId");
