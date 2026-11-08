# 🔒 Sicherheits-Features für Sicherheitsfirmen

Umfassende Sicherheits-Features speziell für Sicherheitsdienstleister entwickelt.

## 📋 Übersicht

Das SMS bietet alle sicherheitsrelevanten Features die eine Sicherheitsfirma benötigt:

| Feature | Beschreibung | Status |
|---------|--------------|--------|
| **Bewachungserlaubnis (§34a)** | Tracking mit Ablaufdaten | ✅ Implementiert |
| **Waffensachkundenachweis** | Status & Ablaufdatum | ✅ Implementiert |
| **Erste-Hilfe-Zertifizierung** | Automatische Erinnerungen | ✅ Implementiert |
| **Schlüsselverwaltung** | Vollständiges Tracking | ✅ Implementiert |
| **Incident-Management** | 11 Typen, 4 Schweregrade | ✅ Implementiert |
| **Notfall-Protokolle** | Alarmpläne & Evakuierung | ✅ Implementiert |
| **Zutrittsberechtigungen** | Granulare Zugriffskontrolle | ✅ Implementiert |
| **Sicherheitsstufen** | 5-stufiges System | ✅ Implementiert |
| **Führungszeugnis** | Prüfung & Dokumentation | ✅ Implementiert |
| **Zuverlässigkeitsprüfung** | §7 GewO konform | ✅ Implementiert |

---

## 👮 Mitarbeiter-Sicherheitsverwaltung

### Bewachungserlaubnis (§34a GewO)

**Erforderlich für alle Wachmitarbeiter in Deutschland**

```
Felder:
- bewachungserlaubnisNr: Lizenznummer
- bewachungserlaubnisExpiry: Ablaufdatum
- Automatische Warnung 90/60/30 Tage vor Ablauf
- Nachweisbar für Behörden
```

**Vorteile:**
- ✅ Rechtssicher (§34a GewO konform)
- ✅ Automatische Erinnerungen
- ✅ Kein abgelaufener Mitarbeiter im Einsatz
- ✅ Behörden-Auskunft in Sekunden

---

### Waffensachkundenachweis

**Für Mitarbeiter mit Waffenerlaubnis**

```
Felder:
- waffensachkunde: Boolean (vorhanden/nicht vorhanden)
- waffensachkundeExpiry: Ablaufdatum
- Automatische Erinnerungen
```

**Vorteile:**
- ✅ Übersicht wer eine Waffenerlaubnis hat
- ✅ Ablaufdatum-Tracking
- ✅ Nur qualifizierte Mitarbeiter im Waffendienst

---

### Erste-Hilfe-Zertifizierung

**Pflicht für alle Mitarbeiter (alle 2 Jahre)**

```
Felder:
- ersteHilfeCertified: Boolean
- ersteHilfeExpiry: Ablaufdatum
- Automatische Erinnerung 60/30 Tage vor Ablauf
- ersteHilfeTrainer: Boolean (für Ausbilder)
```

**Vorteile:**
- ✅ Immer aktuelle Erste-Hilfe-Ausbildung
- ✅ Automatische Erinnerungen
- ✅ Nachweisbar für Berufsgenossenschaft

---

### Führungszeugnis-Prüfung

**Regelmäßige Prüfung erforderlich**

```
Felder:
- fuehrungszeugnisDatum: Datum der letzten Prüfung
- Automatische Erinnerung für Neuprüfung
```

**Vorteile:**
- ✅ Nachweisbar für Behörden
- ✅ Automatische Erinnerungen
- ✅ Rechtssicher

---

### Zuverlässigkeitsprüfung (§7 GewO)

**Gesetzlich erforderlich**

```
Felder:
- zuverlaessigkeetspruefung: Datum der Prüfung
- Vollständig dokumentiert
```

**Vorteile:**
- ✅ §7 GewO konform
- ✅ Nachweisbar
- ✅ Rechtssicher

---

### Sicherheitsunterweisung

**Regelmäßige Unterweisungspflicht**

```
Felder:
- unterweisungDatum: Datum der letzten Unterweisung
- Automatische Erinnerung für Folgeunterweisung
```

