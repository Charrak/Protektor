# SMS – API-Endpunkte

**Version:** 1.0.0
**Datum:** 2026-11-08

---

## 1. Basis-URL

```
/api/v1/
```

Alle API-Aufrufe werden über diesen Prefix geroutet.

---

## 2. Authentifizierung

| Methode | Endpunkt                | Beschreibung                      | Auth |
|---------|------------------------|-----------------------------------|------|
| POST    | /auth/login            | Anmeldung (Username + Passwort)   | ✗    |
| POST    | /auth/logout           | Abmeldung                         | ✓    |
| POST    | /auth/refresh          | Token erneuern                    | ✓    |
| GET     | /auth/me               | Aktueller Benutzer                | ✓    |
| PUT     | /auth/password         | Passwort ändern                   | ✓    |

### POST /auth/login
```json
// Request
{ "username": "admin", "password": "geheim123" }

// Response 200
{
  "user": { "id", "username", "firstName", "lastName", "role", "permissions" },
  "accessToken": "jwt-token...",
  "refreshToken": "refresh-token..."
}
```

---

## 3. Benutzer- und Rollenverwaltung

| Methode | Endpunkt                  | Beschreibung                    | Berechtigung        |
|---------|--------------------------|--------------------------------|---------------------|
| GET     | /users                   | Benutzer auflisten             | admin:users:view    |
| POST    | /users                   | Benutzer erstellen             | admin:users:create  |
| GET     | /users/:id               | Benutzer anzeigen              | admin:users:view    |
| PUT     | /users/:id               | Benutzer bearbeiten            | admin:users:edit    |
| DELETE  | /users/:id               | Benutzer deaktivieren          | admin:users:delete  |
| PUT     | /users/:id/password      | Passwort zurücksetzen          | admin:users:edit    |
| PUT     | /users/:id/role          | Rolle zuweisen                 | admin:users:edit    |
| GET     | /roles                   | Rollen auflisten               | admin:roles:view    |
| POST    | /roles                   | Rolle erstellen                | admin:roles:create  |
| PUT     | /roles/:id               | Rolle bearbeiten               | admin:roles:edit    |
| DELETE  | /roles/:id               | Rolle löschen                  | admin:roles:delete  |
| PUT     | /roles/:id/permissions   | Berechtigungen zuweisen        | admin:roles:edit    |
| GET     | /permissions             | Berechtigungen auflisten       | admin:roles:view    |

---

## 4. Mitarbeiterverwaltung

| Methode | Endpunkt                        | Beschreibung                   | Berechtigung           |
|---------|--------------------------------|-------------------------------|------------------------|
| GET     | /employees                     | Mitarbeiter auflisten          | employees:view         |
| POST    | /employees                     | Mitarbeiter erstellen          | employees:create       |
| GET     | /employees/:id                 | Mitarbeiter anzeigen           | employees:view         |
| PUT     | /employees/:id                 | Mitarbeiter bearbeiten         | employees:edit         |
| DELETE  | /employees/:id                 | Mitarbeiter deaktivieren       | employees:delete       |
| GET     | /employees/:id/qualifications  | Qualifikationen anzeigen       | employees:view         |
| POST    | /employees/:id/qualifications  | Qualifikation zuweisen         | employees:edit         |
| DELETE  | /employees/:id/qualifications/:qid | Qualifikation entfernen    | employees:edit         |
| PUT     | /employees/:id/qualifications/:qid | Qualifikation aktualisieren | employees:edit        |
| GET     | /employees/:id/documents       | Dokumente anzeigen             | employees:view         |
| POST    | /employees/:id/documents       | Dokument hochladen             | employees:edit         |
| DELETE  | /employees/:id/documents/:did  | Dokument löschen               | employees:delete       |
| GET     | /employees/:id/availabilities  | Verfügbarkeiten anzeigen       | employees:view         |
| POST    | /employees/:id/availabilities  | Verfügbarkeit anlegen          | employees:create       |
| GET     | /employees/:id/deployments     | Einsätze des MA anzeigen       | employees:view         |
| GET     | /employees/:id/time-records    | Zeiterfassung anzeigen         | employees:view         |

---

## 5. Kundenverwaltung

