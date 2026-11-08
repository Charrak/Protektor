# SMS – Datenbankkonzept

**Version:** 1.0.0
**Datum:** 2026-11-08

---

## 1. Übersicht aller Tabellen

| #  | Tabelle              | Beschreibung                              |
|----|----------------------|-------------------------------------------|
| 1  | User                 | Systembenutzer (Login)                    |
| 2  | Role                 | Benutzerrollen                            |
| 3  | Permission           | Einzelne Berechtigungen                   |
| 4  | RolePermission       | Zuordnung Rolle → Berechtigung            |
| 5  | Employee             | Mitarbeiter (Sicherheitspersonal)         |
| 6  | Qualification        | Qualifikationsarten (z.B. §34a, Waffensachkunde) |
| 7  | EmployeeQualification| Zugewiesene Qualifikationen pro MA        |
| 8  | EmployeeDocument     | Dokumente pro Mitarbeiter                 |
| 9  | Availability         | Verfügbarkeiten / Abwesenheiten           |
| 10 | Customer             | Kunden                                    |
| 11 | ContactPerson        | Ansprechpartner beim Kunden               |
| 12 | Object               | Bewachungsobjekte                         |
| 13 | ObjectRequirement    | Anforderungen pro Objekt (Qualifikationen)|
| 14 | CustomerRate         | Kundenspezifische Stundensätze            |
| 15 | Deployment           | Einsätze / Dienstplan-Einträge            |
| 16 | Shift                | Schicht-Definitionen                      |
| 17 | TimeRecord           | Zeiterfassung                             |
| 18 | Break                | Pausenerfassung                           |
| 19 | EmployeeRate         | Mitarbeitervergütung                      |
| 20 | CustomerInvoice      | Kundenrechnungen                          |
| 21 | InvoicePosition      | Rechnungspositionen                       |
| 22 | Lock                 | Bearbeitungssperren                       |
| 23 | AuditLog             | Änderungsprotokoll                        |
| 24 | Session              | Aktive Sitzungen                          |
| 25 | Notification         | Systembenachrichtigungen                  |
| 26 | Holiday              | Feiertage (nach Bundesland)               |
| 27 | ReplacementRequest   | Ersatzpersonalanfragen                    |

---

## 2. Tabellen-Detail

### 2.1 User (Systembenutzer)

```
User
├── id              UUID (PK)
├── username        VARCHAR(100) UNIQUE NOT NULL
├── email           VARCHAR(255) UNIQUE NOT NULL
├── passwordHash    VARCHAR(255) NOT NULL
├── firstName       VARCHAR(100) NOT NULL
├── lastName        VARCHAR(100) NOT NULL
├── roleId          UUID (FK → Role)
├── isActive        BOOLEAN DEFAULT TRUE
├── lastLogin       TIMESTAMP
├── failedLogins    INTEGER DEFAULT 0
├── lockedUntil     TIMESTAMP (NULL)
├── createdAt       TIMESTAMP DEFAULT NOW()
├── updatedAt       TIMESTAMP DEFAULT NOW()
└── deletedAt       TIMESTAMP (NULL) -- Soft Delete
```

### 2.2 Role (Benutzerrollen)

```
Role
├── id              UUID (PK)
├── name            VARCHAR(50) UNIQUE NOT NULL
├── slug            VARCHAR(50) UNIQUE NOT NULL
├── description     TEXT
├── isSystem        BOOLEAN DEFAULT FALSE  -- Systemrollen nicht löschbar
├── createdAt       TIMESTAMP DEFAULT NOW()
└── updatedAt       TIMESTAMP DEFAULT NOW()
```

Vordefinierte Rollen:
- `administrator` – Volle Systemrechte
- `management` – Geschäftsführung
- `dispatch` – Disposition
- `hr` – Personalverwaltung
- `accounting` – Buchhaltung
- `field_supervisor` – Einsatzleitung
- `employee` – Mitarbeiter (Eigenauskunft)

### 2.3 Permission (Berechtigungen)