**Vorteile:**
- ✅ Immer aktuelle Unterweisung
- ✅ Nachweisbar
- ✅ Arbeitsschutz konform

---

### Sicherheitsstufen (1-5)

**Internes Berechtigungssystem**

```
Stufen:
- Stufe 1: Einfacher Wachdienst
- Stufe 2: Objektbewachung
- Stufe 3: Veranstaltungsschutz
- Stufe 4: Schichtleiter
- Stufe 5: Führungsposition
```

**Vorteile:**
- ✅ Klare Hierarchie
- ✅ Berechtigungs-Steuerung
- ✅ Übersichtlich

---

### Spezial-Qualifikationen

**Zusätzliche Qualifikationen**

```
Felder:
- hundefuehrer: Boolean (Hundeführer-Schein)
- brandschutzbeauftragter: Boolean (Brandschutzhelfer)
- ersteHilfeTrainer: Boolean (Erste-Hilfe-Ausbilder)
```

**Vorteile:**
- ✅ Spezialisten schnell finden
- ✅ Qualifikations-Übersicht
- ✅ Einsatzplanung erleichtert

---

## 🔑 Schlüsselverwaltung

### Vollständiges Schlüssel-Tracking

```
Daten pro Schlüssel:
- keyNumber: Schlüsselnummer
- keyType: Typ (Zylinder, Transponder, etc.)
- description: Beschreibung
- totalCopies: Anzahl Kopien
- assignedTo: Zugewiesen an Mitarbeiter
- assignedDate: Zuweisungsdatum
- returnDate: Rückgabedatum
- status: Status (siehe unten)
- notes: Notizen
```

### Status-Verwaltung

```
Status:
- AVAILABLE: Verfügbar (im Schlüsselkasten)
- ASSIGNED: Zugewiesen (bei Mitarbeiter)
- LOST: Verloren (muss ersetzt werden)
- RETURNED: Zurückgegeben
- DEFECT: Defekt (muss repariert/ersetzt werden)
```

### Objekt-Zuordnung

```
Jeder Schlüssel ist einem Objekt zugeordnet:
- objectId: Welches Objekt
- Ermöglicht Übersicht: "Welche Schlüssel für Objekt X?"
```

**Vorteile:**
- ✅ Kein Schlüssel mehr verloren
- ✅ Vollständiges Tracking
- ✅ Wer hat welchen Schlüssel?
- ✅ Objekt-spezifische Übersicht
- ✅ Status-Übersicht

---

## 🚨 Incident-Management

### 11 Incident-Typen

```
1. THEFT - Diebstahl
2. VANDALISM - Vandalismus
3. TRESPASSING - Hausfriedensbruch
4. ALARM_ACTIVATION - Alarmauslösung
5. MEDICAL_EMERGENCY - Medizinischer Notfall
6. FIRE - Brand
7. ACCIDENT - Unfall
8. THREAT - Bedrohung
9. SUSPICIOUS_ACTIVITY - Verdächtige Aktivität
10. TECHNICAL_FAILURE - Technischer Ausfall
11. OTHER - Sonstiges
```

### 4 Schweregrade

```
- LOW: Niedrig (Dokumentation erforderlich)
- MEDIUM: Mittel (Zeitnahe Reaktion)
- HIGH: Hoch (Sofortige Reaktion)
- CRITICAL: Kritisch (Notfall-Protokoll aktivieren)
```

### Vollständige Dokumentation

```
Incident-Daten:
- title: Titel
- description: Beschreibung
- incidentType: Typ
- severity: Schweregrad
- location: Ort
- occurredAt: Zeitpunkt
- reportedById: Gemeldet von
- resolvedById: Gelöst von
- resolvedAt: Gelöst am
- resolution: Auflösungs-Beschreibung

Polizei-Meldung:
- policeReported: Boolean
- policeCaseNr: Aktenzeichen

Versicherungs-Meldung:
- insuranceReported: Boolean
- insuranceCaseNr: Aktenzeichen

Beweise:
- photos: JSON Array (Foto-URLs)
- witnesses: JSON Array (Zeugen)
```

### Status-Workflow