| Methode | Endpunkt                        | Beschreibung                   | Berechtigung           |
|---------|--------------------------------|-------------------------------|------------------------|
| GET     | /customers                     | Kunden auflisten               | customers:view         |
| POST    | /customers                     | Kunde erstellen                | customers:create       |
| GET     | /customers/:id                 | Kunde anzeigen                 | customers:view         |
| PUT     | /customers/:id                 | Kunde bearbeiten               | customers:edit         |
| DELETE  | /customers/:id                 | Kunde deaktivieren             | customers:delete       |
| GET     | /customers/:id/contacts        | Ansprechpartner anzeigen       | customers:view         |
| POST    | /customers/:id/contacts        | Ansprechpartner erstellen      | customers:edit         |
| PUT     | /customers/:id/contacts/:cid   | Ansprechpartner bearbeiten     | customers:edit         |
| DELETE  | /customers/:id/contacts/:cid   | Ansprechpartner löschen        | customers:delete       |
| GET     | /customers/:id/rates           | Stundensätze anzeigen          | customers:view         |
| POST    | /customers/:id/rates           | Stundensatz erstellen          | customers:edit         |

---

## 6. Objektverwaltung

| Methode | Endpunkt                        | Beschreibung                   | Berechtigung           |
|---------|--------------------------------|-------------------------------|------------------------|
| GET     | /objects                       | Objekte auflisten              | objects:view           |
| POST    | /objects                       | Objekt erstellen               | objects:create         |
| GET     | /objects/:id                   | Objekt anzeigen                | objects:view           |
| PUT     | /objects/:id                   | Objekt bearbeiten              | objects:edit           |
| DELETE  | /objects/:id                   | Objekt deaktivieren            | objects:delete         |
| GET     | /objects/:id/requirements      | Anforderungen anzeigen         | objects:view           |
| PUT     | /objects/:id/requirements      | Anforderungen speichern        | objects:edit           |
| GET     | /objects/:id/deployments       | Einsätze am Objekt             | objects:view           |

---

## 7. Einsatzplanung & Dienstplan

| Methode | Endpunkt                        | Beschreibung                   | Berechtigung            |
|---------|--------------------------------|-------------------------------|-------------------------|
| GET     | /deployments                   | Einsätze filtern               | deployments:view        |
| POST    | /deployments                   | Einsatz erstellen              | deployments:create      |
| GET     | /deployments/:id               | Einsatz anzeigen               | deployments:view        |
| PUT     | /deployments/:id               | Einsatz bearbeiten             | deployments:edit        |
| DELETE  | /deployments/:id               | Einsatz stornieren             | deployments:delete      |
| POST    | /deployments/:id/confirm       | Einsatz bestätigen             | deployments:edit        |
| POST    | /deployments/:id/cancel        | Einsatz stornieren             | deployments:delete      |
| POST    | /deployments/bulk              | Mehrere Einsätze erstellen     | deployments:create      |
| PUT     | /deployments/bulk              | Mehrere Einsätze bearbeiten    | deployments:edit        |

### Query-Parameter für GET /deployments
```
?date=2026-11-08
&startDate=2026-11-01
&endDate=2026-11-30
&employeeId=uuid
&objectId=uuid
&status=planned,confirmed
&view=day|week|month
```

---

## 8. Automatische Personalplanung

| Methode | Endpunkt                        | Beschreibung                   | Berechtigung            |
|---------|--------------------------------|-------------------------------|-------------------------|
| POST    | /auto-planning/suggest         | Vorschläge für Dienst          | scheduling:create       |
| GET     | /auto-planning/candidates      | Kandidaten für Objekt/Zeitraum | scheduling:view         |
| POST    | /auto-planning/optimize        | Optimierung berechnen          | scheduling:approve      |

### POST /auto-planning/suggest
```json
// Request
{
  "objectId": "uuid",
  "date": "2026-11-08",
  "startTime": "06:00",
  "endTime": "18:00",
  "requiredCount": 3,
  "requiredQualifications": ["qual-uuid-1", "qual-uuid-2"]
}

// Response 200
{
  "suggestions": [
    {
      "employeeId": "uuid",
      "employeeName": "Max Mustermann",
      "score": 95,
      "qualifications": ["§34a GewO", "Waffensachkunde"],
      "conflicts": [],
      "availability": "available",
      "reason": "Alle Anforderungen erfüllt, keine Konflikte"
    }
  ]
}
```

---

## 9. Ersatzpersonalsuche

