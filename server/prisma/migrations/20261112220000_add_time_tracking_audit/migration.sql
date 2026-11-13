-- Additive migration: retain existing time records and snapshot only their
-- current values. Rows that already have correction history are left without
-- a fabricated original snapshot; their prior history remains in time_corrections.
ALTER TYPE "TimeRecordStatus" ADD VALUE IF NOT EXISTS 'corrected';
ALTER TYPE "TimeRecordStatus" ADD VALUE IF NOT EXISTS 'released';
ALTER TYPE "TimeRecordStatus" ADD VALUE IF NOT EXISTS 'billed';
ALTER TYPE "TimeRecordStatus" ADD VALUE IF NOT EXISTS 'voided';
ALTER TYPE "TimeRecordSource" ADD VALUE IF NOT EXISTS 'terminal';
ALTER TYPE "TimeRecordSource" ADD VALUE IF NOT EXISTS 'web';

ALTER TABLE "time_records"
  ADD COLUMN IF NOT EXISTS "originalClockIn" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "originalClockOut" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "originalBreakDuration" INTEGER,
  ADD COLUMN IF NOT EXISTS "correctedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "correctionReasonCategory" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "voidedById" VARCHAR(36),
  ADD COLUMN IF NOT EXISTS "voidReason" TEXT,
  ADD COLUMN IF NOT EXISTS "clockInLatitude" DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS "clockInLongitude" DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS "clockOutLatitude" DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS "clockOutLongitude" DECIMAL(10,7);

DO $$ BEGIN
  ALTER TABLE "time_records" ADD CONSTRAINT "time_records_voidedById_fkey"
    FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "time_corrections"
  ALTER COLUMN "oldValue" TYPE TEXT,
  ALTER COLUMN "newValue" TYPE TEXT,
  ADD COLUMN IF NOT EXISTS "reasonCategory" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "proposedValues" JSONB,
  ADD COLUMN IF NOT EXISTS "requestStatus" VARCHAR(20) NOT NULL DEFAULT 'applied',
  ADD COLUMN IF NOT EXISTS "resolutionComment" TEXT;

-- Preserve existing records exactly; snapshot unaffected records for future
-- comparisons. Existing corrections remain visible in their existing history.
UPDATE "time_records" AS record
SET "originalClockIn" = record."clockIn",
    "originalClockOut" = record."clockOut",
    "originalBreakDuration" = record."breakDuration"
WHERE NOT EXISTS (
  SELECT 1 FROM "time_corrections" AS correction
  WHERE correction."timeRecordId" = record."id"
);