```
Workflow:
1. OPEN - Incident gemeldet
2. IN_PROGRESS - In Bearbeitung
3. RESOLVED - Gelöst
4. CLOSED - Abgeschlossen

Jeder Wechsel wird im Audit-Log dokumentiert.
```

**Vorteile:**
- ✅ Rechtssichere Dokumentation
- ✅ Versicherungsfälle lückenlos
- ✅ Polizei-Aktenzeichen nachvollziehbar
- ✅ Foto-Dokumentation
- ✅ Zeugen-Erfassung
- ✅ Status-Tracking

---

## 🆘 Notfall-Protokolle

### Protokoll-Typen

```
Beispiel-Typen:
- Brand
- Amok
- Evakuierung
- Medizinischer Notfall
- Technischer Notfall
- Naturkatastrophe
- Terroranschlag
- Custom (anpassbar)
```

### Detaillierte Anleitungen

```
Protokoll-Daten:
- protocolType: Typ
- title: Titel
- description: Beschreibung
- steps: JSON Array (Schritt-für-Schritt)
- emergencyContacts: JSON Array (Notfall-Kontakte)
- evacuationRoutes: JSON Array (Fluchtwege)
- assemblyPoints: JSON Array (Sammelplätze)
```

### Übungs-Management

```
Felder:
- lastDrillDate: Letzte Übung
- nextDrillDate: Nächste Übung
- Automatische Erinnerung für nächste Übung
```

### Objekt-spezifische Protokolle

```
Jedes Objekt kann eigene Protokolle haben:
- objectId: Welches Objekt
- Angepasst auf die Örtlichkeiten
- Fluchtwege spezifisch für Objekt
```

**Vorteile:**
- ✅ Im Notfall sofort handlungsfähig
- ✅ Keine Panik
- ✅ Strukturierte Vorgehensweise
- ✅ Regelmäßige Übungen dokumentiert
- ✅ Objekt-spezifisch

---

## 🚪 Zutrittsberechtigungen

### 4 Berechtigungstypen

```
1. FULL_ACCESS - Voller Zugriff (24/7)
2. LIMITED_HOURS - Nur zu bestimmten Zeiten
3. ESCORTED_ONLY - Nur in Begleitung
4. SPECIFIC_AREAS - Nur bestimmte Bereiche
```

### Zeitliche Beschränkungen

```
JSON-Format:
{
  "weekdays": ["MO", "TU", "WE", "TH", "FR"],
  "timeFrom": "08:00",
  "timeUntil": "18:00"
}
```

### Gültigkeitszeiträume

```
Felder:
- validFrom: Gültig von (Datum)
- validUntil: Gültig bis (Datum)
- Automatische Deaktivierung bei Ablauf
```

### Sperr-Verwaltung

```
Felder:
- isRevoked: Boolean (Gesperrt)
- revokedAt: Gesperrt am
- revokedBy: Gesperrt von
- revocationReason: Grund
- Vollständiger Audit-Trail
```

### Objekt-spezifische Berechtigungen

```
Jede Berechtigung ist objekt-spezifisch:
- employeeId: Mitarbeiter
- objectId: Objekt
- permissionType: Typ
- Ein Mitarbeiter kann verschiedene Berechtigungen für verschiedene Objekte haben
```

**Vorteile:**
- ✅ Maximale Sicherheit
- ✅ Nur autorisierte Personen
- ✅ Zeitliche Kontrolle
- ✅ Sperr-Verwaltung
- ✅ Audit-Trail

---

## 📊 Gesetzliche Anforderungen erfüllt

### §34a GewO (Bewachungsrecht)

```
✅ Bewachungserlaubnis-Tracking
✅ Zuverlässigkeitsprüfung dokumentiert
✅ Führungszeugnis-Prüfung nachweisbar
✅ Unterrichtungsnachweis (IHK) speicherbar
✅ Automatische Erinnerungen bei Ablauf
```

### DSGVO

```
✅ Daten in Deutschland
✅ Tenant-Isolierung
✅ Audit-Log für alle Änderungen
✅ Löschkonzepte umsetzbar
✅ Auskunftsrecht erfüllbar
✅ Verschlüsselte Übertragung
```

### Arbeitsschutz