| Methode | Endpunkt                              | Beschreibung              | Berechtigung            |
|---------|--------------------------------------|--------------------------|-------------------------|
| POST    | /replacement/request                 | Ersatz anfordern         | scheduling:create       |
| GET     | /replacement/:id                     | Anfrage anzeigen         | scheduling:view         |
| GET     | /replacement/:id/candidates          | Ersatz-Kandidaten        | scheduling:view         |
| POST    | /replacement/:id/assign              | Ersatz zuweisen          | scheduling:approve      |
| PUT     | /replacement/:id                     | Anfrage aktualisieren    | scheduling:edit         |

---

## 10. Zeiterfassung

| Methode | Endpunkt                        | Beschreibung                   | Berechtigung            |
|---------|--------------------------------|-------------------------------|-------------------------|
| GET     | /time-records                  | Zeiterfassungen filtern        | attendance:view         |
| POST    | /time-records                  | Zeiterfassung starten          | attendance:create       |
| GET     | /time-records/:id              | Zeiterfassung anzeigen         | attendance:view         |
| PUT     | /time-records/:id              | Zeiterfassung bearbeiten       | attendance:edit         |
| POST    | /time-records/:id/clock-in     | Arbeitsbeginn                  | attendance:create       |
| POST    | /time-records/:id/clock-out    | Arbeitsende                    | attendance:create       |
| POST    | /time-records/:id/break-start  | Pausenbeginn                   | attendance:create       |
| POST    | /time-records/:id/break-end    | Pausenende                     | attendance:create       |
| POST    | /time-records/:id/approve      | Zeiterfassung genehmigen       | attendance:approve      |
| POST    | /time-records/:id/correct      | Korrektur beantragen           | attendance:edit         |
| GET     | /time-records/summary          | Stundenübersicht               | attendance:view         |

---

## 11. Abrechnung

| Methode | Endpunkt                              | Beschreibung              | Berechtigung            |
|---------|--------------------------------------|--------------------------|-------------------------|
| POST    | /billing/employee-calculation        | MA-Abrechnung berechnen   | billing:payroll         |
| GET     | /billing/employee-calculation/:id    | MA-Abrechnung anzeigen    | billing:payroll         |
| GET     | /billing/employee-calculation        | Alle MA-Abrechnungen      | billing:payroll         |
| POST    | /billing/customer-invoices/generate  | Kundenrechnung erstellen  | billing:invoices        |
| GET     | /billing/customer-invoices           | Rechnungen auflisten      | billing:invoices        |
| GET     | /billing/customer-invoices/:id       | Rechnung anzeigen         | billing:invoices        |
| PUT     | /billing/customer-invoices/:id       | Rechnung bearbeiten       | billing:invoices        |
| POST    | /billing/customer-invoices/:id/send  | Rechnung als PDF/versenden | billing:invoices       |
| GET     | /billing/customer-invoices/:id/pdf   | Rechnung-PDF              | billing:invoices        |
| GET     | /billing/summary                     | Abrechnungsübersicht      | billing:*               |
| GET     | /billing/cost-analysis               | Kostenanalyse             | billing:*               |

---

## 12. Statistik & Berichte

| Methode | Endpunkt                        | Beschreibung                   | Berechtigung     |
|---------|--------------------------------|-------------------------------|------------------|
| GET     | /reports/dashboard             | Dashboard-Daten               | reports:view     |
| GET     | /reports/employee-hours        | Mitarbeiterstunden            | reports:view     |
| GET     | /reports/customer-revenue      | Kundenumsatz                  | reports:view     |
| GET     | /reports/object-coverage       | Objektbesetzung               | reports:view     |
| GET     | /reports/qualification-status  | Qualifikationsstatus          | reports:view     |
| GET     | /reports/monthly-overview      | Monatsübersicht               | reports:view     |
| GET     | /reports/export/excel          | Excel-Export                  | reports:export   |
| GET     | /reports/export/csv            | CSV-Export                    | reports:export   |
| GET     | /reports/export/pdf            | PDF-Bericht                   | reports:export   |

---

## 13. Bearbeitungssperren (Locking)

| Methode | Endpunkt                        | Beschreibung                   | Auth |
|---------|--------------------------------|-------------------------------|------|
| POST    | /locks/acquire                 | Sperre anfordern              | ✓    |
| PUT     | /locks/:id/heartbeat           | Heartbeat senden              | ✓    |
| DELETE  | /locks/:id                     | Sperre freigeben              | ✓    |
| GET     | /locks/active                  | Aktive Sperren anzeigen       | ✓    |
| GET     | /locks/resource/:type/:id      | Sperren für Ressource prüfen  | ✓    |

