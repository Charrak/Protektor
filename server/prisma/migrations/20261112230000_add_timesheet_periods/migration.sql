-- Additive schema change: preserve existing time records and introduce a separate
-- row for each explicitly closed employee/month. No existing rows are modified.
DO $$ BEGIN
  CREATE TYPE "TimesheetPeriodStatus" AS ENUM ('closed', 'signed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "timesheet_periods" (
  "id" VARCHAR(36) NOT NULL,
  "tenantId" VARCHAR(36) NOT NULL,
  "employeeId" VARCHAR(36) NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "status" "TimesheetPeriodStatus" NOT NULL DEFAULT 'closed',
  "reportHash" VARCHAR(64) NOT NULL,
  "closedById" VARCHAR(36) NOT NULL,
  "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "signatureData" TEXT,
  "signatureHash" VARCHAR(64),
  "signedById" VARCHAR(36),
  "signedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "timesheet_periods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "timesheet_periods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "timesheet_periods_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "timesheet_periods_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "timesheet_periods_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "timesheet_periods_tenantId_employeeId_year_month_key"
  ON "timesheet_periods"("tenantId", "employeeId", "year", "month");
CREATE INDEX IF NOT EXISTS "timesheet_periods_tenantId_year_month_status_idx"
  ON "timesheet_periods"("tenantId", "year", "month", "status");

-- Add the new permission and backfill only the standard roles that need this
-- workflow. Existing explicit role-permission decisions are preserved.
INSERT INTO "permissions" ("id", "name", "slug", "module", "description", "createdAt")
VALUES (md5('permission:attendance:close_period'), 'Monatsabschluss durchführen', 'attendance:close_period', 'attendance', 'Geprüfte Stundenzettel abschließen', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "module" = EXCLUDED."module",
  "description" = EXCLUDED."description";

INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "granted")
SELECT md5(role."id" || ':' || permission."id"), role."id", permission."id", TRUE
FROM "roles" AS role
JOIN "permissions" AS permission ON permission."slug" = 'attendance:close_period'
WHERE role."slug" IN ('dispatcher', 'accountant')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Accounting needs attendance visibility to verify/close all employee periods.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "granted")
SELECT md5(role."id" || ':' || permission."id"), role."id", permission."id", TRUE
FROM "roles" AS role
JOIN "permissions" AS permission ON permission."slug" IN ('attendance:view', 'attendance:view_all')
WHERE role."slug" = 'accountant'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
