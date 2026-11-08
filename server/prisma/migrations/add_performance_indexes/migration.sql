-- Performance-Indexes für häufige Abfragen

-- Tenant Indexes
CREATE INDEX IF NOT EXISTS "tenant_license_status_idx" ON "tenants"("licenseStatus");
CREATE INDEX IF NOT EXISTS "tenant_created_at_idx" ON "tenants"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "tenant_contact_email_idx" ON "tenants"("contactEmail");

-- Subscription Indexes
CREATE INDEX IF NOT EXISTS "subscription_status_idx" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "subscription_tenant_idx" ON "subscriptions"("tenantId");
CREATE INDEX IF NOT EXISTS "subscription_current_period_end_idx" ON "subscriptions"("currentPeriodEnd");
CREATE INDEX IF NOT EXISTS "subscription_stripe_subscription_id_idx" ON "subscriptions"("stripeSubscriptionId");

-- Employee Indexes
CREATE INDEX IF NOT EXISTS "employee_tenant_idx" ON "employees"("tenantId");
CREATE INDEX IF NOT EXISTS "employee_status_idx" ON "employees"("status");
CREATE INDEX IF NOT EXISTS "employee_email_idx" ON "employees"("email");
CREATE INDEX IF NOT EXISTS "employee_personnel_number_idx" ON "employees"("personnelNumber");

-- Customer Indexes
CREATE INDEX IF NOT EXISTS "customer_tenant_idx" ON "customers"("tenantId");
CREATE INDEX IF NOT EXISTS "customer_status_idx" ON "customers"("status");
CREATE INDEX IF NOT EXISTS "customer_customer_number_idx" ON "customers"("customerNumber");

-- Object Indexes
CREATE INDEX IF NOT EXISTS "object_tenant_idx" ON "objects"("tenantId");
CREATE INDEX IF NOT EXISTS "object_customer_idx" ON "objects"("customerId");
CREATE INDEX IF NOT EXISTS "object_object_number_idx" ON "objects"("objectNumber");

-- Deployment Indexes
CREATE INDEX IF NOT EXISTS "deployment_tenant_idx" ON "deployments"("tenantId");
CREATE INDEX IF NOT EXISTS "deployment_employee_idx" ON "deployments"("employeeId");
CREATE INDEX IF NOT EXISTS "deployment_object_idx" ON "deployments"("objectId");
CREATE INDEX IF NOT EXISTS "deployment_date_idx" ON "deployments"("date");
CREATE INDEX IF NOT EXISTS "deployment_status_idx" ON "deployments"("status");

-- TimeEntry Indexes
CREATE INDEX IF NOT EXISTS "time_entry_tenant_idx" ON "time_entries"("tenantId");
CREATE INDEX IF NOT EXISTS "time_entry_employee_idx" ON "time_entries"("employeeId");
CREATE INDEX IF NOT EXISTS "time_entry_date_idx" ON "time_entries"("date");
CREATE INDEX IF NOT EXISTS "time_entry_status_idx" ON "time_entries"("status");

-- Usage Event Indexes
CREATE INDEX IF NOT EXISTS "usage_event_tenant_idx" ON "usage_events"("tenantId");
CREATE INDEX IF NOT EXISTS "usage_event_resource_idx" ON "usage_events"("resource");
CREATE INDEX IF NOT EXISTS "usage_event_created_at_idx" ON "usage_events"("createdAt");

-- Usage Stat Indexes
CREATE INDEX IF NOT EXISTS "usage_stat_tenant_idx" ON "usage_stats"("tenantId");
CREATE INDEX IF NOT EXISTS "usage_stat_period_idx" ON "usage_stats"("period");
CREATE INDEX IF NOT EXISTS "usage_stat_period_start_idx" ON "usage_stats"("periodStart");

-- Webhook Event Indexes
CREATE INDEX IF NOT EXISTS "webhook_event_tenant_idx" ON "webhook_events"("tenantId");
CREATE INDEX IF NOT EXISTS "webhook_event_event_type_idx" ON "webhook_events"("eventType");
CREATE INDEX IF NOT EXISTS "webhook_event_created_at_idx" ON "webhook_events"("createdAt");

-- Audit Log Indexes
CREATE INDEX IF NOT EXISTS "audit_log_tenant_idx" ON "audit_logs"("tenantId");
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_log_entity_type_idx" ON "audit_logs"("entityType");
CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx" ON "audit_logs"("createdAt" DESC);
