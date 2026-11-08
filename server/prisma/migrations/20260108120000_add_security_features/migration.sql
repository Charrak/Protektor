-- Add Security Features for Security Companies

-- AlterTable: Employee security fields
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "bewachungserlaubnisNr" VARCHAR(100);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "bewachungserlaubnisExpiry" DATE;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "waffensachkunde" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "waffensachkundeExpiry" DATE;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "ersteHilfeCertified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "ersteHilfeExpiry" DATE;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "sicherheitsstufe" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "fuehrungszeugnisDatum" DATE;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "zuverlaessigkeetspruefung" DATE;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "unterweisungDatum" DATE;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "hundefuehrer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "brandschutzbeauftragter" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "ersteHilfeTrainer" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Security Keys
CREATE TABLE IF NOT EXISTS "security_keys" (
    "id" TEXT NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL,
    "objectId" VARCHAR(36) NOT NULL,
    "keyNumber" VARCHAR(100) NOT NULL,
    "keyType" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "totalCopies" INTEGER NOT NULL DEFAULT 1,
    "assignedTo" VARCHAR(36),
    "assignedDate" DATE,
    "returnDate" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "security_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Security Incidents
CREATE TABLE IF NOT EXISTS "security_incidents" (
    "id" TEXT NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL,
    "objectId" VARCHAR(36),
    "deploymentId" VARCHAR(36),
    "reportedById" VARCHAR(36) NOT NULL,
    "incidentType" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "location" VARCHAR(200),
    "occurredAt" TIMESTAMP NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" VARCHAR(36),
    "resolution" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "policeReported" BOOLEAN NOT NULL DEFAULT false,
    "policeCaseNr" VARCHAR(100),
    "insuranceReported" BOOLEAN NOT NULL DEFAULT false,
    "insuranceCaseNr" VARCHAR(100),
    "photos" JSONB,
    "witnesses" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "security_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Emergency Protocols
CREATE TABLE IF NOT EXISTS "emergency_protocols" (
    "id" TEXT NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL,
    "objectId" VARCHAR(36),
    "protocolType" VARCHAR(100) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "emergencyContacts" JSONB NOT NULL,
    "evacuationRoutes" JSONB,
    "assemblyPoints" JSONB,
    "lastDrillDate" DATE,
    "nextDrillDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "emergency_protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Access Permissions
CREATE TABLE IF NOT EXISTS "access_permissions" (
    "id" TEXT NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL,
    "employeeId" VARCHAR(36) NOT NULL,
    "objectId" VARCHAR(36) NOT NULL,
    "permissionType" VARCHAR(30) NOT NULL DEFAULT 'FULL_ACCESS',
    "validFrom" DATE NOT NULL,
    "validUntil" DATE,
    "timeRestrictions" JSONB,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" VARCHAR(36),
    "revocationReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "access_permissions_pkey" PRIMARY KEY ("id")
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS "security_keys_tenantId_status_idx" ON "security_keys"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "security_keys_assignedTo_idx" ON "security_keys"("assignedTo");

CREATE INDEX IF NOT EXISTS "security_incidents_tenantId_status_idx" ON "security_incidents"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "security_incidents_type_severity_idx" ON "security_incidents"("incidentType", "severity");
CREATE INDEX IF NOT EXISTS "security_incidents_occurredAt_idx" ON "security_incidents"("occurredAt");

CREATE INDEX IF NOT EXISTS "emergency_protocols_tenantId_isActive_idx" ON "emergency_protocols"("tenantId", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "access_permissions_employeeId_objectId_key" ON "access_permissions"("employeeId", "objectId");
CREATE INDEX IF NOT EXISTS "access_permissions_tenantId_isRevoked_idx" ON "access_permissions"("tenantId", "isRevoked");