```
Permission
├── id              UUID (PK)
├── name            VARCHAR(100) UNIQUE NOT NULL
├── slug            VARCHAR(100) UNIQUE NOT NULL
├── module          VARCHAR(50) NOT NULL  -- Modulzugehörigkeit
├── description     TEXT
└── createdAt       TIMESTAMP DEFAULT NOW()
```

Berechtigungsstruktur (Beispiele):
```
employees:view, employees:create, employees:edit, employees:delete
customers:view, customers:create, customers:edit, customers:delete
objects:view, objects:create, objects:edit, objects:delete
deployments:view, deployments:create, deployments:edit, deployments:delete
scheduling:view, scheduling:create, scheduling:edit, scheduling:approve
attendance:view, attendance:create, attendance:edit, attendance:approve
billing:employee_rates, billing:customer_rates, billing:invoices, billing:payroll
reports:view, reports:export
admin:users, admin:roles, admin:audit, admin:settings, admin:backup
```

### 2.4 RolePermission

```
RolePermission
├── id              UUID (PK)
├── roleId          UUID (FK → Role) NOT NULL
├── permissionId    UUID (FK → Permission) NOT NULL
├── granted         BOOLEAN DEFAULT TRUE
└── UNIQUE(roleId, permissionId)
```

### 2.5 Employee (Mitarbeiter)

```
Employee
├── id                  UUID (PK)
├── personnelNumber     VARCHAR(50) UNIQUE NOT NULL
├── firstName           VARCHAR(100) NOT NULL
├── lastName            VARCHAR(100) NOT NULL
├── dateOfBirth         DATE
├── gender              ENUM('male', 'female', 'diverse')
├── street              VARCHAR(200)
├── zipCode             VARCHAR(20)
├── city                VARCHAR(100)
├── country             VARCHAR(100) DEFAULT 'DE'
├── phone               VARCHAR(50)
├── mobile              VARCHAR(50)
├── email               VARCHAR(255)
├── bankName            VARCHAR(100)
├── iban                VARCHAR(34)
├── bic                 VARCHAR(11)
├── taxId               VARCHAR(20)
├── socialInsuranceId   VARCHAR(30)
├── healthInsurance     VARCHAR(100)
├── healthInsuranceId   VARCHAR(30)
├── employmentType      ENUM('full_time', 'part_time', 'mini_job', 'freelance')
├── weeklyHours         DECIMAL(5,2)
├── contractStart       DATE
├── contractEnd         DATE (NULL)
├── hourlyRateBase      DECIMAL(8,2)
├── surchargeNight      DECIMAL(5,2)  -- Prozent
├── surchargeSunday     DECIMAL(5,2)
├── surchargeHoliday    DECIMAL(5,2)
├── maxHoursPerDay      DECIMAL(4,2) DEFAULT 10.00
├── maxHoursPerWeek     DECIMAL(5,2) DEFAULT 48.00
├── preferredRegion     VARCHAR(100)
├── notes               TEXT
├── photoUrl            VARCHAR(500)
├── status              ENUM('active', 'inactive', 'on_leave', 'terminated')
├── createdAt           TIMESTAMP DEFAULT NOW()
├── updatedAt           TIMESTAMP DEFAULT NOW()
├── deletedAt           TIMESTAMP (NULL)
```

### 2.6 Qualification (Qualifikationsarten)

```
Qualification
├── id              UUID (PK)
├── name            VARCHAR(200) NOT NULL
├── description     TEXT
├── category        VARCHAR(50)   -- z.B. 'gesetzlich', 'intern', 'waffen'
├── validityDays    INTEGER       -- NULL = unbegrenzt gültig
├── requiresRenewal BOOLEAN DEFAULT TRUE
├── color           VARCHAR(7)    -- Hex-Farbe für UI
├── createdAt       TIMESTAMP DEFAULT NOW()
└── updatedAt       TIMESTAMP DEFAULT NOW()
```

