# Kunden-API Dokumentation

## Übersicht

Die SMS Kunden-API ermöglicht es Kunden, Daten aus dem SMS in ihre eigenen Systeme zu integrieren. Die API ist als **Add-on (€99/Monat)** verfügbar.

## Authentifizierung

Jede Anfrage benötigt einen API-Key im Header:

```bash
X-API-Key: sms_external_abc123def456...
```

## Endpunkte

### API-Key Info

```
GET /api/external/me
```

Gibt Informationen zum API-Key zurück:
- Name
- Typ
- Erstellt am
- Zuletzt verwendet
- Rate Limit Status

**Response:**
```json
{
  "name": "Meine Integration",
  "type": "external",
  "createdAt": "2026-01-01T00:00:00Z",
  "lastUsed": "2026-11-08T12:00:00Z",
  "rateLimit": {
    "limit": 10000,
    "remaining": 9500,
    "resetAt": "2026-11-09T00:00:00Z"
  }
}
```

### Mitarbeiter

#### Liste abrufen

```
GET /api/external/employees
```

**Query Parameter:**
- `status` - Filter nach Status (active, inactive, on_leave)
- `page` - Seite (Standard: 1)
- `limit` - Einträge pro Seite (Standard: 50)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "Max",
      "lastName": "Mustermann",
      "email": "max@example.com",
      "personnelNumber": "MA001",
      "status": "active",
      "employmentType": "FULL_TIME",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

#### Mitarbeiter anlegen

```
POST /api/external/employees
```

**Body:**
```json
{
  "firstName": "Max",
  "lastName": "Mustermann",
  "email": "max@example.com",
  "personnelNumber": "MA001",
  "status": "active",
  "employmentType": "FULL_TIME"
}
```

**Response:**
```json
{
  "id": "uuid",
  "firstName": "Max",
  "lastName": "Mustermann",
  "email": "max@example.com",
  "personnelNumber": "MA001",
  "status": "active",
  "employmentType": "FULL_TIME",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

### Kunden

#### Liste abrufen

```
GET /api/external/customers
```

**Query Parameter:**
- `status` - Filter nach Status (active, inactive, prospect)
- `page` - Seite (Standard: 1)
- `limit` - Einträge pro Seite (Standard: 50)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "companyName": "ABC GmbH",
      "customerNumber": "K001",
      "contactEmail": "info@abc.de",
      "contactPhone": "+49 123 456789",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1
  }
}
```

#### Kunde anlegen

```
POST /api/external/customers
```

**Body:**
```json
{
  "companyName": "ABC GmbH",
  "customerNumber": "K001",
  "contactEmail": "info@abc.de",
  "contactPhone": "+49 123 456789",
  "status": "active"
}
```

### Objekte

#### Liste abrufen

```
GET /api/external/objects
```

