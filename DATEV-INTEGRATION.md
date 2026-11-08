# DATEV-Integration für SMS

## Übersicht

Das SMS bietet eine **umfassende DATEV-Integration** für die Lohn- und Gehaltsabrechnung in Deutschland. Die Integration ermöglicht den Export von Mitarbeiter-Stammdaten, Zeiterfassung und Abrechnungsdaten im DATEV-kompatiblen Format.

---

## 🎯 Funktionen

### 1. Mitarbeiter-Stammdaten Export
- Personalnummern
- Adressdaten
- Steuer-IDs
- Sozialversicherungsnummern
- Bankverbindungen (IBAN/BIC)
- Beschäftigungsarten (Vollzeit, Teilzeit, Minijob, Werkstudent)
- Steuerklassen und Freibeträge
- Sozialversicherungsgruppen

### 2. Zeiterfassung Export
- Arbeitsstunden pro Mitarbeiter
- Stundensätze und Beträge
- Lohnarten (Normal, Überstunden, Urlaub, Krankheit, Zuschläge)
- Nacht-, Wochenend- und Feiertagszuschläge

### 3. Zuschläge & Abschläge
- Nachtzuschläge
- Wochenendzuschläge
- Feiertagszuschläge
- Gefahrenzulagen
- Schmutzzulagen

### 4. Datenvalidierung
- Prüft ob alle erforderlichen Felder vorhanden sind
- Zeigt fehlende Daten vor dem Export
- Empfohlene vs. Pflichtfelder

---

## 📊 DATEV-Export Formate

### Mitarbeiter-Stammdaten (CSV)
```csv
Personalnummer;Anrede;Nachname;Vorname;Geburtsdatum;Eintrittsdatum;Austrittsdatum;Straße;PLZ;Ort;Steuer-ID;Sozialversicherungsnr;IBAN;BIC;Beschäftigungsart;Stundenlohn;Monatsgehalt;Steuerklasse;Freibetrag;Kinderfreibeträge;KV-Gruppe;PV-Gruppe;RV-Gruppe;AV-Gruppe
MA001;1;Mustermann;Max;01011990;15032023;;Musterstraße 1;10115;Berlin;12345678901;12345678M001;DE89370400440532013000;COBADEFFXXX;1;15.50;;1;;0;;;
```

### Zeiterfassung (CSV)
```csv
Personalnummer;Datum;Stunden;Stundensatz;Betrag;Lohnart;Bemerkung
MA001;01012024;8.00;15.50;124.00;1;Normale Arbeitszeit
MA001;02012024;2.00;15.50;31.00;2;Überstunden
```

### Zuschläge (CSV)
```csv
Personalnummer;Datum;Betrag;Lohnart;Bezeichnung
MA001;01012024;25.00;101;Nachtzuschlag
MA001;06012024;50.00;103;Feiertagszuschlag
```

---

## 🚀 API-Endpunkte

### 1. DATEV-Export generieren

**POST** `/api/v1/datev/export`

**Body:**
```json
{
  "month": 1,
  "year": 2024
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "period": "01/2024",
      "employeeCount": 15,
      "timeEntryCount": 120,
      "allowanceCount": 8,
      "totalHours": 960.5,
      "totalAmount": 14888.75,
      "totalAllowances": 1250.00
    },
    "files": {
      "employeeMasterData": {
        "filename": "DATEV_Stammdaten_202401.csv",
        "content": "...",
        "recordCount": 15
      },
      "timeData": {
        "filename": "DATEV_Zeiterfassung_202401.csv",
        "content": "...",
        "recordCount": 120
      },
      "allowances": {
        "filename": "DATEV_Zuschlaege_202401.csv",
        "content": "...",
        "recordCount": 8
      }
    }
  }
}
```

### 2. DATEV-Export herunterladen

**GET** `/api/v1/datev/export/:year/:month/download`

**Query Parameters:**
- `format`: `csv` oder `json` (default: `json`)

**Beispiel:**
```
GET /api/v1/datev/export/2024/1/download?format=csv
```

**Response:** CSV-Datei als Download

### 3. Mitarbeiter-Daten validieren