Beispielqualifikationen:
- §34a GewO Unterrichtung
- §34a GewO Sachkundeprüfung
- Bewachungsunternehmer
- Waffensachkunde §7
- Ersthelfer-Ausbildung
- Brandschutzhelfer
- Pfortenschein
- Flughafen-Luftsicherheit
- Objekt-specific (z.B. "Kunde XY eingewiesen")

### 2.7 EmployeeQualification

```
EmployeeQualification
├── id              UUID (PK)
├── employeeId      UUID (FK → Employee) NOT NULL
├── qualificationId UUID (FK → Qualification) NOT NULL
├── obtainedDate    DATE NOT NULL
├── expiryDate      DATE (NULL)  -- NULL = unbegrenzt
├── certificateNumber VARCHAR(100)
├── documentUrl     VARCHAR(500)
├── isVerified      BOOLEAN DEFAULT FALSE
├── verifiedBy      UUID (FK → User)
├── verifiedAt      TIMESTAMP
├── notes           TEXT
├── createdAt       TIMESTAMP DEFAULT NOW()
├── updatedAt       TIMESTAMP DEFAULT NOW()
└── UNIQUE(employeeId, qualificationId)
```

### 2.8 EmployeeDocument

```
EmployeeDocument
├── id              UUID (PK)
├── employeeId      UUID (FK → Employee) NOT NULL
├── fileName        VARCHAR(255) NOT NULL
├── fileUrl         VARCHAR(500) NOT NULL
├── fileSize        INTEGER
├── mimeType        VARCHAR(100)
├── category        VARCHAR(50)  -- 'vertrag', 'qualifikation', 'sonstiges'
├── uploadedBy      UUID (FK → User)
├── createdAt       TIMESTAMP DEFAULT NOW()
```

### 2.9 Availability (Verfügbarkeiten)

```
Availability
├── id              UUID (PK)
├── employeeId      UUID (FK → Employee) NOT NULL
├── type            ENUM('available', 'vacation', 'sick', 'personal', 'training', 'other')
├── startDate       DATE NOT NULL
├── endDate         DATE NOT NULL
├── allDay          BOOLEAN DEFAULT TRUE
├── startTime       TIME (NULL)
├── endTime         TIME (NULL)
├── reason          TEXT
├── approvedBy      UUID (FK → User) (NULL)
├── status          ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
├── createdAt       TIMESTAMP DEFAULT NOW()
├── updatedAt       TIMESTAMP DEFAULT NOW()
```

### 2.10 Customer (Kunden)

```
Customer
├── id              UUID (PK)
├── customerNumber  VARCHAR(50) UNIQUE NOT NULL
├── companyName     VARCHAR(200) NOT NULL
├── department      VARCHAR(100)
├── street          VARCHAR(200)
├── zipCode         VARCHAR(20)
├── city            VARCHAR(100)
├── country         VARCHAR(100) DEFAULT 'DE'
├── phone           VARCHAR(50)
├── fax             VARCHAR(50)
├── email           VARCHAR(255)
├── website         VARCHAR(255)
├── taxNumber       VARCHAR(50)
├── vatId           VARCHAR(50)
├── billingAddress  TEXT  -- abweichende Rechnungsadresse (JSON)
├── paymentTerms    INTEGER DEFAULT 14  -- Tage
├── notes           TEXT
├── status          ENUM('active', 'inactive', 'prospect') DEFAULT 'active'
├── createdAt       TIMESTAMP DEFAULT NOW()
├── updatedAt       TIMESTAMP DEFAULT NOW()
├── deletedAt       TIMESTAMP (NULL)
```

### 2.11 ContactPerson (Ansprechpartner)

```
ContactPerson
├── id              UUID (PK)
├── customerId      UUID (FK → Customer) NOT NULL
├── firstName       VARCHAR(100) NOT NULL
├── lastName        VARCHAR(100) NOT NULL
├── role            VARCHAR(100)
├── phone           VARCHAR(50)
├── mobile          VARCHAR(50)
├── email           VARCHAR(255)
├── isPrimary       BOOLEAN DEFAULT FALSE
├── notes           TEXT
├── createdAt       TIMESTAMP DEFAULT NOW()
└── updatedAt       TIMESTAMP DEFAULT NOW()
```

