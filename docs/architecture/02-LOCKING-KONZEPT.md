# SMS – Locking-Konzept

**Version:** 1.0.0
**Datum:** 2026-11-08

---

## 1. Überblick

Das Bearbeitungsschutzsystem verhindert, dass zwei Benutzer gleichzeitig denselben Datensatz unkontrolliert bearbeiten. Es basiert auf **Pessimistic Locking** in PostgreSQL mit einer Heartbeat-gesteuerten Ablauflogik.

### 1.1 Grundprinzip

```
Benutzer A öffnet Ressource
    ↓
POST /api/v1/locks/acquire
    ↓
Server prüft: Gibt es bereits eine aktive Sperre?
    ├── NEIN → Sperre erstellen → Lock-ID zurückgeben
    └── JA → 409 Conflict mit Infos zum Sperrenden
    ↓
Benutzer A bearbeitet Ressource
    ↓
Heartbeat alle 30 Sekunden → PUT /api/v1/locks/:id/heartbeat
    ↓
Benutzer A speichert oder schließt
    ↓
DELETE /api/v1/locks/:id → Sperre freigegeben
```

---

## 2. Datenbank-Design

### Lock-Tabelle

```sql
CREATE TABLE "Lock" (
    "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "resourceType" VARCHAR(50) NOT NULL,    -- z.B. 'scheduling', 'employee', 'invoice'
    "resourceId"  UUID NOT NULL,            -- ID der gesperrten Ressource
    "lockedBy"    UUID NOT NULL REFERENCES "User"("id"),
    "sessionId"   VARCHAR(100) NOT NULL,    -- Browser-Session-ID
    "acquiredAt"  TIMESTAMP NOT NULL DEFAULT NOW(),
    "heartbeatAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "expiresAt"   TIMESTAMP NOT NULL,       -- heartbeatAt + 90s
    "status"      VARCHAR(20) NOT NULL DEFAULT 'active',
    "releasedAt"  TIMESTAMP,

    CONSTRAINT chk_lock_status CHECK ("status" IN ('active', 'expired', 'released'))
);

-- Partielle Index für schnelle Prüfung aktiver Sperren
CREATE INDEX idx_lock_active_resource ON "Lock" ("resourceType", "resourceId")
    WHERE "status" = 'active';

-- Index für Heartbeat-Timeout-Suche
CREATE INDEX idx_lock_heartbeat ON "Lock" ("heartbeatAt")
    WHERE "status" = 'active';
```

---

## 3. Locking-Ablauf – Detail

### 3.1 Sperre anfordern

```typescript
async function acquireLock(
    resourceType: string,
    resourceId: string,
    userId: string,
    sessionId: string
): Promise<LockResult> {

    return await prisma.$transaction(async (tx) => {

        // 1. Prüfen, ob bereits eine aktive Sperre existiert
        const existingLock = await tx.lock.findFirst({
            where: {
                resourceType,
                resourceId,
                status: 'active',
                heartbeatAt: { gte: new Date(Date.now() - 90_000) }
            },
            include: { lockedBy: { select: { firstName: true, lastName: true, role: true } } }
        });

        if (existingLock) {
            // Sperre gehört demselben Benutzer?
            if (existingLock.lockedBy.id === userId) {
                // Eigene Sperre – aktualisieren
                const updated = await tx.lock.update({
                    where: { id: existingLock.id },
                    data: { heartbeatAt: new Date(), expiresAt: new Date(Date.now() + 90_000) }
                });
                return { status: 'refreshed', lock: updated };
            }

            // Fremde Sperre – Konflikt
            throw new LockConflictError(existingLock);
        }

        // 2. Alte abgelaufene Sperren aufräumen
        await tx.lock.updateMany({
            where: {
                resourceType,
                resourceId,
                status: 'active',
                heartbeatAt: { lt: new Date(Date.now() - 90_000) }
            },
            data: { status: 'expired', releasedAt: new Date() }
        });

        // 3. Neue Sperre erstellen
        const lock = await tx.lock.create({
            data: {
                resourceType,
                resourceId,
                lockedBy: { connect: { id: userId } },
                sessionId,
                heartbeatAt: new Date(),
                expiresAt: new Date(Date.now() + 90_000),
                status: 'active'
            }
        });

        return { status: 'acquired', lock };
    });
}
```

