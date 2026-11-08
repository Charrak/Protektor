# SMS – Berechtigungskonzept (RBAC)

**Version:** 1.0.0
**Datum:** 2026-11-08

---

## 1. Modell

Das System verwendet ein **Rollenbasiertes Zugriffsmodell (RBAC)** mit folgenden Ebenen:

```
Benutzer → Rolle → Berechtigungen → Ressourcen + Aktionen
```

Jede Berechtigung beschreibt:
- **Modul** (z.B. `employees`)
- **Aktion** (z.B. `create`, `edit`, `view`, `delete`)
- Format: `modul:aktion`

---

## 2. Rollen

| Rolle              | Slug               | Beschreibung                                         |
|--------------------|--------------------|------------------------------------------------------|
| Administrator      | `administrator`    | Voller Systemzugriff inkl. Benutzerverwaltung        |
| Geschäftsführung   | `management`       | Zugriff auf alle Geschäftsbereiche, keine Admin-Funktionen |
| Disposition        | `dispatch`         | Dienstplanung, Einsatzkoordination, Ersatzsuche       |
| Personalverwaltung | `hr`               | Mitarbeiterstammdaten, Qualifikationen, Verträge     |
| Buchhaltung        | `accounting`       | Abrechnungen, Rechnungen, Export                     |
| Einsatzleitung     | `field_supervisor` | Zeiterfassung, Einsatzbestätigung                    |
| Mitarbeiter        | `employee`         | Eigene Daten einsehen, Verfügbarkeiten, Bestätigungen|

---

## 3. Berechtigungsmatrix

| Berechtigung                  | Admin | Geschäftsf. | Dispo | HR  | Buchhaltung | Einsatzleitung | MA |
|-------------------------------|:-----:|:-----------:|:-----:|:---:|:-----------:|:--------------:|:--:|
| **Dashboard**                 |       |             |       |     |             |                |     |
| dashboard:view                |   ✓   |      ✓      |   ✓   |  ✓  |      ✓      |       ✓        |  ✓  |
| **Mitarbeiter**               |       |             |       |     |             |                |     |
| employees:view                |   ✓   |      ✓      |   ✓   |  ✓  |      ✓      |       ○        |  ○  |
| employees:create              |   ✓   |      ✓      |       |  ✓  |             |                |     |
| employees:edit                |   ✓   |      ✓      |       |  ✓  |             |                |     |
| employees:delete              |   ✓   |      ○      |       |  ✓  |             |                |     |
| employees:view_all            |   ✓   |      ✓      |   ✓   |  ✓  |      ✓      |                |     |
| employees:view_own            |       |             |       |     |             |                |  ✓  |
| **Kunden**                    |       |             |       |     |             |                |     |
| customers:view                |   ✓   |      ✓      |   ✓   |     |      ✓      |                |     |
| customers:create              |   ✓   |      ✓      |       |     |             |                |     |
| customers:edit                |   ✓   |      ✓      |       |     |             |                |     |
| customers:delete              |   ✓   |      ○      |       |     |             |                |     |
| **Objekte**                   |       |             |       |     |             |                |     |
| objects:view                  |   ✓   |      ✓      |   ✓   |     |      ✓      |       ○        |     |
| objects:create                |   ✓   |      ✓      |       |     |             |                |     |
| objects:edit                  |   ✓   |      ✓      |       |     |             |                |     |
| objects:delete                |   ✓   |      ○      |       |     |             |                |     |
| **Dienstplanung**             |       |             |       |     |             |                |     |
| scheduling:view               |   ✓   |      ✓      |   ✓   |     |             |       ○        |     |
| scheduling:create             |   ✓   |      ✓      |   ✓   |     |             |                |     |
| scheduling:edit               |   ✓   |      ✓      |   ✓   |     |             |                |     |
| scheduling:approve            |   ✓   |      ✓      |   ○   |     |             |                |     |
| scheduling:auto_plan          |   ✓   |      ✓      |   ✓   |     |             |                |     |
| scheduling:replacement        |   ✓   |      ✓      |   ✓   |     |             |       ○        |     |
| **Zeiterfassung**             |       |             |       |     |             |                |     |
| attendance:view               |   ✓   |      ✓      |   ✓   |  ✓  |      ✓      |       ○        |     |
| attendance:create             |   ✓   |             |       |     |             |       ✓        |  ○  |
| attendance:edit               |   ✓   |      ✓      |   ○   |  ✓  |             |                |     |
| attendance:approve            |   ✓   |      ✓      |   ✓   |  ✓  |      ✓      |                |     |
| attendance:view_own           |       |             |       |     |             |                |  ✓  |
| **Abrechnung**                |       |             |       |     |             |                |     |
| billing:employee_rates        |   ✓   |      ✓      |       |  ✓  |      ✓      |                |     |
| billing:customer_rates        |   ✓   |      ✓      |       |     |      ✓      |                |     |
| billing:payroll               |   ✓   |      ✓      |       |     |      ✓      |                |     |
| billing:invoices              |   ✓   |      ✓      |       |     |      ✓      |                |     |
| billing:export                |   ✓   |      ✓      |       |     |      ✓      |                |     |
| **Berichte**                  |       |             |       |     |             |                |     |
| reports:view                  |   ✓   |      ✓      |   ✓   |  ✓  |      ✓      |       ○        |     |
| reports:export                |   ✓   |      ✓      |   ✓   |     |      ✓      |                |     |
| **Administration**            |       |             |       |     |             |                |     |
| admin:users                   |   ✓   |             |       |     |             |                |     |
| admin:roles                   |   ✓   |             |       |     |             |                |     |
| admin:audit                   |   ✓   |      ✓      |       |     |             |                |     |
| admin:settings                |   ✓   |      ○      |       |     |             |                |     |
| admin:backup                  |   ✓   |      ○      |       |     |             |                |     |