### 2.12 Object (Bewachungsobjekte)

```
Object
├── id              UUID (PK)
├── objectNumber    VARCHAR(50) UNIQUE NOT NULL
├── customerId      UUID (FK → Customer) NOT NULL
├── name            VARCHAR(200) NOT NULL
├── street          VARCHAR(200)
├── zipCode         VARCHAR(20)
├── city            VARCHAR(100)
├── description     TEXT
├── objectType      VARCHAR(50)  -- 'gebäude', 'gelände', 'veranstaltung', 'baustelle'
├── contactPersonId UUID (FK → ContactPerson)
├── alarmNumber     VARCHAR(50)
├── keyDepot        TEXT
├── accessCode      VARCHAR(100)
├── specialInstructions TEXT
├── isActive        BOOLEAN DEFAULT TRUE
├── createdAt       TIMESTAMP DEFAULT NOW()
└── updatedAt       TIMESTAMP DEFAULT NOW()
```

### 2.13 ObjectRequirement (Objekt-Anforderungen)

```
ObjectRequirement
├── id              UUID (PK)
├── objectId        UUID (FK → Object) NOT NULL
├── qualificationId UUID (FK → Qualification) NOT NULL
├── isMandatory     BOOLEAN DEFAULT TRUE
├── notes           TEXT
├── createdAt       TIMESTAMP DEFAULT NOW()
└── UNIQUE(objectId, qualificationId)
```

### 2.14 CustomerRate (Kundenstundensätze)

```
CustomerRate
├── id              UUID (PK)
├── customerId      UUID (FK → Customer) NOT NULL
├── objectId        UUID (FK → Object) (NULL)  -- NULL = für alle Objekte des Kunden
├── serviceType     VARCHAR(50) NOT NULL  -- 'object_guard', 'event_security', etc.
├── rateNormal      DECIMAL(8,2) NOT NULL
├── rateNight       DECIMAL(8,2)
├── rateSunday      DECIMAL(8,2)
├── rateHoliday     DECIMAL(8,2)
├── validFrom       DATE NOT NULL
├── validUntil      DATE (NULL)
├── createdAt       TIMESTAMP DEFAULT NOW()
└── updatedAt       TIMESTAMP DEFAULT NOW()
```

### 2.15 Deployment (Einsätze / Dienstplan-Einträge)

```
Deployment
├── id              UUID (PK)
├── objectId        UUID (FK → Object) NOT NULL
├── employeeId      UUID (FK → Employee) NOT NULL
├── date            DATE NOT NULL
├── shiftId         UUID (FK → Shift) (NULL)
├── startTime       TIME NOT NULL
├── endTime         TIME NOT NULL
├── breakMinutes    INTEGER DEFAULT 0
├── isNightShift    BOOLEAN DEFAULT FALSE
├── isSunday        BOOLEAN DEFAULT FALSE
├── isHoliday       BOOLEAN DEFAULT FALSE
├── status          ENUM('planned', 'confirmed', 'cancelled', 'completed', 'no_show') DEFAULT 'planned'
├── confirmedBy     UUID (FK → Employee) (NULL)  -- Mitarbeiter-Bestätigung
├── confirmedAt     TIMESTAMP
├── cancelledBy     UUID (FK → User) (NULL)
├── cancelledAt     TIMESTAMP
├── cancellationReason TEXT
├── replacementId   UUID (FK → Deployment) (NULL)  -- Ersatzeinsatz
├── plannedBy       UUID (FK → User) NOT NULL
├── notes           TEXT
├── version         INTEGER DEFAULT 1
├── createdAt       TIMESTAMP DEFAULT NOW()
└── updatedAt       TIMESTAMP DEFAULT NOW()
```

### 2.16 Shift (Schicht-Definitionen)

