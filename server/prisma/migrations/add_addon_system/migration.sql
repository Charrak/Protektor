-- Add-on System für Zusatzverkäufe

-- Add-on Produkt-Katalog
CREATE TABLE IF NOT EXISTS "addons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL UNIQUE,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL, -- 'integration', 'automation', 'analytics', 'security', 'communication'
    "monthlyPrice" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "yearlyPrice" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "setupFee" DECIMAL(10, 2) DEFAULT 0,
    "featureKey" VARCHAR(100) NOT NULL, -- Welches Feature wird freigeschaltet
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Tenant Add-on Bestellungen (aktive Add-ons)
CREATE TABLE IF NOT EXISTS "tenant_addons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" VARCHAR(36) NOT NULL,
    "addonId" VARCHAR(36) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, CANCELED, PENDING
    "billingInterval" VARCHAR(10) NOT NULL DEFAULT 'MONTHLY', -- MONTHLY, YEARLY
    "price" DECIMAL(10, 2) NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "stripeSubscriptionItemId" VARCHAR(255),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "tenant_addons_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tenant_addons_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "addons"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Individuelle Feature-Freischaltung (für VIP-Kunden)
CREATE TABLE IF NOT EXISTS "tenant_features" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" VARCHAR(36) NOT NULL,
    "featureKey" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "grantedBy" VARCHAR(36), -- Platform Admin der das Feature freigeschaltet hat
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3), -- Optional: Ablaufdatum
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "tenant_features_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "addons_slug_idx" ON "addons"("slug");
CREATE INDEX IF NOT EXISTS "addons_category_idx" ON "addons"("category");
CREATE INDEX IF NOT EXISTS "addons_is_active_idx" ON "addons"("is_active");
CREATE INDEX IF NOT EXISTS "tenant_addons_tenant_id_idx" ON "tenant_addons"("tenantId");
CREATE INDEX IF NOT EXISTS "tenant_addons_addon_id_idx" ON "tenant_addons"("addonId");
CREATE INDEX IF NOT EXISTS "tenant_addons_status_idx" ON "tenant_addons"("status");
CREATE INDEX IF NOT EXISTS "tenant_features_tenant_id_idx" ON "tenant_features"("tenantId");
CREATE INDEX IF NOT EXISTS "tenant_features_feature_key_idx" ON "tenant_features"("featureKey");
CREATE INDEX IF NOT EXISTS "tenant_features_enabled_idx" ON "tenant_features"("enabled");