**GET** `/api/v1/datev/validate`

**Response:**
```json
{
  "success": true,
  "validation": {
    "valid": false,
    "errors": [
      {
        "employeeId": "abc123",
        "field": "taxId",
        "message": "Steuer-ID erforderlich für DATEV"
      },
      {
        "employeeId": "def456",
        "field": "bankDetails.iban",
        "message": "IBAN empfohlen für DATEV"
      }
    ]
  }
}
```

### 4. Export-Zusammenfassung anzeigen

**GET** `/api/v1/datev/summary/:year/:month`

**Response:**
```json
{
  "success": true,
  "summary": {
    "period": "01/2024",
    "employeeCount": 15,
    "timeEntryCount": 120,
    "allowanceCount": 8,
    "totalHours": 960.5,
    "totalAmount": 14888.75,
    "totalAllowances": 1250.00,
    "grandTotal": 16138.75
  }
}
```

---

## 📋 Workflow: DATEV-Export

### Schritt 1: Daten validieren

Bevor du einen DATEV-Export erstellst, validiere die Mitarbeiter-Daten:

```bash
curl -X GET http://localhost:5000/api/v1/datev/validate \
  -H "X-License-Key: your-license-key" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Prüfe ob alle erforderlichen Felder vorhanden sind:**
- ✅ Personalnummer
- ✅ Steuer-ID
- ✅ Geburtsdatum
- ✅ Eintrittsdatum
- ✅ Stundenlohn oder Monatsgehalt
- ✅ IBAN (empfohlen)
- ✅ Sozialversicherungsnummer (für SV-pflichtige)

### Schritt 2: Fehlende Daten ergänzen

Falls die Validierung Fehler meldet, ergänze die fehlenden Daten im System:
- Mitarbeiter-Stammdaten aktualisieren
- Bankverbindungen hinzufügen
- Steuer-IDs einpflegen

### Schritt 3: Export-Zusammenfassung ansehen

```bash
curl -X GET http://localhost:5000/api/v1/datev/summary/2024/1 \
  -H "X-License-Key: your-license-key" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Schritt 4: DATEV-Export generieren

```bash
curl -X POST http://localhost:5000/api/v1/datev/export \
  -H "X-License-Key: your-license-key" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "month": 1,
    "year": 2024
  }'
```

### Schritt 5: CSV-Dateien herunterladen

```bash
# Stammdaten herunterladen
curl -X GET "http://localhost:5000/api/v1/datev/export/2024/1/download?format=csv" \
  -H "X-License-Key: your-license-key" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o DATEV_Stammdaten_202401.csv

# Zeiterfassung herunterladen (weitere Dateien ähnlich)
```

### Schritt 6: Import in DATEV

1. Öffne DATEV Lohn & Gehalt
2. Wähle "Import" → "Stammdaten importieren"
3. Wähle die CSV-Datei aus
4. Ordne die Felder zu (meist automatisch erkannt)
5. Importiere die Daten
6. Wiederhole für Zeiterfassung und Zuschläge

---

## 🔧 Beschäftigungsarten (DATEV Codes)

| Code | Beschäftigungsart | Typische Nutzung |
|------|-------------------|------------------|
| 1 | Vollzeit | Vollzeit-Mitarbeiter |
| 2 | Teilzeit | Teilzeit-Mitarbeiter |
| 3 | Geringfügig | Geringfügig Beschäftigte |
| 4 | Minijob | Minijobber (520€) |
| 5 | Werkstudent | Werkstudenten |

---

## 💰 Lohnarten (DATEV Codes)

### Arbeitszeit
| Code | Lohnart | Beschreibung |
|------|---------|--------------|
| 1 | Normaler Lohn | Reguläre Arbeitsstunden |
| 2 | Überstunden | Mehrarbeit |
| 3 | Urlaub | Urlaubsvergütung |
| 4 | Krankheit | Krankengeld |