```
Shift
├── id              UUID (PK)
├── name            VARCHAR(100) NOT NULL   -- z.B. "Frühschicht", "Nachtschicht"
├── startTime       TIME NOT NULL
├── endTime         TIME NOT NULL
├── breakMinutes    INTEGER DEFAULT 0
├── isNightShift    BOOLEAN DEFAULT FALSE
├── color           VARCHAR(7)  -- Hex-Farbe
├── isActive        BOOLEAN DEFAULT TRUE
├── createdAt       TIMESTAMP DEFAULT NOW()
└── updatedAt       TIMESTAMP DEFAULT NOW()
```

### 2.17 TimeRecord (Zeiterfassung)

```
TimeRecord
├── id              UUID (PK)
├── employeeId      UUID (FK → Employee) NOT NULL
├── deploymentId    UUID (FK → Deployment) (NULL)
├── date            DATE NOT NULL
├── clockIn         TIMESTAMP NOT NULL
├── clockOut        TIMESTAMP (NULL)
├── breakStart      TIMESTAMP (NULL)
├── breakEnd        TIMESTAMP (NULL)
├── breakDuration   INTEGER DEFAULT 0  -- Minuten
├── regularHours    DECIMAL(5,2)
├── nightHours      DECIMAL(5,2)
├── sundayHours     DECIMAL(5,2)
├── holidayHours    DECIMAL(5,2)
├── overtimeHours   DECIMAL(5,2)
├── totalHours      DECIMAL(5,2)
├── status          ENUM('open', 'completed', 'approved', 'rejected') DEFAULT 'open'
├── approvedBy      UUID (FK → User) (NULL)
├── approvedAt      TIMESTAMP
├── correctionReason TEXT  -- bei Korrektur
├── correctedBy     UUID (FK → User) (NULL)
├── createdAt       TIMESTAMP DEFAULT NOW()
└── updatedAt       TIMESTAMP DEFAULT NOW()
```

### 2.18 Break (Pausen)

```
Break
├── id              UUID (PK)
├── timeRecordId    UUID (FK → TimeRecord) NOT NULL
├── breakStart      TIMESTAMP NOT NULL
├── breakEnd        TIMESTAMP (NULL)
├── durationMinutes INTEGER
├── createdAt       TIMESTAMP DEFAULT NOW()
```

### 2.19 EmployeeRate (Mitarbeitervergütung)

```
EmployeeRate
├── id              UUID (PK)
├── employeeId      UUID (FK → Employee) NOT NULL
├── rateBase        DECIMAL(8,2) NOT NULL
├── rateNight       DECIMAL(8,2)  -- absolut oder Prozent je nach Konfiguration
├── rateSunday      DECIMAL(8,2)
├── rateHoliday     DECIMAL(8,2)
├── surchargeType   ENUM('absolute', 'percentage') DEFAULT 'percentage'
├── validFrom       DATE NOT NULL
├── validUntil      DATE (NULL)
├── approvedBy      UUID (FK → User)
├── createdAt       TIMESTAMP DEFAULT NOW()
└── updatedAt       TIMESTAMP DEFAULT NOW()
```

### 2.20 CustomerInvoice (Kundenrechnungen)

```
CustomerInvoice
├── id              UUID (PK)
├── invoiceNumber   VARCHAR(50) UNIQUE NOT NULL
├── customerId      UUID (FK → Customer) NOT NULL
├── invoiceDate     DATE NOT NULL
├── dueDate         DATE NOT NULL
├── periodStart     DATE NOT NULL
├── periodEnd       DATE NOT NULL
├── subtotal        DECIMAL(10,2) NOT NULL
├── taxRate         DECIMAL(5,2) DEFAULT 19.00
├── taxAmount       DECIMAL(10,2) NOT NULL
├── totalAmount     DECIMAL(10,2) NOT NULL
├── status          ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft'
├── paidAt          TIMESTAMP (NULL)
├── pdfUrl          VARCHAR(500)
├── notes           TEXT
├── createdBy       UUID (FK → User) NOT NULL
├── createdAt       TIMESTAMP DEFAULT NOW()
└── updatedAt       TIMESTAMP DEFAULT NOW()
```

### 2.21 InvoicePosition (Rechnungspositionen)