### 3.2 Heartbeat

```typescript
async function heartbeat(lockId: string, userId: string): Promise<void> {
    const lock = await prisma.lock.findUnique({ where: { id: lockId } });

    if (!lock || lock.lockedBy !== userId) {
        throw new ForbiddenError('Lock does not belong to you');
    }

    if (lock.status !== 'active') {
        throw new LockExpiredError();
    }

    await prisma.lock.update({
        where: { id: lockId },
        data: {
            heartbeatAt: new Date(),
            expiresAt: new Date(Date.now() + 90_000)
        }
    });
}
```

### 3.3 Sperre freigeben

```typescript
async function releaseLock(lockId: string, userId: string): Promise<void> {
    await prisma.lock.update({
        where: {
            id: lockId,
            lockedBy: userId
        },
        data: {
            status: 'released',
            releasedAt: new Date()
        }
    });
}
```

### 3.4 Automatische Bereinigung (Cleanup-Job)

```typescript
// Läuft alle 60 Sekunden
async function cleanupExpiredLocks(): Promise<void> {
    const result = await prisma.lock.updateMany({
        where: {
            status: 'active',
            heartbeatAt: { lt: new Date(Date.now() - 90_000) }
        },
        data: {
            status: 'expired',
            releasedAt: new Date()
        }
    });

    if (result.count > 0) {
        // WebSocket-Benachrichtigung an alle
        broadcastEvent('locks:expired', { count: result.count });
    }
}
```

---

## 4. Ressourcen-Granularität

Sperren gelten immer für **spezifische Ressourcen**, nicht für ganze Module:

```
Sperre 1: scheduling/2026-W45    → Nur dieser Dienstplan (Woche 45)
Sperre 2: employee/uuid-123      → Nur dieses Mitarbeiterprofil
Sperre 3: invoice/uuid-456       → Nur diese Rechnung
```

**Zwei verschiedene Dienstpläne können gleichzeitig von zwei verschiedenen Benutzern bearbeitet werden.**

### 4.1 Sperrbare Ressourcentypen

| Ressourcentyp     | Sperrbereich                    | Typisches Szenario           |
|-------------------|--------------------------------|------------------------------|
| scheduling        | Dienstplan für Zeitraum/Objekt  | Dienstplan bearbeiten        |
| employee          | Ein Mitarbeiterprofil           | MA-Stammdaten ändern         |
| deployment        | Ein einzelner Einsatz           | Einsatzdetails bearbeiten    |
| invoice           | Eine Rechnung                   | Rechnung erstellen/bearbeiten|
| time-record       | Eine Zeiterfassung              | Korrektur beantragen         |
| customer          | Ein Kundenprofil                | Kundendaten ändern           |
| object            | Ein Objekt                      | Objektanforderungen ändern   |

---

## 5. Frontend-Integration

### 5.1 Lock-Hook

```typescript
function useLock(resourceType: string, resourceId: string) {
    const [lock, setLock] = useState<Lock | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [lockedBy, setLockedBy] = useState<LockInfo | null>(null);

    // Beim Öffnen: Sperre anfordern
    useEffect(() => {
        acquireLock(resourceType, resourceId).then(setLock).catch(err => {
            if (err instanceof LockConflictError) {
                setLockedBy(err.lockInfo);
            }
        });

        // Heartbeat-Intervall
        const interval = setInterval(() => {
            if (lock) heartbeat(lock.id);
        }, 30_000);

        return () => {
            clearInterval(interval);
            if (lock) releaseLock(lock.id);
        };
    }, [resourceType, resourceId]);

    // WebSocket: Fremde Sperren empfangen
    useWebSocket('lock:acquired', (data) => {
        if (data.resourceType === resourceType && data.resourceId === resourceId) {
            setLockedBy(data.lockInfo);
        }
    });

    return { lock, isLocked, lockedBy };
}
```