### Zuschläge
| Code | Lohnart | Beschreibung |
|------|---------|--------------|
| 5 | Nachtzuschlag | Nachtarbeit (20:00-6:00) |
| 6 | Wochenendzuschlag | Samstags/Sonntags |
| 7 | Feiertagszuschlag | Feiertagsarbeit |
| 101 | Nachtzuschlag | Spezifisch |
| 102 | Wochenendzuschlag | Spezifisch |
| 103 | Feiertagszuschlag | Spezifisch |
| 104 | Gefahrenzulage | Gefährliche Arbeit |
| 105 | Schmutzzulage | Schmutzige Arbeit |

---

## ✅ Best Practices

### Vor dem Export

1. **Daten vollständig prüfen**
   - Alle Mitarbeiter haben Steuer-ID
   - Bankverbindungen sind aktuell
   - Sozialversicherungsnummern vorhanden

2. **Zeiterfassung abschließen**
   - Alle Zeiten genehmigt
   - Überstunden korrekt erfasst
   - Zuschläge eingetragen

3. **Zeitraum wählen**
   - Monatliches Export (empfohlen)
   - Oder quartalsweise

### Nach dem Export

1. **CSV-Dateien sicher aufbewahren**
2. **Import in DATEV dokumentieren**
3. **Abgleich mit SMS-Daten**
4. **Lohnabrechnungen erstellen**

---

## 🔒 Compliance & Datenschutz

### DSGVO-Konformität
- ✅ Export nur für autorisierte Benutzer
- ✅ Audit-Logging aller Exporte
- ✅ Daten nur für legitimen Zweck (Lohnabrechnung)
- ✅ CSV-Dateien sicher übertragen

### DATEV-Konformität
- ✅ Standard CSV-Format
- ✅ Korrechte Feldzuordnung
- ✅ Deutsche Steuerregeln
- ✅ Sozialversicherungs-Codes

---

## 🎓 Beispiele

### Beispiel 1: Minijobber abrechnen

**Mitarbeiter-Daten:**
```json
{
  "personalNumber": "MJ001",
  "firstName": "Anna",
  "lastName": "Aushilfe",
  "employmentType": "MINIJOB",
  "hourlyRate": 12.50,
  "steuerIdNr": "12345678901"
}
```

**Zeiterfassung:**
```json
{
  "personalNumber": "MJ001",
  "datum": "01012024",
  "stunden": 8.00,
  "stundensatz": 12.50,
  "betrag": 100.00,
  "lohnart": 1
}
```

**Ergebnis:**
- Brutto: 100.00€
- Pauschalsteuer (2%): 2.00€
- Netto: 98.00€

### Beispiel 2: Aushilfe mit Überstunden

**Mitarbeiter-Daten:**
```json
{
  "personalNumber": "AH001",
  "firstName": "Max",
  "lastName": "Muster",
  "employmentType": "PART_TIME",
  "hourlyRate": 15.00,
  "steuerklasse": 1
}
```

**Zeiterfassung:**
```json
[
  {
    "personalNumber": "AH001",
    "datum": "01012024",
    "stunden": 8.00,
    "stundensatz": 15.00,
    "betrag": 120.00,
    "lohnart": 1
  },
  {
    "personalNumber": "AH001",
    "datum": "02012024",
    "stunden": 2.00,
    "stundensatz": 15.00,
    "betrag": 30.00,
    "lohnart": 2
  }
]
```

**Ergebnis:**
- Normale Stunden: 120.00€
- Überstunden: 30.00€
- Gesamt: 150.00€

---

## 📞 Support

Bei Fragen zur DATEV-Integration:
- API-Dokumentation: `/api-docs`
- DATEV-Support: www.datev.de
- SMS-Support: support@sms-platform.com

---

## ✅ Vorteile der DATEV-Integration

- ✅ **Keine manuelle Dateneingabe** in DATEV
- ✅ **Fehlerreduzierung** durch automatischen Export
- ✅ **Zeitersparnis** bei Lohnabrechnung
- ✅ **Compliance** mit deutschen Steuerregeln
- ✅ **Audit-Trail** für alle Exporte
- ✅ **Flexibel** für verschiedene Beschäftigungsarten
- ✅ **Skalierbar** für kleine und große Unternehmen

---

**Status:** ✅ Production-Ready