```
InvoicePosition
├── id              UUID (PK)
├── invoiceId       UUID (FK → CustomerInvoice) NOT NULL
├── objectId        UUID (FK → Object) (NULL)
├── employeeId      UUID (FK → Employee) (NULL)
├── description     TEXT NOT NULL
├── quantity        DECIMAL(8,2) NOT NULL
├── unit            VARCHAR(20) DEFAULT 'Stunden'
├── ratePerUnit     DECIMAL(8,2) NOT NULL
├── totalAmount     DECIMAL(10,2) NOT NULL
├── serviceType     VARCHAR(50)
├── serviceDate     DATE
├── sortOrder       INTEGER DEFAULT 0
└── createdAt       TIMESTAMP DEFAULT NOW()
```

### 2.22 Lock (Bearbeitungssperren)

```
Lock
├── id              UUID (PK)
├── resourceType    VARCHAR(50) NOT NULL  -- z.B. 'deployment', 'employee', 'scheduling'
├── resourceId      UUID NOT NULL
├── lockedBy        UUID (FK → User) NOT NULL
├── sessionId       VARCHAR(100) NOT NULL  -- Browser-Session-ID
├── acquiredAt      TIMESTAMP DEFAULT NOW()
├── heartbeatAt     TIMESTAMP DEFAULT NOW()
├── expiresAt       TIMESTAMP NOT NULL    -- heartbeatAt + 90 Sekunden
├── status          ENUM('active', 'expired', 'released') DEFAULT 'active'
├── releasedAt      TIMESTAMP (NULL)
└── INDEX(resourceType, resourceId) WHERE status = 'active'
```

### 2.23 AuditLog (Änderungsprotokoll)

```
AuditLog
├── id              UUID (PK)
├── userId          UUID (FK → User) (NULL)
├── userName        VARCHAR(200)
├── sessionId       VARCHAR(100)
├── action          VARCHAR(50) NOT NULL  -- 'create', 'update', 'delete', 'approve', etc.
├── resourceType    VARCHAR(50) NOT NULL
├── resourceId      UUID NOT NULL
├── oldValue        JSONB (NULL)
├── newValue        JSONB (NULL)
├── ipAddress       VARCHAR(45)
├── userAgent       TEXT
├── createdAt       TIMESTAMP DEFAULT NOW()
└── INDEX(resourceType, resourceId)
└── INDEX(userId, createdAt)
```

### 2.24 Session (Aktive Sitzungen)

```
Session
├── id              UUID (PK)
├── userId          UUID (FK → User) NOT NULL
├── token           VARCHAR(500) UNIQUE NOT NULL
├── refreshToken    VARCHAR(500) UNIQUE NOT NULL
├── ipAddress       VARCHAR(45)
├── userAgent       TEXT
├── deviceInfo      VARCHAR(200)
├── expiresAt       TIMESTAMP NOT NULL
├── lastActivityAt  TIMESTAMP DEFAULT NOW()
├── isActive        BOOLEAN DEFAULT TRUE
├── createdAt       TIMESTAMP DEFAULT NOW()
└── INDEX(userId)
└── INDEX(token)
```

### 2.25 Notification (Benachrichtigungen)

```
Notification
├── id              UUID (PK)
├── userId          UUID (FK → User) NOT NULL
├── type            VARCHAR(50) NOT NULL
├── title           VARCHAR(200) NOT NULL
├── message         TEXT NOT NULL
├── resourceType    VARCHAR(50) (NULL)
├── resourceId      UUID (NULL)
├── isRead          BOOLEAN DEFAULT FALSE
├── readAt          TIMESTAMP (NULL)
├── createdAt       TIMESTAMP DEFAULT NOW()
└── INDEX(userId, isRead)
```

### 2.26 Holiday (Feiertage)

```
Holiday
├── id              UUID (PK)
├── name            VARCHAR(200) NOT NULL
├── date            DATE NOT NULL
├── state           VARCHAR(10)  -- Bundesland-Kürzel (z.B. 'NW') oder NULL für bundeseinheitlich
├── isRecurring     BOOLEAN DEFAULT TRUE
├── year            INTEGER (NULL)  -- NULL = jährlich
├── createdAt       TIMESTAMP DEFAULT NOW()
└── UNIQUE(date, state)
```