```
✅ Erste-Hilfe-Zertifizierung mit Ablaufdatum
✅ Sicherheitsunterweisungen dokumentiert
✅ Arbeitszeitbegrenzung (maxHoursPerDay, maxHoursPerWeek)
✅ Ruhezeiten einhaltbar
✅ Gefährdungsbeurteilung möglich
```

### Versicherungen

```
✅ Incident-Dokumentation
✅ Polizei-Meldung mit Aktenzeichen
✅ Versicherungs-Meldung mit Aktenzeichen
✅ Foto-Dokumentation
✅ Zeugen-Erfassung
✅ Lückenlose Historie
```

---

## 💡 Vorteile für Sicherheitsfirmen

### 1. Rechtssicherheit

- ✅ Alle Nachweise dokumentiert
- ✅ Behörden-Auskünfte in Minuten
- ✅ DSGVO-konform
- ✅ Versicherungsfälle lückenlos
- ✅ §34a GewO konform
- ✅ §7 GewO konform

### 2. Effizienz

- ✅ Keine Excel-Listen mehr
- ✅ Automatische Erinnerungen
- ✅ Schnelle Incident-Dokumentation
- ✅ Notfall-Pläne sofort verfügbar
- ✅ Schlüssel-Tracking

### 3. Professionalität

- ✅ Digitales Image
- ✅ Schnelle Reaktion bei Notfällen
- ✅ Übersichtliche Schlüsselverwaltung
- ✅ Granulare Zutrittskontrolle
- ✅ Vollständige Dokumentation

### 4. Skalierbarkeit

- ✅ Funktioniert für 10 MA und 500 MA
- ✅ Multi-Objekt-fähig
- ✅ Cloud-basiert (immer verfügbar)
- ✅ Mobile nutzbar
- ✅ Tenant-isoliert

---

## 🎯 Use Cases

### Use Case 1: Behördliche Prüfung

**Szenario:** Gewerbeamt prüft Bewachungserlaubnisse

**Vorher (ohne SMS):**
```
❌ Excel-Listen durchsuchen
❌ Papier-Akten wälzen
❌ Stundenlange Suche
❌ Unvollständige Nachweise
```

**Nachher (mit SMS):**
```
✅ Mitarbeiter-Liste öffnen
✅ Filter: "Bewachungserlaubnis"
✅ Alle Daten auf einen Blick
✅ Export als PDF für Behörde
✅ Dauer: 2 Minuten
```

### Use Case 2: Schlüssel verloren

**Szenario:** Mitarbeiter meldet verlorenen Schlüssel

**Vorher (ohne SMS):**
```
❌ Unklar welcher Schlüssel
❌ Unklar welches Objekt
❌ Alle Schlösser austauschen (teuer!)
❌ Keine Dokumentation
```

**Nachher (mit SMS):**
```
✅ Schlüssel-Datenbank öffnen
✅ Nach Schlüsselnummer suchen
✅ Status auf "LOST" setzen
✅ Objekt identifizieren
✅ Nur betroffene Schlösser austauschen
✅ Dauer: 5 Minuten
```

### Use Case 3: Incident-Dokumentation

**Szenario:** Einbruch im Objekt

**Vorher (ohne SMS):**
```
❌ Word-Dokument erstellen
❌ Fotos manuell einfügen
❌ Unklare Verantwortlichkeiten
❌ Keine Versionierung
```

**Nachher (mit SMS):**
```
✅ Incident-Formular öffnen
✅ Typ: THEFT, Schwere: HIGH
✅ Fotos hochladen
✅ Zeugen erfassen
✅ Polizei-Aktenzeichen eintragen
✅ Status-Workflow verfolgen
✅ Dauer: 10 Minuten
```

### Use Case 4: Notfall-Übung

**Szenario:** Brand-Übung durchführen

**Vorher (ohne SMS):**
```
❌ Papier-Protokolle
❌ Unklar wer teilnimmt
❌ Keine Dokumentation
❌ Keine Erinnerung an nächste Übung
```

**Nachher (mit SMS):**
```
✅ Notfall-Protokoll öffnen
✅ Teilnehmer-Liste erstellen
✅ Übung durchführen
✅ Ergebnisse dokumentieren
✅ lastDrillDate aktualisieren
✅ nextDrillDate setzen
✅ Automatische Erinnerung
```

