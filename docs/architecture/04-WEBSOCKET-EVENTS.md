# SMS – WebSocket-Event-Definitionen

**Version:** 1.0.0
**Datum:** 2026-11-08

---

## 1. Architektur

```
┌────────────┐     Socket.io      ┌──────────────┐      Pub/Sub       ┌───────┐
│  Browser A │◄──────────────────►│  Socket.io   │◄──────────────────►│ Redis │
│  Browser B │◄──────────────────►│  Server      │                     │(opt.) │
│  Browser C │◄──────────────────►│  (Namespace) │                     └───────┘
└────────────┘                    └──────────────┘
```

### Namespace: `/sms`

---

## 2. Events – Übersicht

### 2.1 Client → Server

| Event              | Beschreibung                         | Payload                     |
|--------------------|--------------------------------------|-----------------------------|
| `auth:login`       | Client hat sich angemeldet           | `{ userId, role }`          |
| `lock:heartbeat`   | Heartbeat für aktive Sperre          | `{ lockId }`                |
| `cursor:move`      | Cursorposition (optional)            | `{ x, y, resourceType }`    |
| `typing`           | Benutzer tippt (optional)            | `{ resourceId }`            |

### 2.2 Server → Client

#### Sperren

| Event              | Beschreibung                         | Payload                     |
|--------------------|--------------------------------------|-----------------------------|
| `lock:acquired`    | Neue Sperre angelegt                 | `{ lockId, resourceType, resourceId, user: { name, role }, acquiredAt, expiresAt }` |
| `lock:released`    | Sperre freigegeben                   | `{ lockId, resourceType, resourceId, user: { name } }` |
| `lock:expired`     | Sperre automatisch abgelaufen        | `{ lockId, resourceType, resourceId }` |

#### Mitarbeiter

| Event              | Beschreibung                         | Payload                     |
|--------------------|--------------------------------------|-----------------------------|
| `employee:created` | Neuer Mitarbeiter                    | `{ employee: { id, name, status } }` |
| `employee:updated` | Mitarbeiter geändert                 | `{ employeeId, changes: string[] }` |
| `employee:deleted` | Mitarbeiter deaktiviert              | `{ employeeId }`            |
| `employee:sick`    | Krankmeldung                         | `{ employeeId, from: Date, to: Date }` |

#### Dienstplan / Einsätze

| Event              | Beschreibung                         | Payload                     |
|--------------------|--------------------------------------|-----------------------------|
| `scheduling:updated` | Dienstplan geändert                | `{ objectId, date, changes: string[] }` |
| `deployment:created` | Neuer Einsatz                      | `{ deployment: { id, date, objectId, employeeId, time } }` |
| `deployment:updated` | Einsatz geändert                   | `{ deploymentId, changes: string[] }` |
| `deployment:cancelled` | Einsatz storniert                | `{ deploymentId, reason }`  |
| `deployment:confirmed` | Einsatz bestätigt (MA)           | `{ deploymentId, confirmedBy }` |

#### Ersatz

| Event              | Beschreibung                         | Payload                     |
|--------------------|--------------------------------------|-----------------------------|
| `replacement:requested` | Ersatz angefordert              | `{ requestId, deploymentId, originalEmployee }` |
| `replacement:assigned`  | Ersatz zugewiesen               | `{ requestId, replacementEmployee }` |
| `replacement:accepted`  | Ersatz bestätigt                | `{ requestId }`             |

#### Zeiterfassung

| Event              | Beschreibung                         | Payload                     |
|--------------------|--------------------------------------|-----------------------------|
| `attendance:clock-in`  | Arbeitsbeginn                   | `{ employeeId, time }`      |
| `attendance:clock-out` | Arbeitsende                     | `{ employeeId, time }`      |
| `attendance:approved`  | Zeiterfassung genehmigt          | `{ timeRecordId, approvedBy }` |

#### Benachrichtigungen

| Event              | Beschreibung                         | Payload                     |
|--------------------|--------------------------------------|-----------------------------|
| `notification:new` | Neue Benachrichtigung                | `{ id, type, title, message, resourceType?, resourceId? }` |
| `notification:read` | Benachrichtigung gelesen            | `{ id }`                    |

#### System

| Event              | Beschreibung                         | Payload                     |
|--------------------|--------------------------------------|-----------------------------|
| `system:refresh`   | Daten aktualisieren                  | `{ resourceType, resourceId? }` |
| `system:maintenance` | Wartungsmodus                       | `{ message, estimatedEnd }` |
| `user:joined`      | Benutzer online                      | `{ userId, name, role }`    |
| `user:left`        | Benutzer offline                     | `{ userId, name }`          |

---

## 3. Event-Routing

Nicht alle Events gehen an alle Benutzer. Das Routing folgt dem Berechtigungskonzept:

```typescript
function getEventRecipients(eventType: string, payload: any, io: Server) {
    switch(eventType) {
        case 'scheduling:updated':
        case 'deployment:created':
        case 'deployment:cancelled':
            // Alle mit scheduling:view oder dispatch
            return io.to('role:dispatch').to('role:management').to('role:administrator');

        case 'employee:sick':
            // Disposition, HR, Geschäftsführung
            return io.to('role:dispatch').to('role:hr').to('role:management');

        case 'attendance:clock-in':
        case 'attendance:clock-out':
            // Disposition und Einsatzleitung
            return io.to('role:dispatch').to('role:field_supervisor');

        case 'lock:acquired':
        case 'lock:released':
            // Alle, die dieselbe Ressource ansehen könnten
            return io.to(`resource:${payload.resourceType}:${payload.resourceId}`);

        case 'notification:new':
            // Nur der spezifische Benutzer
            return io.to(`user:${payload.userId}`);

        default:
            // Alle angemeldeten Benutzer
            return io.to('authenticated');
    }
}
```

---

## 4. Socket-Rooms

Jeder verbundene Client tritt folgenden Rooms bei:

| Room                          | Beschreibung                        |
|-------------------------------|-------------------------------------|
| `authenticated`               | Alle angemeldeten Benutzer          |
| `user:{userId}`               | Persönlicher Room für Notifications |
| `role:{roleSlug}`             | Alle Benutzer derselben Rolle       |
| `resource:{type}:{id}`        | Alle, die eine Ressource beobachten |

---

## 5. Reconnection-Strategie

```typescript
// Client-seitig
const socket = io('/sms', {
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
});

socket.on('connect', () => {
    // Bei Wiederverbindung: Authentifizierung erneut senden
    socket.emit('auth:login', { userId, role });

    // Daten neu laden (könnten veraltet sein)
    refreshCurrentView();
});

socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
        // Server hat getrennt → neu verbinden
        socket.connect();
    }
});
```

---

## 6. Beispiel: Kompletter Ablauf

```
1. Benutzer öffnet Browser → Socket-Verbindung aufbauen
2. auth:login senden mit Benutzerinfo
3. Server ordnet Socket den Rooms zu (role:dispatch, user:uuid-123, etc.)
4. Benutzer öffnet Dienstplan → POST /locks/acquire
5. Server erstellt Sperre → emit 'lock:acquired' an resource:scheduling:week-45
6. Andere Benutzer sehen: "Michael König bearbeitet diesen Dienstplan"
7. Benutzer bearbeitet Einsatz → PUT /deployments/:id
8. Server aktualisiert → emit 'deployment:updated' an role:dispatch, role:management
9. Benutzer speichert Dienstplan → DELETE /locks/:id
10. Server gibt Sperre frei → emit 'lock:released' an resource:scheduling:week-45
11. Andere Benutzer sehen: Sperre aufgehoben, können jetzt bearbeiten
```