### 5.2 UI-Anzeige bei Sperre

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Bearbeitungsstatus                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Dieser Dienstplan wird momentan von                     │
│ Michael König (Disposition) bearbeitet.                 │
│                                                         │
│ Bearbeitungsbeginn: 08.11.2026, 11:45 Uhr              │
│ Voraussichtliche Sperrdauer: ~5 Minuten                 │
│                                                         │
│ Du kannst den Dienstplan ansehen,                       │
│ aber derzeit nicht verändern.                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Sicherheit gegen Race Conditions

### 6.1 Datenbank-Transaktion mit SELECT FOR UPDATE

```sql
BEGIN TRANSACTION;

-- Sperre prüfen und gleichzeitig sperren (Row-Level Lock)
SELECT * FROM "Lock"
WHERE "resourceType" = $1 AND "resourceId" = $2 AND "status" = 'active'
FOR UPDATE SKIP LOCKED;

-- Falls aktiv → Conflict
-- Falls nicht vorhanden oder abgelaufen → Neue Sperre erstellen

INSERT INTO "Lock" ("resourceType", "resourceId", "lockedBy", "sessionId", "expiresAt")
VALUES ($1, $2, $3, $4, NOW() + INTERVAL '90 seconds');

COMMIT;
```

### 6.2 Optimistic Locking als zweite Ebene

Zusätzlich zum Pessimistic Locking nutzt das `version`-Feld auf kritischen Ressourcen Optimistic Locking:

```typescript
// Beim Speichern:
await prisma.deployment.update({
    where: {
        id: deploymentId,
        version: expectedVersion  // Muss übereinstimmen
    },
    data: {
        ...updates,
        version: { increment: 1 }
    }
});
// Falls version mismatch → PrismaClientKnownRequestError (P2025)
```

---

## 7. Szenarien und Verhalten

### Szenario 1: Normaler Bearbeitungsfluss

```
Benutzer A öffnet Dienstplan → Sperre angefordert → OK
Benutzer A bearbeitet → Heartbeat alle 30s → OK
Benutzer A speichert → Version erhöht → Sperre bleibt
Benutzer A schließt Tab → Sperre automatisch freigegeben
```

### Szenario 2: Konflikt

```
Benutzer A öffnet Dienstplan → Sperre angefordert → OK
Benutzer B öffnet denselben Dienstplan → Sperre angefordert → 409 CONFLICT
Benutzer B sieht: "Michael König bearbeitet diesen Dienstplan"
Benutzer B kann nur lesend zugreifen
Benutzer A schließt → Sperre freigegeben
Benutzer B erhält via WebSocket: "Sperre aufgehoben"
Benutzer B kann jetzt bearbeiten
```

### Szenario 3: Abgestürzter Browser / Netzwerkverlust

```
Benutzer A bearbeitet → Heartbeat geht durch
Benutzer A: Browser stürzt ab → Kein Heartbeat mehr
Nach 90 Sekunden → Cleanup-Job markiert Sperre als 'expired'
WebSocket: "Sperre abgelaufen" an alle
Benutzer B kann jetzt wieder bearbeiten
```

### Szenario 4: Alter Tab

```
Benutzer A öffnet Dienstplan in Tab 1 → Sperre angefordert
Benutzer A öffnet denselben Dienstplan in Tab 2 → Eigene Sperre erkannt → "refreshed"
Benutzer A schließt Tab 1 → Heartbeat läuft weiter über Tab 2
Benutzer A schließt Tab 2 → Sperre freigegeben
```

### Szenario 5: Session-ID-Prüfung

```
Jeder Tab hat eine eigene Session-ID (localStorage)
Alter Tab mit alter Session-ID kann keine neue Sperre beanspruchen
Server prüft bei jeder schreibenden Anfrage: Lock-Session == Request-Session
```

---

## 8. Zeitkonfiguration

| Parameter             | Wert    | Beschreibung                             |
|-----------------------|---------|------------------------------------------|
| Heartbeat-Intervall   | 30s     | Frontend sendet alle 30s einen Heartbeat |
| Lock-Timeout          | 90s     | Sperre gilt als abgelaufen nach 90s      |
| Cleanup-Intervall     | 60s     | Server prüft alle 60s auf abgelaufene Sperren |
| Lock-Vorabdauer       | 90s     | Initiale Ablaufzeit beim Anfordern       |