Legende:
- ✓ = Voller Zugriff
- ○ = Eingeschränkter Zugriff (z.B. nur eigene Daten oder schreibgeschützt)

---

## 4. Middleware-Implementierung

### 4.1 Authorization Middleware

```typescript
// middleware/authorization.ts
export function requirePermission(...permissions: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as AuthenticatedUser;

        if (!user) {
            return res.status(401).json({ error: 'UNAUTHORIZED' });
        }

        // Admin hat immer alle Rechte
        if (user.role.slug === 'administrator') {
            return next();
        }

        const userPermissions = user.permissions.map(p => p.slug);

        const hasPermission = permissions.some(p => userPermissions.includes(p));

        if (!hasPermission) {
            return res.status(403).json({
                error: 'FORBIDDEN',
                message: `Fehlende Berechtigung: ${permissions.join(' oder ')}`,
                requiredPermissions: permissions
            });
        }

        next();
    };
}
```

### 4.2 Verwendung in Routen

```typescript
// routes/employee.routes.ts
router.get('/',
    authenticate,
    requirePermission('employees:view', 'employees:view_all'),
    employeeController.list
);

router.post('/',
    authenticate,
    requirePermission('employees:create'),
    employeeController.create
);

router.put('/:id',
    authenticate,
    requirePermission('employees:edit'),
    withLock('employee', ':id'),  // Sperr-Prüfung
    employeeController.update
);

router.delete('/:id',
    authenticate,
    requirePermission('employees:delete'),
    withLock('employee', ':id'),
    employeeController.delete
);
```

---

## 5. Datenbezogene Berechtigungen

Neben den Modulberechtigungen gelten folgende datenbezogene Einschränkungen:

### 5.1 Mitarbeiter-Sichtbarkeit

- **Mitarbeiter-Rolle**: Darf nur das eigene Profil sehen (`employees:view_own`)
- **Einsatzleitung**: Darf Mitarbeiter im eigenen Einsatzbereich sehen (`employees:view` mit Bereichsfilter)
- **Alle anderen mit employees:view**: Sehen alle aktiven Mitarbeiter

### 5.2 Zeiterfassung

- **Mitarbeiter**: Eigene Zeiten erfassen und einsehen
- **Einsatzleitung**: Zeiten für eigene Einsätze bestätigen
- **HR/Buchhaltung/Disposition**: Alle Zeiten einsehen und bearbeiten
- **Geschäftsführung**: Alle Zeiten einsehen

### 5.3 Abrechnung

- **Buchhaltung**: Darf Abrechnungen erstellen und bearbeiten
- **Geschäftsführung**: Darf Abrechnungen einsehen und genehmigen
- **Disposition**: Darf KEINE Abrechnungen sehen oder bearbeiten
- **Mitarbeiter**: Darf die eigene Abrechnung einsehen

---

## 6. Sitzungs- und Sicherheitsregeln

1. **Sitzungsdauer**: Max. 8 Stunden, dann erneute Anmeldung erforderlich
2. **Inaktivitäts-Timeout**: 30 Minuten ohne Aktion → automatische Abmeldung
3. **Fehlanmeldungen**: Nach 5 Fehlversuchen → Konto für 15 Minuten gesperrt
4. **Gleichzeitige Sitzungen**: Max. 3 gleichzeitige Sitzungen pro Benutzer
5. **Passwortänderung**: Alle aktiven Sitzungen werden ungültig
6. **Deaktivierung**: Sofortige Beendigung aller Sitzungen

---

## 7. Audit-Pflichtige Aktionen

Folgende Aktionen werden IMMER protokolliert, unabhängig von der Rolle:

- Anmeldung / Abmeldung
- Fehlversuche bei Anmeldung
- Passwortänderungen
- Rollenänderungen
- Berechtigungsänderungen
- Erstellung / Löschung von Benutzern
- Bearbeitung von Abrechnungen
- Bearbeitung von Zeiterfassungen nach Genehmigung
- Backup / Wiederherstellung
- Export von Personaldaten