**Query Parameter:**
- `customerId` - Filter nach Kunde
- `page` - Seite (Standard: 1)
- `limit` - Einträge pro Seite (Standard: 50)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Objekt Berlin",
      "objectNumber": "O001",
      "customerId": "uuid",
      "address": {
        "street": "Hauptstraße 1",
        "city": "Berlin",
        "zipCode": "10115"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 10,
    "totalPages": 1
  }
}
```

### Einsätze

#### Liste abrufen

```
GET /api/external/deployments
```

**Query Parameter:**
- `dateFrom` - Startdatum (YYYY-MM-DD)
- `dateTo` - Enddatum (YYYY-MM-DD)
- `page` - Seite (Standard: 1)
- `limit` - Einträge pro Seite (Standard: 50)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "date": "2026-11-08",
      "startTime": "08:00",
      "endTime": "16:00",
      "employee": {
        "firstName": "Max",
        "lastName": "Mustermann"
      },
      "object": {
        "name": "Objekt Berlin"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### Zeiterfassung

#### Zeiteintrag anlegen

```
POST /api/external/time-entries
```

**Body:**
```json
{
  "employeeId": "uuid",
  "date": "2026-11-08",
  "startTime": "08:00",
  "endTime": "16:00",
  "hours": 8,
  "type": "REGULAR",
  "notes": "Normale Arbeitszeit"
}
```

**Response:**
```json
{
  "id": "uuid",
  "employeeId": "uuid",
  "date": "2026-11-08",
  "startTime": "08:00",
  "endTime": "16:00",
  "hours": 8,
  "type": "REGULAR",
  "notes": "Normale Arbeitszeit",
  "status": "pending",
  "createdAt": "2026-11-08T12:00:00Z"
}
```

### Webhooks

#### Webhook registrieren

```
POST /api/external/webhooks
```

**Body:**
```json
{
  "url": "https://example.com/webhook",
  "events": ["employee.created", "deployment.created", "timeentry.created"]
}
```

**Verfügbare Events:**
- `employee.created`
- `employee.updated`
- `employee.deleted`
- `customer.created`
- `customer.updated`
- `customer.deleted`
- `deployment.created`
- `deployment.updated`
- `deployment.deleted`
- `timeentry.created`
- `timeentry.updated`

**Response:**
```json
{
  "id": "uuid",
  "url": "https://example.com/webhook",
  "events": ["employee.created", "deployment.created"],
  "isActive": true,
  "createdAt": "2026-11-08T12:00:00Z"
}
```

#### Webhooks auflisten

```
GET /api/external/webhooks
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "url": "https://example.com/webhook",
      "events": ["employee.created"],
      "isActive": true,
      "createdAt": "2026-11-08T12:00:00Z"
    }
  ]
}
```

## Rate Limits

- **10.000 Requests pro Tag**
- Rate Limit Headers werden bei jeder Antwort mitgesendet:
  - `X-RateLimit-Limit`: Maximale Anzahl
  - `X-RateLimit-Remaining`: Verbleibende Anzahl

## Fehlerbehandlung

### HTTP Status Codes

- `200` - Erfolg
- `201` - Erfolgreich erstellt
- `400` - Ungültige Anfrage
- `401` - Fehlender API-Key
- `403` - Ungültiger API-Key
- `429` - Rate Limit erreicht
- `500` - Interner Fehler

### Fehler-Response

```json
{
  "error": "API-Key erforderlich",
  "message": "Bitte senden Sie Ihren API-Key im Header: X-API-Key"
}
```

## Beispiele

### cURL

```bash
# Mitarbeiter auflisten
curl -H "X-API-Key: sms_external_abc123" \
  https://api.sms-platform.com/api/external/employees

# Mitarbeiter anlegen
curl -X POST \
  -H "X-API-Key: sms_external_abc123" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Max","lastName":"Mustermann","email":"max@example.com"}' \
  https://api.sms-platform.com/api/external/employees
```

### JavaScript (Fetch)

```javascript
const API_KEY = 'sms_external_abc123';
const BASE_URL = 'https://api.sms-platform.com/api/external';

// Mitarbeiter auflisten
const response = await fetch(`${BASE_URL}/employees`, {
  headers: { 'X-API-Key': API_KEY }
});
const data = await response.json();
console.log(data);

// Mitarbeiter anlegen
const newEmployee = await fetch(`${BASE_URL}/employees`, {
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max@example.com'
  })
});
```

### Python

```python
import requests

API_KEY = 'sms_external_abc123'
BASE_URL = 'https://api.sms-platform.com/api/external'
headers = {'X-API-Key': API_KEY}

# Mitarbeiter auflisten
response = requests.get(f'{BASE_URL}/employees', headers=headers)
data = response.json()
print(data)

# Mitarbeiter anlegen
new_employee = {
    'firstName': 'Max',
    'lastName': 'Mustermann',
    'email': 'max@example.com'
}
response = requests.post(
    f'{BASE_URL}/employees',
    headers={**headers, 'Content-Type': 'application/json'},
    json=new_employee
)
```

## Preise

- **€99/Monat** oder **€950/Jahr** (20% Rabatt)
- 10.000 Requests pro Tag
- Vollzugriff auf alle Endpunkte
- Webhook-Unterstützung
- Priority Support

## Support

Bei Fragen zur API:
- E-Mail: api-support@sms-platform.com
- Dokumentation: https://docs.sms-platform.com/api
- Status: https://status.sms-platform.com