---

## 📋 Checklist: Was brauche ich?

### Für neue Mitarbeiter

```
□ Bewachungserlaubnis prüfen (§34a)
□ Führungszeugnis anfordern
□ Zuverlässigkeitsprüfung (§7)
□ Erste-Hilfe-Zertifikat prüfen
□ Sicherheitsunterweisung durchführen
□ Waffensachkunde (falls erforderlich)
□ Sicherheitsstufe zuweisen
□ Zutrittsberechtigungen einrichten
□ Schlüssel zuweisen
```

### Für neue Objekte

```
□ Objekt anlegen
□ Anforderungen definieren
□ Zutrittsberechtigungen einrichten
□ Schlüssel anlegen & zuweisen
□ Notfall-Protokolle erstellen
□ Sicherheitsstufe festlegen
□ Mitarbeiter zuweisen
```

### Regelmäßige Aufgaben

```
□ Ablaufdaten prüfen (monatlich)
□ Erste-Hilfe-Ausbildung erneuern (alle 2 Jahre)
□ Führungszeugnis prüfen (alle 5 Jahre)
□ Notfall-Übungen durchführen (jährlich)
□ Schlüssel-Inventur (vierteljährlich)
□ Sicherheitsunterweisung (jährlich)
```

---

## 🔧 Technische Details

### Datenbank-Schema

```sql
-- Employee Security Fields
bewachungserlaubnisNr VARCHAR(100)
bewachungserlaubnisExpiry DATE
waffensachkunde BOOLEAN
waffensachkundeExpiry DATE
ersteHilfeCertified BOOLEAN
ersteHilfeExpiry DATE
sicherheitsstufe INT (1-5)
fuehrungszeugnisDatum DATE
zuverlaessigkeetspruefung DATE
unterweisungDatum DATE
hundefuehrer BOOLEAN
brandschutzbeauftragter BOOLEAN
ersteHilfeTrainer BOOLEAN

-- Security Keys
security_keys TABLE
- keyNumber, keyType, description
- assignedTo, status
- objectId (FK)

-- Security Incidents
security_incidents TABLE
- incidentType, severity, status
- title, description, location
- policeReported, insuranceReported
- photos, witnesses (JSON)

-- Emergency Protocols
emergency_protocols TABLE
- protocolType, title, description
- steps, emergencyContacts (JSON)
- evacuationRoutes, assemblyPoints (JSON)
- lastDrillDate, nextDrillDate

-- Access Permissions
access_permissions TABLE
- employeeId, objectId (FK)
- permissionType
- validFrom, validUntil
- timeRestrictions (JSON)
- isRevoked, revokedBy, revocationReason
```

### API-Endpunkte

```
GET    /api/v1/employees/:id/security    - Security-Daten eines Mitarbeiters
PUT    /api/v1/employees/:id/security    - Security-Daten aktualisieren
GET    /api/v1/security-keys             - Alle Schlüssel
POST   /api/v1/security-keys             - Schlüssel anlegen
PUT    /api/v1/security-keys/:id         - Schlüssel aktualisieren
GET    /api/v1/incidents                 - Alle Incidents
POST   /api/v1/incidents                 - Incident anlegen
PUT    /api/v1/incidents/:id             - Incident aktualisieren
GET    /api/v1/emergency-protocols       - Alle Protokolle
POST   /api/v1/emergency-protocols       - Protokoll anlegen
GET    /api/v1/access-permissions        - Alle Berechtigungen
POST   /api/v1/access-permissions        - Berechtigung anlegen
```

---

## 📚 Verwandte Dokumentation

- [Admin-Handbuch](ADMIN-HANDBUCH.md)
- [SaaS-Lizenz-System](SAAS-LICENSE-SYSTEM.md)
- [Security](../SECURITY.md)
- [White-Label Branding](WHITE-LABEL.md)

---

**Phase 36: ✅ Vollständig implementiert**

**Alle sicherheitsrelevanten Features für Sicherheitsfirmen sind vorhanden!** 🔒

© 2026 SMS Security Management System