CREATE TABLE IF NOT EXISTS "time_record_audit_events" (
  "id" VARCHAR(36) NOT NULL,
  "tenantId" VARCHAR(36) NOT NULL,
  "timeRecordId" VARCHAR(36) NOT NULL,
  "actorUserId" VARCHAR(36),
  "actorName" VARCHAR(200) NOT NULL,
  "actorRole" VARCHAR(50) NOT NULL,
  "action" VARCHAR(40) NOT NULL,
  "employeeId" VARCHAR(36) NOT NULL,
  "employeeName" VARCHAR(200) NOT NULL,
  "objectId" VARCHAR(36),
  "objectName" VARCHAR(200),
  "recordDate" DATE NOT NULL,
  "fieldChanged" VARCHAR(80),
  "oldValue" JSONB,
  "newValue" JSONB,
  "reasonCategory" VARCHAR(80),
  "comment" TEXT,
  "ipAddress" VARCHAR(45),
  "deviceInfo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "time_record_audit_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "time_record_audit_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "time_record_audit_events_timeRecordId_fkey" FOREIGN KEY ("timeRecordId") REFERENCES "time_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "time_record_audit_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "time_record_audit_events_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "time_record_audit_events_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "objects"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "time_record_audit_events_tenantId_createdAt_idx" ON "time_record_audit_events"("tenantId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "time_record_audit_events_timeRecordId_createdAt_idx" ON "time_record_audit_events"("timeRecordId", "createdAt");
CREATE INDEX IF NOT EXISTS "time_record_audit_events_employeeId_recordDate_idx" ON "time_record_audit_events"("employeeId", "recordDate");
CREATE INDEX IF NOT EXISTS "time_record_audit_events_objectId_recordDate_idx" ON "time_record_audit_events"("objectId", "recordDate");
CREATE INDEX IF NOT EXISTS "time_record_audit_events_actorUserId_createdAt_idx" ON "time_record_audit_events"("actorUserId", "createdAt");

CREATE TABLE IF NOT EXISTS "time_record_accesses" (
  "id" VARCHAR(36) NOT NULL,
  "tenantId" VARCHAR(36) NOT NULL,
  "userId" VARCHAR(36) NOT NULL,
  "objectId" VARCHAR(36) NOT NULL,
  "canEdit" BOOLEAN NOT NULL DEFAULT FALSE,
  "canApprove" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "time_record_accesses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "time_record_accesses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "time_record_accesses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "time_record_accesses_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "time_record_accesses_tenantId_userId_objectId_key" ON "time_record_accesses"("tenantId", "userId", "objectId");
CREATE INDEX IF NOT EXISTS "time_record_accesses_tenantId_objectId_idx" ON "time_record_accesses"("tenantId", "objectId");

-- Original punch values are immutable once captured.
CREATE OR REPLACE FUNCTION protektor_time_record_original_values_immutable() RETURNS trigger AS $$
BEGIN
  IF (OLD."originalClockIn" IS NOT NULL AND NEW."originalClockIn" IS DISTINCT FROM OLD."originalClockIn")
     OR (OLD."originalClockOut" IS NOT NULL AND NEW."originalClockOut" IS DISTINCT FROM OLD."originalClockOut")
     OR (OLD."originalBreakDuration" IS NOT NULL AND NEW."originalBreakDuration" IS DISTINCT FROM OLD."originalBreakDuration") THEN
    RAISE EXCEPTION 'Original time record values are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS "time_records_original_values_immutable" ON "time_records";
CREATE TRIGGER "time_records_original_values_immutable"
BEFORE UPDATE ON "time_records"
FOR EACH ROW EXECUTE FUNCTION protektor_time_record_original_values_immutable();

-- Keep the audit stream append-only even if a future route is accidentally added.
CREATE OR REPLACE FUNCTION protektor_time_record_audit_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Time record audit events are append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS "time_record_audit_events_immutable" ON "time_record_audit_events";
CREATE TRIGGER "time_record_audit_events_immutable"
BEFORE UPDATE OR DELETE ON "time_record_audit_events"
FOR EACH ROW EXECUTE FUNCTION protektor_time_record_audit_immutable();

-- Preserve historical corrections in the new searchable audit stream as well.
INSERT INTO "time_record_audit_events" (
  "id", "tenantId", "timeRecordId", "actorUserId", "actorName", "actorRole",
  "action", "employeeId", "employeeName", "objectId", "objectName", "recordDate",
  "fieldChanged", "oldValue", "newValue", "reasonCategory", "comment", "createdAt"
)
SELECT
  md5(correction."id" || ':time-record-audit'), record."tenantId", record."id", correction."correctedById",
  COALESCE(NULLIF(BTRIM(COALESCE(actor."firstName", '') || ' ' || COALESCE(actor."lastName", '')), ''), 'Unbekannt'),
  COALESCE(role."slug", 'unknown'), 'corrected', record."employeeId",
  BTRIM(employee."firstName" || ' ' || employee."lastName"), record."objectId", object."name", record."date",
  correction."fieldChanged", to_jsonb(correction."oldValue"), to_jsonb(correction."newValue"),
  correction."reasonCategory", correction."reason", correction."createdAt"
FROM "time_corrections" correction
JOIN "time_records" record ON record."id" = correction."timeRecordId"
JOIN "employees" employee ON employee."id" = record."employeeId"
LEFT JOIN "users" actor ON actor."id" = correction."correctedById"
LEFT JOIN "roles" role ON role."id" = actor."roleId"
LEFT JOIN "objects" object ON object."id" = record."objectId"
ON CONFLICT ("id") DO NOTHING;
