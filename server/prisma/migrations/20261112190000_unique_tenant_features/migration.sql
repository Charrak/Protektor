CREATE UNIQUE INDEX "tenant_features_tenantId_featureKey_key"
  ON "tenant_features"("tenantId", "featureKey");