### POST /locks/acquire
```json
// Request
{
  "resourceType": "scheduling",
  "resourceId": "uuid",
  "sessionId": "browser-session-id"
}

// Response 200
{
  "lockId": "lock-uuid",
  "expiresAt": "2026-11-08T12:01:30Z",
  "status": "active"
}

// Response 409 Conflict
{
  "error": "LOCK_CONFLICT",
  "lock": {
    "lockedBy": "Michael König",
    "role": "Disposition",
    "acquiredAt": "2026-11-08T11:45:00Z",
    "expiresAt": "2026-11-08T12:15:00Z"
  }
}
```

---

## 14. Benachrichtigungen

| Methode | Endpunkt                        | Beschreibung                   | Auth |
|---------|--------------------------------|-------------------------------|------|
| GET     | /notifications                 | Benachrichtigungen            | ✓    |
| PUT     | /notifications/:id/read        | Als gelesen markieren         | ✓    |
| PUT     | /notifications/read-all        | Alle als gelesen              | ✓    |
| GET     | /notifications/unread-count    | Anzahl ungelesener            | ✓    |

---

## 15. Systemadministration

| Methode | Endpunkt                        | Beschreibung                   | Berechtigung     |
|---------|--------------------------------|-------------------------------|------------------|
| GET     | /admin/audit-log               | Änderungsprotokoll            | admin:audit      |
| GET     | /admin/audit-log/search        | Protokoll durchsuchen         | admin:audit      |
| GET     | /admin/sessions                | Aktive Sitzungen              | admin:users      |
| DELETE  | /admin/sessions/:id            | Sitzung beenden               | admin:users      |
| GET     | /admin/system-info             | Systeminformationen           | admin:settings   |
| POST    | /admin/backup                  | Backup auslösen               | admin:backup     |
| GET     | /admin/backup/list             | Backups auflisten             | admin:backup     |
| POST    | /admin/backup/restore          | Wiederherstellung             | admin:backup     |
| GET     | /admin/holidays                | Feiertage anzeigen            | admin:settings   |
| POST    | /admin/holidays                | Feiertage importieren         | admin:settings   |
| GET     | /admin/shifts                  | Schichtdefinitionen           | admin:settings   |
| POST    | /admin/shifts                  | Schicht erstellen             | admin:settings   |
| PUT     | /admin/shifts/:id              | Schicht bearbeiten            | admin:settings   |

---

## 16. Qualifikationen

| Methode | Endpunkt                        | Beschreibung                   | Berechtigung     |
|---------|--------------------------------|-------------------------------|------------------|
| GET     | /qualifications                | Qualifikationen auflisten      | employees:view   |
| POST    | /qualifications                | Qualifikation erstellen        | admin:settings   |
| PUT     | /qualifications/:id            | Qualifikation bearbeiten       | admin:settings   |
| DELETE  | /qualifications/:id            | Qualifikation löschen          | admin:settings   |
| GET     | /qualifications/expiring       | Bald ablaufende Qualis        | employees:view   |

---

## 17. Datei-Uploads

| Methode | Endpunkt                        | Beschreibung                   | Berechtigung     |
|---------|--------------------------------|-------------------------------|------------------|
| POST    | /uploads                       | Datei hochladen                | Modulabhängig    |
| GET     | /uploads/:id                   | Datei herunterladen            | Modulabhängig    |
| DELETE  | /uploads/:id                   | Datei löschen                  | Modulabhängig    |

### Upload-Beschränkungen
- Maximale Dateigröße: 10 MB
- Erlaubte Typen: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, BMP
- Virenprüfung (optional)

---

## 18. Fehlercodes

| HTTP-Code | Bedeutung             | Typisches Szenario                    |
|-----------|-----------------------|---------------------------------------|
| 200       | OK                    | Anfrage erfolgreich                   |
| 201       | Created               | Ressource erstellt                    |
| 400       | Bad Request           | Validierungsfehler                    |
| 401       | Unauthorized          | Nicht angemeldet                     |
| 403       | Forbidden             | Fehlende Berechtigung                 |
| 404       | Not Found             | Ressource nicht gefunden             |
| 409       | Conflict              | Sperrenkonflikt / Duplikat           |
| 422       | Unprocessable Entity  | Geschäftslogik-Fehler                |
| 429       | Too Many Requests     | Rate Limit überschritten             |
| 500       | Internal Server Error | Serverfehler                          |