### 2.27 ReplacementRequest (Ersatzpersonalanfragen)

```
ReplacementRequest
├── id              UUID (PK)
├── deploymentId    UUID (FK → Deployment) NOT NULL
├── originalEmployeeId UUID (FK → Employee) NOT NULL
├── reason          TEXT NOT NULL
├── status          ENUM('pending', 'candidates_found', 'assigned', 'unresolved', 'cancelled') DEFAULT 'pending'
├── requestedBy     UUID (FK → User) NOT NULL
├── resolvedBy      UUID (FK → User) (NULL)
├── replacementEmployeeId UUID (FK → Employee) (NULL)
├── replacementDeploymentId UUID (FK → Deployment) (NULL)
├── candidates      JSONB  -- Liste der geeigneten Kandidaten mit Eignungsbewertung
├── notes           TEXT
├── createdAt       TIMESTAMP DEFAULT NOW()
└── updatedAt       TIMESTAMP DEFAULT NOW()
```

---

## 3. Beziehungsdiagramm (ER-Diagramm)

```
User ──< RolePermission >── Permission
 │                              │
 │ (lockedBy, approvedBy)       │ (role)
 ▼                              ▼
Lock                      Role (slug: administrator, ...)

Employee ──< EmployeeQualification >── Qualification
 │    │
 │    ├──< EmployeeDocument
 │    ├──< Availability
 │    ├──< Deployment ──> Object ──> Customer
 │    │         │              │
 │    │         │              ├──< ObjectRequirement >── Qualification
 │    │         │              └──< CustomerRate
 │    │         │
 │    │         └──< ReplacementRequest
 │    │
 │    ├──< TimeRecord ──< Break
 │    └──< EmployeeRate

Customer ──< ContactPerson
 │    └──< Object
 │
 └──< CustomerInvoice ──< InvoicePosition

AuditLog (alle Änderungen)
Session (Sitzungsverwaltung)
Notification (Benachrichtigungen)
Holiday (Feiertage)
Shift (Schicht-Definitionen)
```

---

## 4. Indizes und Performance

### Kritische Indizes

```sql
-- Schnelle Sperrenprüfung
CREATE INDEX idx_lock_active ON "Lock" ("resourceType", "resourceId") WHERE "status" = 'active';

-- Schnelle Audit-Suche
CREATE INDEX idx_audit_resource ON "AuditLog" ("resourceType", "resourceId", "createdAt" DESC);
CREATE INDEX idx_audit_user ON "AuditLog" ("userId", "createdAt" DESC);

-- Dienstplanabfragen
CREATE INDEX idx_deployment_date ON "Deployment" ("date", "objectId");
CREATE INDEX idx_deployment_employee ON "Deployment" ("employeeId", "date");

-- Zeiterfassung
CREATE INDEX idx_time_record_date ON "TimeRecord" ("date", "employeeId");

-- Benachrichtigungen
CREATE INDEX idx_notification_unread ON "Notification" ("userId", "isRead") WHERE "isRead" = false;
```

---

## 5. Datenintegrität

### Foreign Keys

Alle Fremdschlüssel haben `ON DELETE RESTRICT` als Standardverhalten, um versehentliches Löschen zu verhindern. Soft-Delete (`deletedAt`) wird für Employee, Customer und Object verwendet.

### Transaktionen

Kritische Operationen werden immer in Transaktionen ausgeführt:
- Einsatz erstellen → Deployment + AuditLog + WebSocket-Event
- Zeiterfassung → TimeRecord + Stundenberechnung + AuditLog
- Rechnung erstellen → CustomerInvoice + InvoicePositionen + AuditLog
- Sperre anlegen → Lock (SELECT FOR UPDATE) + WebSocket-Event

### Versionierung

Das `version`-Feld auf Deployment (und später anderen Tabellen) ermöglicht Optimistic Locking als zusätzliche Sicherheitsebene neben dem Pessimistic Locking.
